const express = require('express');
const router  = express.Router();
const PolicyAgreement = require('../models/PolicyAgreement');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/policy-agreements/check/:tierId — has this user already agreed?
router.get('/check/:tierId', async (req, res, next) => {
  try {
    const agreement = await PolicyAgreement.findOne({
      user: req.user._id,
      tier: req.params.tierId,
      agreed: true,
    });
    res.json({ agreed: !!agreement, signedAt: agreement?.signedAt });
  } catch (err) { next(err); }
});

// POST /api/policy-agreements — record signed agreement
router.post('/', async (req, res, next) => {
  try {
    const { productId, tierId, signatureData, agreed } = req.body;
    if (!productId || !tierId || !signatureData?.trim() || !agreed) {
      return res.status(400).json({ message: 'productId, tierId, signatureData and agreed=true are required' });
    }
    const agreement = await PolicyAgreement.findOneAndUpdate(
      { user: req.user._id, tier: tierId },
      {
        user: req.user._id,
        product: productId,
        tier: tierId,
        signatureData: signatureData.trim(),
        agreed: true,
        signedAt: new Date(),
        agreementVersion: 'v1.0',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ agreement });
  } catch (err) { next(err); }
});

// GET /api/policy-agreements — list agreements for the logged-in user
router.get('/', async (req, res, next) => {
  try {
    const agreements = await PolicyAgreement.find({ user: req.user._id })
      .populate('product', 'name productType')
      .populate('tier', 'name annualPremium')
      .sort({ signedAt: -1 });
    res.json({ agreements });
  } catch (err) { next(err); }
});

module.exports = router;
