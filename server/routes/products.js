const express = require('express');
const router = express.Router();
const InsuranceProduct = require('../models/InsuranceProduct');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { isActive: true };
    if (req.query.type) query.type = req.query.type;
    const products = await InsuranceProduct.find(query).sort({ name: 1 });
    res.json({ products });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await InsuranceProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const product = new InsuranceProduct(req.body);
    await product.save();
    res.status(201).json({ product });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const product = await InsuranceProduct.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) { next(err); }
});

router.patch('/:id/toggle', requireRole('admin'), async (req, res, next) => {
  try {
    const product = await InsuranceProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.isActive = !product.isActive;
    await product.save();
    res.json({ product });
  } catch (err) { next(err); }
});

module.exports = router;
