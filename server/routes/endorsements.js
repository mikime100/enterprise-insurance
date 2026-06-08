const express    = require('express');
const router     = express.Router();
const Endorsement      = require('../models/Endorsement');
const PolicyEnrollment = require('../models/PolicyEnrollment');
const InsuredPerson    = require('../models/InsuredPerson');
const Tier             = require('../models/Tier');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// ── GET /api/endorsements ─────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'insured_person') {
      // Only show endorsements for enrollments this person belongs to
      const linkedId = req.user.linkedEntity?.entityId;
      if (!linkedId) return res.json({ endorsements: [] });
      const enrollments = await PolicyEnrollment.find({ insuredPersons: linkedId }).select('_id');
      query.enrollment = { $in: enrollments.map(e => e._id) };
    } else if (['payer_admin', 'underwriter', 'claims_officer', 'customer_support'].includes(req.user.role)) {
      const payerId = req.user.linkedEntity?.entityId;
      if (!payerId) return res.json({ endorsements: [] });
      const enrollments = await PolicyEnrollment.find({ payer: payerId }).select('_id');
      query.enrollment = { $in: enrollments.map(e => e._id) };
      if (req.query.status) query.status = req.query.status;
    }
    // superadmin: no filter

    const endorsements = await Endorsement.find(query)
      .populate('requestedBy', 'firstName lastName email role')
      .populate('reviewedBy',  'firstName lastName')
      .populate({ path: 'enrollment', select: 'enrollmentNumber product tier', populate: [
        { path: 'product', select: 'name' },
        { path: 'tier',    select: 'name' },
      ]})
      .sort({ createdAt: -1 });

    res.json({ endorsements });
  } catch (err) { next(err); }
});

// ── POST /api/endorsements ────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { enrollmentId, type, details, effectiveDate } = req.body;
    if (!enrollmentId || !type || !details)
      return res.status(400).json({ message: 'enrollmentId, type, and details are required' });

    const enrollment = await PolicyEnrollment.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    // Insured may only request changes on their own enrollment
    if (req.user.role === 'insured_person') {
      const linkedId = req.user.linkedEntity?.entityId?.toString();
      const owns = enrollment.insuredPersons.some(p => p.toString() === linkedId);
      if (!owns) return res.status(403).json({ message: 'Not authorised' });
    }

    if (!['active', 'pending_renewal'].includes(enrollment.status))
      return res.status(400).json({ message: `Cannot request changes on an enrollment with status "${enrollment.status}"` });

    const endorsement = await Endorsement.create({
      enrollment:   enrollmentId,
      requestedBy:  req.user._id,
      type,
      details,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
    });

    res.status(201).json({ endorsement });
  } catch (err) { next(err); }
});

// ── PATCH /api/endorsements/:id/review ───────────────────────────────────────
router.patch('/:id/review', requireRole('payer_admin', 'underwriter', 'superadmin'), async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected', 'under_review'].includes(status))
      return res.status(400).json({ message: 'status must be approved, rejected, or under_review' });

    const endorsement = await Endorsement.findById(req.params.id)
      .populate('enrollment');
    if (!endorsement) return res.status(404).json({ message: 'Endorsement not found' });
    if (['approved','rejected'].includes(endorsement.status))
      return res.status(400).json({ message: 'Endorsement already finalised' });

    endorsement.status     = status;
    endorsement.reviewNote = reviewNote || '';
    endorsement.reviewedBy = req.user._id;
    endorsement.reviewedAt = new Date();
    await endorsement.save();

    // Apply change to enrollment / insured person when approved
    if (status === 'approved') {
      const enr = endorsement.enrollment;

      if (endorsement.type === 'tier_change') {
        const tier = await Tier.findById(endorsement.details.requestedTierId);
        if (tier) {
          enr.tier = tier._id;
          enr.premium.amount = tier.annualPremium;
          await enr.save();
        }
      }

      if (endorsement.type === 'add_dependent') {
        const person = await InsuredPerson.findById(enr.insuredPersons[0]);
        if (person) {
          person.dependents.push(endorsement.details.dependent);
          await person.save();
        }
      }

      if (endorsement.type === 'remove_dependent') {
        const person = await InsuredPerson.findById(enr.insuredPersons[0]);
        if (person) {
          person.dependents = person.dependents.filter(
            d => d._id.toString() !== endorsement.details.dependentId
          );
          await person.save();
        }
      }

      if (endorsement.type === 'contact_update') {
        const person = await InsuredPerson.findById(enr.insuredPersons[0]);
        if (person && endorsement.details.field && endorsement.details.newValue) {
          person[endorsement.details.field] = endorsement.details.newValue;
          await person.save();
        }
      }

      if (endorsement.type === 'suspension') {
        enr.status = 'suspended';
        await enr.save();
      }

      if (endorsement.type === 'cancellation') {
        enr.status = 'cancelled';
        await enr.save();
      }
    }

    const populated = await Endorsement.findById(endorsement._id)
      .populate('requestedBy', 'firstName lastName email')
      .populate('reviewedBy',  'firstName lastName')
      .populate({ path: 'enrollment', select: 'enrollmentNumber product tier status', populate: [
        { path: 'product', select: 'name' },
        { path: 'tier',    select: 'name' },
      ]});

    res.json({ endorsement: populated });
  } catch (err) { next(err); }
});

module.exports = router;
