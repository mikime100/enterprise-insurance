const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payer = require('../models/Payer');
const Provider = require('../models/Provider');
const Institution = require('../models/Institution');
const InsuredPerson = require('../models/InsuredPerson');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendBrokerApproval } = require('../services/email');

router.use(requireAuth, requireRole('superadmin'));

// Users management
router.get('/users', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { firstName: new RegExp(req.query.search, 'i') },
        { lastName:  new RegExp(req.query.search, 'i') },
        { email:     new RegExp(req.query.search, 'i') }
      ];
    }
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 15);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    res.json({ users, total });
  } catch (err) { next(err); }
});

router.post('/users', async (req, res, next) => {
  try {
    const exists = await User.findOne({ email: req.body.email?.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ user });
  } catch (err) { next(err); }
});

router.patch('/users/:id/toggle', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ user });
  } catch (err) { next(err); }
});

// ── Broker applications ──────────────────────────────────────────────────────
router.get('/brokers', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { role: 'sales_broker' };
    if (status) filter.brokerStatus = status;
    if (status === 'pending') filter.isEmailVerified = true; // only show brokers who completed email verification
    const brokers = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ brokers });
  } catch (err) { next(err); }
});

router.patch('/brokers/:id/approve', async (req, res, next) => {
  try {
    const broker = await User.findOne({ _id: req.params.id, role: 'sales_broker' });
    if (!broker) return res.status(404).json({ message: 'Broker not found' });
    broker.brokerStatus = 'approved';
    broker.isActive     = true;
    await broker.save();
    try { await sendBrokerApproval(broker.email, broker.firstName, true); } catch (e) { console.error(e.message); }
    res.json({ message: 'Broker approved', broker });
  } catch (err) { next(err); }
});

router.patch('/brokers/:id/reject', async (req, res, next) => {
  try {
    const broker = await User.findOne({ _id: req.params.id, role: 'sales_broker' });
    if (!broker) return res.status(404).json({ message: 'Broker not found' });
    broker.brokerStatus = 'rejected';
    broker.isActive     = false;
    await broker.save();
    try { await sendBrokerApproval(broker.email, broker.firstName, false); } catch (e) { console.error(e.message); }
    res.json({ message: 'Broker rejected', broker });
  } catch (err) { next(err); }
});

// Payers
router.get('/payers', async (req, res, next) => {
  try {
    const payers = await Payer.find().sort({ name: 1 });
    res.json({ payers });
  } catch (err) { next(err); }
});

router.post('/payers', async (req, res, next) => {
  try {
    const payer = new Payer(req.body);
    await payer.save();
    res.status(201).json({ payer });
  } catch (err) { next(err); }
});

router.put('/payers/:id', async (req, res, next) => {
  try {
    const payer = await Payer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!payer) return res.status(404).json({ message: 'Payer not found' });
    res.json({ payer });
  } catch (err) { next(err); }
});

// Providers
router.get('/providers', async (req, res, next) => {
  try {
    const providers = await Provider.find().sort({ name: 1 });
    res.json({ providers });
  } catch (err) { next(err); }
});

router.post('/providers', async (req, res, next) => {
  try {
    const provider = new Provider(req.body);
    await provider.save();
    res.status(201).json({ provider });
  } catch (err) { next(err); }
});

router.put('/providers/:id', async (req, res, next) => {
  try {
    const provider = await Provider.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.json({ provider });
  } catch (err) { next(err); }
});

// Institutions
router.get('/institutions', async (req, res, next) => {
  try {
    const institutions = await Institution.find().sort({ name: 1 });
    res.json({ institutions });
  } catch (err) { next(err); }
});

router.post('/institutions', async (req, res, next) => {
  try {
    const institution = new Institution(req.body);
    await institution.save();
    res.status(201).json({ institution });
  } catch (err) { next(err); }
});

module.exports = router;
