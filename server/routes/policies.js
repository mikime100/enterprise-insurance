const express = require('express');
const router = express.Router();
const Policy = require('../models/Policy');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'agent') {
      const customers = await User.find({ assignedAgent: req.user._id }, '_id');
      query.customer = { $in: customers.map(c => c._id) };
    }
    if (req.query.status) query.status = req.query.status;

    const policies = await Policy.find(query)
      .populate('customer', 'firstName lastName email')
      .populate('product', 'name type')
      .populate('agent', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ policies });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const policy = await Policy.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address')
      .populate('product')
      .populate('agent', 'firstName lastName email')
      .populate('quote');
    if (!policy) return res.status(404).json({ message: 'Policy not found' });

    if (req.user.role === 'customer' && policy.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ policy });
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireRole('admin', 'agent'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const policy = await Policy.findByIdAndUpdate(
      req.params.id,
      { status, ...(notes && { notes }) },
      { new: true }
    ).populate('customer', 'firstName lastName').populate('product', 'name type');
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    res.json({ policy });
  } catch (err) { next(err); }
});

// Mock payment
router.post('/:id/payment', async (req, res, next) => {
  try {
    const { amount, method = 'credit_card' } = req.body;
    const policy = await Policy.findById(req.params.id);
    if (!policy) return res.status(404).json({ message: 'Policy not found' });

    if (req.user.role === 'customer' && policy.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const payment = {
      amount: amount || policy.premium.amount,
      method,
      status: 'completed',
      transactionId: `TXN-${Date.now()}`,
      date: new Date(),
    };
    policy.paymentHistory.push(payment);
    await policy.save();
    res.json({ payment, message: 'Payment recorded successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
