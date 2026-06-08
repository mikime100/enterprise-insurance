const express = require('express');
const router = express.Router();
const PolicyEnrollment = require('../models/PolicyEnrollment');
const InsuredPerson = require('../models/InsuredPerson');
const InsuranceProduct = require('../models/InsuranceProduct');
const Tier = require('../models/Tier');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.payerId) filter.payer = req.query.payerId;

    if (req.user.role === 'institution_admin') {
      const instId = req.user.linkedEntity?.entityId || req.user.institutionId;
      // Hard guard: never return all enrollments if institution is unresolvable
      if (!instId) return res.json({ enrollments: [] });
      filter.institution = instId;
    } else if (req.user.role === 'insured_person' && req.user.linkedEntity?.entityId) {
      filter.insuredPersons = req.user.linkedEntity.entityId;
    }

    const enrollments = await PolicyEnrollment.find(filter)
      .populate('product', 'name productType')
      .populate('tier', 'name annualPremium')
      .populate('payer', 'name')
      .populate('institution', 'name')
      .populate('insuredPersons', 'firstName lastName email nationalId dependents')
      .sort({ createdAt: -1 });
    res.json({ enrollments });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const enrollment = await PolicyEnrollment.findById(req.params.id)
      .populate('product')
      .populate({ path: 'tier', populate: { path: 'coverages.coverage' } })
      .populate('payer', 'name contactEmail')
      .populate('institution', 'name contactEmail')
      .populate('insuredPersons', 'firstName lastName email dateOfBirth dependents')
      .populate('coverages')
      .populate('paymentHistory.paidBy', 'firstName lastName');
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    res.json({ enrollment });
  } catch (err) { next(err); }
});

// Download policy certificate PDF
router.get('/:id/policy-document', async (req, res, next) => {
  try {
    const enrollment = await PolicyEnrollment.findById(req.params.id)
      .populate('product', 'name productType')
      .populate({ path: 'tier', populate: { path: 'coverages.coverage' } })
      .populate('payer', 'name')
      .populate('insuredPersons', 'firstName lastName email nationalId phone');

    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    // Auth: only the enrolled person, their payer admins, or superadmin
    const userId = req.user._id.toString();
    const role   = req.user.role;
    const isOwner = enrollment.insuredPersons.some(p => {
      const personUserId = p.user?.toString() || p._id?.toString();
      return personUserId === userId || req.user.linkedEntity?.entityId?.toString() === p._id?.toString();
    });
    if (!isOwner && !['payer_admin','superadmin','finance_officer'].includes(role)) {
      return res.status(403).json({ message: 'Not authorised to access this document' });
    }

    const generatePolicyPdf = require('../utils/generatePolicyPdf');
    const doc = generatePolicyPdf(enrollment);

    const filename = `Policy-${enrollment.enrollmentNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
    doc.end();
  } catch (err) { next(err); }
});

// Activate enrollment (payer_admin after payment confirmed)
router.patch('/:id/status', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const enrollment = await PolicyEnrollment.findByIdAndUpdate(
      req.params.id,
      { status, ...(notes && { notes }) },
      { new: true }
    );
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    res.json({ enrollment });
  } catch (err) { next(err); }
});

// Self-enroll: insured_person picks a product + tier, creates a pending enrollment
router.post('/self', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'insured_person')
      return res.status(403).json({ message: 'Only insured persons can self-enroll' });

    const { productId, tierId } = req.body;
    if (!productId || !tierId)
      return res.status(400).json({ message: 'productId and tierId are required' });

    const [product, tier] = await Promise.all([
      InsuranceProduct.findById(productId),
      Tier.findById(tierId),
    ]);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!tier)    return res.status(404).json({ message: 'Tier not found' });
    if (!product.payer) return res.status(400).json({ message: 'Product has no payer assigned — contact support' });

    const insuredPersonId = req.user.linkedEntity?.entityId;
    if (!insuredPersonId) return res.status(400).json({ message: 'Insured person profile not found' });

    // Block duplicate active/pending enrollment in the same product
    const existing = await PolicyEnrollment.findOne({
      insuredPersons: insuredPersonId,
      product: productId,
      status: { $in: ['active', 'pending'] },
    });
    if (existing) return res.status(400).json({ message: 'You are already enrolled or have a pending enrollment in this product' });

    const startDate = new Date();
    const endDate   = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const enrollment = await PolicyEnrollment.create({
      product:        productId,
      tier:           tierId,
      payer:          product.payer,
      insuredPersons: [insuredPersonId],
      status:         'pending',
      startDate,
      endDate,
      premium: {
        amount:    tier.annualPremium,
        frequency: 'annual',
      },
    });

    res.status(201).json({ enrollment });
  } catch (err) { next(err); }
});

// Add insured persons to a group enrollment
router.post('/:id/members', requireRole('institution_admin', 'payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const { insuredPersonIds } = req.body;
    const enrollment = await PolicyEnrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    const newIds = insuredPersonIds.filter(id => !enrollment.insuredPersons.map(p => p.toString()).includes(id));
    enrollment.insuredPersons.push(...newIds);
    await enrollment.save();
    res.json({ enrollment });
  } catch (err) { next(err); }
});

// Record payment
router.post('/:id/payment', requireRole('institution_admin', 'payer_admin', 'finance_officer', 'superadmin'), async (req, res, next) => {
  try {
    const enrollment = await PolicyEnrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    const payment = {
      amount: req.body.amount || enrollment.premium.amount,
      method: req.body.method || 'bank_transfer',
      status: 'completed',
      paidBy: req.user._id,
      reference: req.body.reference || `REF-${Date.now()}`
    };
    enrollment.paymentHistory.push(payment);
    if (enrollment.status === 'pending') enrollment.status = 'active';
    await enrollment.save();
    res.json({ enrollment });
  } catch (err) { next(err); }
});

// Renew: create a new pending enrollment for the next period
router.post('/:id/renew', async (req, res, next) => {
  try {
    const existing = await PolicyEnrollment.findById(req.params.id)
      .populate('tier', 'annualPremium');
    if (!existing) return res.status(404).json({ message: 'Enrollment not found' });

    // Only the enrolled person (or admin) may renew
    const role      = req.user.role;
    const linkedId  = req.user.linkedEntity?.entityId?.toString();
    const isOwner   = existing.insuredPersons.some(p => p.toString() === linkedId);
    if (!isOwner && !['payer_admin','superadmin','finance_officer'].includes(role)) {
      return res.status(403).json({ message: 'Not authorised to renew this enrollment' });
    }

    if (!['pending_renewal', 'active', 'expired'].includes(existing.status)) {
      return res.status(400).json({ message: `Cannot renew an enrollment with status "${existing.status}"` });
    }

    // Block if a pending/active renewal already exists for this product + persons
    const alreadyRenewing = await PolicyEnrollment.findOne({
      product:        existing.product,
      insuredPersons: { $in: existing.insuredPersons },
      status:         { $in: ['pending', 'active'] },
      _id:            { $ne: existing._id },
    });
    if (alreadyRenewing) {
      return res.status(400).json({ message: 'A renewal or active enrollment already exists for this product' });
    }

    // New period starts the day after current endDate
    const startDate = new Date(existing.endDate);
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const renewal = await PolicyEnrollment.create({
      product:        existing.product,
      tier:           existing.tier,
      payer:          existing.payer,
      institution:    existing.institution,
      insuredPersons: existing.insuredPersons,
      status:         'pending',
      startDate,
      endDate,
      renewalDate:    endDate,
      premium: {
        amount:    existing.tier?.annualPremium || existing.premium.amount,
        frequency: existing.premium.frequency || 'annual',
      },
    });

    res.status(201).json({ enrollment: renewal });
  } catch (err) { next(err); }
});

module.exports = router;
