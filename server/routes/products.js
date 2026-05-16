const express = require('express');
const router = express.Router();
const InsuranceProduct = require('../models/InsuranceProduct');
const Tier = require('../models/Tier');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.productType) filter.productType = req.query.productType;
    if (req.query.payerId) filter.payer = req.query.payerId;
    if (!['superadmin', 'payer_admin'].includes(req.user.role)) filter.isActive = true;

    const products = await InsuranceProduct.find(filter)
      .populate('payer', 'name')
      .sort({ name: 1 });
    res.json({ products });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await InsuranceProduct.findById(req.params.id).populate('payer', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const tiers = await Tier.find({ product: product._id }).populate('coverages.coverage');
    res.json({ product, tiers });
  } catch (err) { next(err); }
});

router.post('/', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const product = new InsuranceProduct(req.body);
    await product.save();
    res.status(201).json({ product });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const product = await InsuranceProduct.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) { next(err); }
});

router.patch('/:id/toggle', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const product = await InsuranceProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.isActive = !product.isActive;
    await product.save();
    res.json({ product });
  } catch (err) { next(err); }
});

module.exports = router;
