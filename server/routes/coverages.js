const express = require('express');
const router = express.Router();
const Coverage = require('../models/Coverage');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.productType) filter.productType = req.query.productType;
    if (req.query.payerId) filter.payer = req.query.payerId;
    if (!['superadmin', 'payer_admin'].includes(req.user.role)) filter.isActive = true;

    const coverages = await Coverage.find(filter).populate('payer', 'name');
    res.json({ coverages });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const coverage = await Coverage.findById(req.params.id).populate('payer', 'name');
    if (!coverage) return res.status(404).json({ message: 'Coverage not found' });
    res.json({ coverage });
  } catch (err) { next(err); }
});

router.post('/', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const coverage = new Coverage(req.body);
    await coverage.save();
    res.status(201).json({ coverage });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const coverage = await Coverage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coverage) return res.status(404).json({ message: 'Coverage not found' });
    res.json({ coverage });
  } catch (err) { next(err); }
});

router.patch('/:id/toggle', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const coverage = await Coverage.findById(req.params.id);
    if (!coverage) return res.status(404).json({ message: 'Coverage not found' });
    coverage.isActive = !coverage.isActive;
    await coverage.save();
    res.json({ coverage });
  } catch (err) { next(err); }
});

module.exports = router;
