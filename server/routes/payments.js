const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Claim = require('../models/Claim');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.claimId) filter.claim = req.query.claimId;

    const payments = await Payment.find(filter)
      .populate('claim', 'claimNumber claimedAmount')
      .populate('enrollment', 'enrollmentNumber')
      .populate('initiatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ payments });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('claim')
      .populate('enrollment')
      .populate('initiatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ payment });
  } catch (err) { next(err); }
});

// Initiate a payment (finance_officer, payer_admin)
router.post('/', requireRole('finance_officer', 'payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const payment = new Payment({
      ...req.body,
      initiatedBy: req.user._id,
      status: 'pending'
    });
    await payment.save();

    // If this is a claim settlement, advance claim status
    if (payment.type === 'claim_settlement' && payment.claim) {
      const claim = await Claim.findById(payment.claim);
      if (claim && (claim.status === 'approved' || claim.status === 'partially_approved')) {
        claim.status = 'payment_initiated';
        claim.statusHistory.push({ status: 'payment_initiated', changedBy: req.user._id, reason: 'Payment initiated' });
        await claim.save();
      }
    }
    res.status(201).json({ payment });
  } catch (err) { next(err); }
});

// Process / complete payment (mock — no real gateway)
router.patch('/:id/process', requireRole('finance_officer', 'payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.status = 'completed';
    payment.processedAt = new Date();
    payment.approvedBy = req.user._id;
    payment.reference = payment.reference || `REF-${Date.now()}`;
    await payment.save();

    // Settle the linked claim
    if (payment.type === 'claim_settlement' && payment.claim) {
      const claim = await Claim.findById(payment.claim);
      if (claim && claim.status === 'payment_initiated') {
        claim.status = 'settled';
        claim.settlementAmount = payment.amount;
        claim.statusHistory.push({ status: 'settled', changedBy: req.user._id, reason: 'Payment completed' });
        await claim.save();
      }
    }
    res.json({ payment });
  } catch (err) { next(err); }
});

module.exports = router;
