const express = require('express');
const router = express.Router();
const Tier = require('../models/Tier');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.productId) filter.product = req.query.productId;
    const tiers = await Tier.find(filter)
      .populate('product', 'name productType')
      .populate('coverages.coverage', 'name limits');
    res.json({ tiers });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tier = await Tier.findById(req.params.id)
      .populate('product', 'name productType')
      .populate('coverages.coverage');
    if (!tier) return res.status(404).json({ message: 'Tier not found' });
    res.json({ tier });
  } catch (err) { next(err); }
});

router.post('/', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const tier = new Tier(req.body);
    await tier.save();
    res.status(201).json({ tier });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const tier = await Tier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tier) return res.status(404).json({ message: 'Tier not found' });
    res.json({ tier });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    await Tier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tier deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
