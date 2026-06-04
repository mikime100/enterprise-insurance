const express = require('express');
const router  = express.Router();
const InsuranceProduct = require('../models/InsuranceProduct');
const Tier    = require('../models/Tier');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');

// ── Public read: list all active products ────────────────────────────────────
// Optional ?withTiers=true bundles tiers into each product
// Optional ?productType=health|auto etc.
// Unauthenticated callers only see isActive products
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const isAdmin = req.user && ['superadmin', 'payer_admin'].includes(req.user.role);
    const filter  = isAdmin ? {} : { isActive: true };
    if (req.query.productType) filter.productType = req.query.productType;
    if (req.query.payerId)     filter.payer = req.query.payerId;

    const products = await InsuranceProduct.find(filter)
      .populate('payer', 'name')
      .sort({ name: 1 })
      .lean();

    if (req.query.withTiers === 'true') {
      const productIds = products.map(p => p._id);
      const allTiers   = await Tier.find({ product: { $in: productIds } })
        .populate('coverages.coverage', 'name description limits')
        .sort({ annualPremium: 1 })
        .lean();
      const tierMap = {};
      allTiers.forEach(t => {
        const key = t.product.toString();
        if (!tierMap[key]) tierMap[key] = [];
        tierMap[key].push(t);
      });
      products.forEach(p => { p.tiers = tierMap[p._id.toString()] || []; });
    }

    res.json({ products });
  } catch (err) { next(err); }
});

// ── Public read: single product with tiers ───────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const product = await InsuranceProduct.findById(req.params.id).populate('payer', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const tiers = await Tier.find({ product: product._id })
      .populate('coverages.coverage', 'name description limits')
      .sort({ annualPremium: 1 });
    res.json({ product, tiers });
  } catch (err) { next(err); }
});

// ── Protected writes ──────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const product = new InsuranceProduct(req.body);
    await product.save();
    res.status(201).json({ product });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const product = await InsuranceProduct.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) { next(err); }
});

router.patch('/:id/toggle', requireAuth, requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const product = await InsuranceProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.isActive = !product.isActive;
    await product.save();
    res.json({ product });
  } catch (err) { next(err); }
});

module.exports = router;
