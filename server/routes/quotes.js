const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
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

    const quotes = await Quote.find(query)
      .populate('customer', 'firstName lastName email')
      .populate('product', 'name type')
      .populate('agent', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ quotes });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address dateOfBirth')
      .populate('product')
      .populate('agent', 'firstName lastName email');
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    if (req.user.role === 'customer' && quote.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ quote });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { productId, coverageDetails, frequency, notes, customerId } = req.body;

    const customMonthlyPremiums = {
      monthly: 1,
      quarterly: 0.95,
      'semi-annual': 0.92,
      annual: 0.88,
    };

    const InsuranceProduct = require('../models/InsuranceProduct');
    const product = await InsuranceProduct.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const selectedCoverageTotal = (coverageDetails?.selectedOptions || []).reduce((sum, optionName) => {
      const opt = product.coverageOptions.find(o => o.name === optionName);
      return sum + (opt ? opt.basePrice : 0);
    }, 0);

    const basePremium = product.baseMonthlyPremium + selectedCoverageTotal;
    const multiplier = customMonthlyPremiums[frequency] || 1;
    const calculatedPremium = parseFloat((basePremium * multiplier).toFixed(2));

    const targetCustomer = req.user.role === 'customer' ? req.user._id : customerId;
    const agentId = req.user.role === 'agent' ? req.user._id : undefined;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quote = new Quote({
      customer: targetCustomer,
      product: productId,
      agent: agentId,
      coverageDetails,
      calculatedPremium,
      frequency: frequency || 'monthly',
      validUntil,
      notes,
    });
    await quote.save();

    const populated = await Quote.findById(quote._id)
      .populate('product', 'name type')
      .populate('customer', 'firstName lastName email');
    res.status(201).json({ quote: populated });
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireRole('admin', 'agent'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { status, ...(notes && { notes }) },
      { new: true }
    ).populate('customer', 'firstName lastName').populate('product', 'name');
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    res.json({ quote });
  } catch (err) { next(err); }
});

// Accept quote and create policy (customer action with mock payment)
router.post('/:id/accept', async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id).populate('product');
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    if (req.user.role === 'customer' && quote.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (quote.status !== 'pending' && quote.status !== 'reviewed') {
      return res.status(400).json({ message: 'Quote cannot be accepted in its current state' });
    }

    const { paymentMethod = 'credit_card' } = req.body;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const policy = new Policy({
      customer: quote.customer,
      product: quote.product._id,
      agent: quote.agent,
      quote: quote._id,
      status: 'active',
      coverageDetails: quote.coverageDetails,
      premium: { amount: quote.calculatedPremium, frequency: quote.frequency },
      startDate,
      endDate,
      renewalDate: endDate,
      paymentHistory: [{
        amount: quote.calculatedPremium,
        method: paymentMethod,
        status: 'completed',
        transactionId: `TXN-${Date.now()}`,
      }],
    });
    await policy.save();

    quote.status = 'accepted';
    await quote.save();

    const populated = await Policy.findById(policy._id)
      .populate('product', 'name type')
      .populate('customer', 'firstName lastName');
    res.status(201).json({ policy: populated });
  } catch (err) { next(err); }
});

module.exports = router;
