const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// GET all users (admin)
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ firstName: re }, { lastName: re }, { email: re }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).populate('assignedAgent', 'firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

// GET agents list (admin or agent viewing their peers)
router.get('/agents', requireRole('admin', 'agent'), async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'agent', isActive: true }).select('firstName lastName email phone');
    res.json({ agents });
  } catch (err) { next(err); }
});

// GET customers (admin sees all, agent sees their assigned)
router.get('/customers', requireRole('admin', 'agent'), async (req, res, next) => {
  try {
    const query = { role: 'customer' };
    if (req.user.role === 'agent') query.assignedAgent = req.user._id;
    const { search } = req.query;
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ firstName: re }, { lastName: re }, { email: re }];
    }
    const customers = await User.find(query)
      .populate('assignedAgent', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ customers });
  } catch (err) { next(err); }
});

// GET single user
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('assignedAgent', 'firstName lastName email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.user.role === 'customer' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ user });
  } catch (err) { next(err); }
});

// POST create user (admin)
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { email } = req.body;
    const exists = await User.findOne({ email: email?.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ user });
  } catch (err) { next(err); }
});

// PUT update user profile
router.put('/:id', async (req, res, next) => {
  try {
    const isSelf = req.user._id.toString() === req.params.id;
    if (req.user.role === 'customer' && !isSelf) return res.status(403).json({ message: 'Forbidden' });

    const forbidden = ['password', 'role', 'email'];
    if (req.user.role !== 'admin') forbidden.forEach(f => delete req.body[f]);

    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

// PATCH change password
router.patch('/:id/password', async (req, res, next) => {
  try {
    const isSelf = req.user._id.toString() === req.params.id;
    if (!isSelf && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (isSelf && req.user.role !== 'admin') {
      const match = await user.comparePassword(currentPassword);
      if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
});

// PATCH assign agent to customer (admin)
router.patch('/:id/assign-agent', requireRole('admin'), async (req, res, next) => {
  try {
    const { agentId } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { assignedAgent: agentId || null }, { new: true })
      .populate('assignedAgent', 'firstName lastName');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

// PATCH toggle active (admin)
router.patch('/:id/toggle-active', requireRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
