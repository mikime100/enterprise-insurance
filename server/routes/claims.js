const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const PolicyEnrollment = require('../models/PolicyEnrollment');
const InsuredPerson = require('../models/InsuredPerson');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

const STAFF_ROLES = ['payer_admin', 'claims_officer', 'finance_officer', 'underwriter', 'superadmin'];
const CLAIMS_ROLES = ['payer_admin', 'claims_officer', 'superadmin'];

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.submissionType) filter.submissionType = req.query.submissionType;

    if (req.user.role === 'insured_person' && req.user.linkedEntity?.entityId) {
      filter.insuredPerson = req.user.linkedEntity.entityId;
    } else if (req.user.role === 'provider_admin' && req.user.linkedEntity?.entityId) {
      filter.provider = req.user.linkedEntity.entityId;
    } else if (STAFF_ROLES.includes(req.user.role) && req.user.role !== 'superadmin' && req.user.linkedEntity?.entityId) {
      filter.payer = req.user.linkedEntity.entityId;
    } else if (req.user.role === 'institution_admin') {
      const instId = req.user.linkedEntity?.entityId || req.user.institutionId;
      // Hard guard: never return all claims if institution is unresolvable
      if (!instId) return res.json({ claims: [] });
      const persons = await InsuredPerson.find({ institution: instId }, '_id');
      filter.insuredPerson = { $in: persons.map(p => p._id) };
    }

    const claims = await Claim.find(filter)
      .populate('insuredPerson', 'firstName lastName')
      .populate('enrollment', 'enrollmentNumber')
      .populate('provider', 'name type')
      .populate('assignedOfficer', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ claims });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('insuredPerson', 'firstName lastName email phone')
      .populate({ path: 'enrollment', populate: { path: 'product', select: 'name productType' } })
      .populate('provider', 'name type contactEmail')
      .populate('submittedBy', 'firstName lastName role')
      .populate('assignedOfficer', 'firstName lastName')
      .populate('notes.author', 'firstName lastName role')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .populate('financeApproval.approvedBy', 'firstName lastName');

    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    const claimObj = claim.toObject();
    // Insured persons only see external notes
    if (req.user.role === 'insured_person') {
      claimObj.notes = claimObj.notes.filter(n => !n.isInternal);
    }
    res.json({ claim: claimObj });
  } catch (err) { next(err); }
});

// Submit claim — insured (reimbursement) or provider (direct billing)
router.post('/', async (req, res, next) => {
  try {
    let { enrollmentId, insuredPersonId, providerId, submissionType, claimType,
            incidentDate, incidentLocation, policeReportRef, thirdParty,
            description, diagnosis, claimedAmount, priority, services, documents } = req.body;

    // Mobile: auto-resolve enrollment and insuredPerson for insured_person role
    if (req.user.role === 'insured_person' && req.user.linkedEntity?.entityId) {
      if (!insuredPersonId) insuredPersonId = req.user.linkedEntity.entityId;
      if (!enrollmentId) {
        const activeEnrollment = await PolicyEnrollment.findOne({
          insuredPersons: { $elemMatch: { _id: insuredPersonId } },
          status: 'active',
        }).sort({ effectiveDate: -1 });
        if (activeEnrollment) enrollmentId = activeEnrollment._id;
      }
    }

    const enrollment = await PolicyEnrollment.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found — ensure you have an active policy' });
    if (enrollment.status !== 'active') return res.status(400).json({ message: 'Claims can only be filed against active enrollments' });

    const claim = new Claim({
      insuredPerson: insuredPersonId,
      enrollment:    enrollmentId,
      payer:         enrollment.payer,
      provider:      providerId || undefined,
      submittedBy:   req.user._id,
      submissionType: submissionType || 'insured_reimbursement',
      claimType,
      incidentDate:     incidentDate || req.body.dateOfService,
      incidentLocation: incidentLocation || undefined,
      policeReportRef:  policeReportRef  || undefined,
      thirdParty:       thirdParty       || undefined,
      description,
      diagnosis,
      claimedAmount,
      priority:     priority || 'medium',
      services:     services  || [],
      documents:    documents || [],
      statusHistory: [{ status: 'submitted', changedBy: req.user._id }]
    });
    await claim.save();

    const populated = await Claim.findById(claim._id)
      .populate('insuredPerson', 'firstName lastName')
      .populate('enrollment', 'enrollmentNumber');
    res.status(201).json({ claim: populated });
  } catch (err) { next(err); }
});

// Update claim status (claims_officer, payer_admin)
router.patch('/:id/status', requireRole(...CLAIMS_ROLES), async (req, res, next) => {
  try {
    const { status, reason, approvedAmount, settlementAmount, estimatedResolutionDate, resolution } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    if (!claim.canTransitionTo(status)) {
      return res.status(400).json({
        message: `Cannot transition from '${claim.status}' to '${status}'`,
        validNext: Claim.VALID_TRANSITIONS[claim.status]
      });
    }

    claim.status = status;
    claim.statusHistory.push({ status, changedBy: req.user._id, reason });
    if (status === 'documentation_requested' && req.body.documentationRequested?.length) {
      claim.documentationRequested = req.body.documentationRequested;
    }
    if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;
    if (settlementAmount !== undefined) claim.settlementAmount = settlementAmount;
    if (estimatedResolutionDate) claim.estimatedResolutionDate = estimatedResolutionDate;
    if (resolution) claim.resolution = resolution;
    await claim.save();

    res.json({ claim });
  } catch (err) { next(err); }
});

// Finance officer approves/denies payment
router.patch('/:id/finance-approve', requireRole('finance_officer', 'payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const { approved, notes, settlementAmount } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'pending_finance_approval') {
      return res.status(400).json({ message: 'Claim is not awaiting finance approval' });
    }

    const newStatus = approved ? (settlementAmount < claim.claimedAmount ? 'partially_approved' : 'approved') : 'denied';
    claim.status = newStatus;
    claim.financeApproval = { approvedBy: req.user._id, approvedAt: new Date(), notes };
    if (settlementAmount !== undefined) claim.settlementAmount = settlementAmount;
    if (settlementAmount !== undefined) claim.approvedAmount = settlementAmount;
    claim.statusHistory.push({ status: newStatus, changedBy: req.user._id, reason: notes });
    await claim.save();

    res.json({ claim });
  } catch (err) { next(err); }
});

// Add note
router.post('/:id/notes', requireRole(...CLAIMS_ROLES, 'finance_officer'), async (req, res, next) => {
  try {
    const { content, isInternal = false } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    claim.notes.push({ author: req.user._id, content, isInternal });
    await claim.save();
    res.status(201).json({ note: claim.notes[claim.notes.length - 1] });
  } catch (err) { next(err); }
});

// Assign claims officer
router.patch('/:id/assign', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const claim = await Claim.findByIdAndUpdate(
      req.params.id,
      { assignedOfficer: req.body.officerId || null },
      { new: true }
    ).populate('assignedOfficer', 'firstName lastName');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json({ claim });
  } catch (err) { next(err); }
});

router.patch('/:id/priority', requireRole(...CLAIMS_ROLES), async (req, res, next) => {
  try {
    const claim = await Claim.findByIdAndUpdate(req.params.id, { priority: req.body.priority }, { new: true });
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json({ claim });
  } catch (err) { next(err); }
});

// Insured submits additional documents (responds to documentation_requested)
router.post('/:id/add-documents', async (req, res, next) => {
  try {
    const { documents } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    if (req.user.role === 'insured_person') {
      const personId = req.user.linkedEntity?.entityId?.toString();
      if (claim.insuredPerson.toString() !== personId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    if (Array.isArray(documents) && documents.length) {
      claim.documents.push(...documents);
    }

    if (claim.status === 'documentation_requested') {
      claim.status = 'under_review';
      claim.statusHistory.push({
        status: 'under_review',
        changedBy: req.user._id,
        reason: 'Additional documents submitted by insured',
      });
    }

    await claim.save();
    res.json({ claim });
  } catch (err) { next(err); }
});

// Insured submits an appeal against a denied claim
router.post('/:id/appeal', async (req, res, next) => {
  try {
    const { appealNote } = req.body;
    if (!appealNote?.trim()) return res.status(400).json({ message: 'Appeal reason is required' });

    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'denied') return res.status(400).json({ message: 'Only denied claims can be appealed' });
    if (claim.appealStatus === 'submitted') return res.status(400).json({ message: 'Appeal already submitted' });

    claim.appealStatus = 'submitted';
    claim.appealNote   = appealNote;
    claim.notes.push({ author: req.user._id, content: `APPEAL: ${appealNote}`, isInternal: false });
    await claim.save();

    res.json({ claim });
  } catch (err) { next(err); }
});

module.exports = router;
