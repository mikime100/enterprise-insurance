const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    req.session.userId = user._id;
    res.json({ user });
  } catch (err) { next(err); }
});

router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone, dateOfBirth } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = new User({ firstName, lastName, email, password, phone, dateOfBirth, role: 'customer' });
    await user.save();

    req.session.userId = user._id;
    res.status(201).json({ user });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId)
      .populate('assignedAgent', 'firstName lastName email phone');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
