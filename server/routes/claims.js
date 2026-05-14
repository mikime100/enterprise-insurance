const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
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
    if (req.query.priority) query.priority = req.query.priority;

    const claims = await Claim.find(query)
      .populate('customer', 'firstName lastName email')
      .populate('policy', 'policyNumber')
      .populate('assignedAgent', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ claims });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address')
      .populate({ path: 'policy', populate: { path: 'product', select: 'name type' } })
      .populate('assignedAgent', 'firstName lastName email')
      .populate('notes.author', 'firstName lastName role')
      .populate('statusHistory.changedBy', 'firstName lastName');

    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (req.user.role === 'customer' && claim.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const claimObj = claim.toObject();
    if (req.user.role === 'customer') {
      claimObj.notes = claimObj.notes.filter(n => !n.isInternal);
    }
    res.json({ claim: claimObj });
  } catch (err) { next(err); }
});

// File a new claim (customer)
router.post('/', async (req, res, next) => {
  try {
    const { policyId, type, incidentDate, description, claimedAmount, priority } = req.body;

    const policy = await Policy.findById(policyId);
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    if (policy.status !== 'active') return res.status(400).json({ message: 'Claims can only be filed against active policies' });

    const ownerId = policy.customer.toString();
    const requesterId = req.user._id.toString();
    if (req.user.role === 'customer' && ownerId !== requesterId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const claim = new Claim({
      customer: policy.customer,
      policy: policyId,
      assignedAgent: policy.agent,
      type,
      incidentDate,
      description,
      claimedAmount,
      priority: priority || 'medium',
      statusHistory: [{ status: 'submitted', changedBy: req.user._id }],
    });
    await claim.save();

    const populated = await Claim.findById(claim._id)
      .populate('customer', 'firstName lastName')
      .populate('policy', 'policyNumber');
    res.status(201).json({ claim: populated });
  } catch (err) { next(err); }
});

// Update claim status (agent/admin)
router.patch('/:id/status', requireRole('admin', 'agent'), async (req, res, next) => {
  try {
    const { status, reason, approvedAmount, settlementAmount, estimatedResolutionDate, resolution } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    if (!claim.canTransitionTo(status)) {
      return res.status(400).json({
        message: `Cannot transition from '${claim.status}' to '${status}'`,
        validNext: Claim.VALID_TRANSITIONS[claim.status],
      });
    }

    claim.status = status;
    claim.statusHistory.push({ status, changedBy: req.user._id, reason });
    if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;
    if (settlementAmount !== undefined) claim.settlementAmount = settlementAmount;
    if (estimatedResolutionDate) claim.estimatedResolutionDate = estimatedResolutionDate;
    if (resolution) claim.resolution = resolution;
    await claim.save();

    const populated = await Claim.findById(claim._id)
      .populate('customer', 'firstName lastName')
      .populate('policy', 'policyNumber')
      .populate('assignedAgent', 'firstName lastName');
    res.json({ claim: populated });
  } catch (err) { next(err); }
});

// Add note to a claim
router.post('/:id/notes', requireRole('admin', 'agent'), async (req, res, next) => {
  try {
    const { content, isInternal = false } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    claim.notes.push({ author: req.user._id, content, isInternal });
    await claim.save();

    const note = claim.notes[claim.notes.length - 1];
    res.status(201).json({ note });
  } catch (err) { next(err); }
});

// Assign agent to claim (admin)
router.patch('/:id/assign', requireRole('admin'), async (req, res, next) => {
  try {
    const { agentId } = req.body;
    const claim = await Claim.findByIdAndUpdate(
      req.params.id,
      { assignedAgent: agentId || null },
      { new: true }
    ).populate('assignedAgent', 'firstName lastName');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json({ claim });
  } catch (err) { next(err); }
});

// Update priority (agent/admin)
router.patch('/:id/priority', requireRole('admin', 'agent'), async (req, res, next) => {
  try {
    const { priority } = req.body;
    const claim = await Claim.findByIdAndUpdate(req.params.id, { priority }, { new: true });
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json({ claim });
  } catch (err) { next(err); }
});

module.exports = router;
