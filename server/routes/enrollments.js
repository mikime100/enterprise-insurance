const express = require('express');
const router = express.Router();
const PolicyEnrollment = require('../models/PolicyEnrollment');
const InsuredPerson = require('../models/InsuredPerson');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.payerId) filter.payer = req.query.payerId;

    if (req.user.role === 'institution_admin' && req.user.linkedEntity?.entityId) {
      filter.institution = req.user.linkedEntity.entityId;
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

module.exports = router;
