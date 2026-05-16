const express = require('express');
const router = express.Router();
const Agreement = require('../models/Agreement');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'provider_admin' && req.user.linkedEntity?.entityId) {
      filter.provider = req.user.linkedEntity.entityId;
    }
    if (req.query.payerId) filter.payer = req.query.payerId;
    if (req.query.status) filter.status = req.query.status;

    const agreements = await Agreement.find(filter)
      .populate('payer', 'name')
      .populate('provider', 'name type')
      .populate('coverages', 'name');
    res.json({ agreements });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const agreement = await Agreement.findById(req.params.id)
      .populate('payer', 'name contactEmail')
      .populate('provider', 'name type contactEmail')
      .populate('coverages');
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });
    res.json({ agreement });
  } catch (err) { next(err); }
});

router.post('/', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const agreement = new Agreement(req.body);
    await agreement.save();
    res.status(201).json({ agreement });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const agreement = await Agreement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });
    res.json({ agreement });
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireRole('payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const agreement = await Agreement.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });
    res.json({ agreement });
  } catch (err) { next(err); }
});

module.exports = router;
