const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const InsuredPerson = require('../models/InsuredPerson');
const { requireAuth, generateToken } = require('../middleware/auth');
const { sendOTPVerification } = require('../services/email');

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateTempPassword() {
  return crypto.randomBytes(6).toString('hex').toUpperCase(); // e.g. A3F9C2B1D7E4
}

// ── Standard web login (session) ────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.isEmailVerified && user.role === 'insured_person' && !user.mustChangePassword) {
      return res.status(403).json({ message: 'Please verify your email before logging in', code: 'EMAIL_NOT_VERIFIED' });
    }

    req.session.userId = user._id;
    res.json({ user, mustChangePassword: user.mustChangePassword });
  } catch (err) { next(err); }
});

// ── Individual self-registration ────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone, dateOfBirth } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: 'First name, last name, email and password are required' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    const otp     = generateOTP();
    const expiry  = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = new User({
      firstName, lastName, email, password, phone, dateOfBirth,
      role: 'insured_person',
      isEmailVerified: false,
      emailVerificationOTP: otp,
      emailVerificationExpiry: expiry,
    });
    await user.save();

    // Create linked InsuredPerson record
    const insured = await InsuredPerson.create({
      firstName, lastName, email,
      phone: phone || '',
      dateOfBirth: dateOfBirth || null,
      gender: 'other',
      nationalId: '',
      address: { city: '', country: 'Ethiopia' },
    });
    user.linkedEntity = { entityType: 'InsuredPerson', entityId: insured._id };
    await user.save();

    try { await sendOTPVerification(email, firstName, otp); } catch (e) { console.error('Email send failed:', e.message); }

    res.status(201).json({ message: 'Account created. Check your email for the verification code.', email });
  } catch (err) { next(err); }
});

// ── Verify email OTP ────────────────────────────────────────────────────────
router.post('/verify-email', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.isEmailVerified) return res.status(400).json({ message: 'Email already verified' });
    if (!user.emailVerificationOTP || user.emailVerificationOTP !== otp)
      return res.status(400).json({ message: 'Invalid verification code' });
    if (user.emailVerificationExpiry < new Date())
      return res.status(400).json({ message: 'Verification code has expired. Request a new one.' });

    user.isEmailVerified       = true;
    user.emailVerificationOTP  = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    req.session.userId = user._id;
    res.json({ message: 'Email verified successfully', user });
  } catch (err) { next(err); }
});

// ── Resend OTP ──────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.isEmailVerified) return res.status(400).json({ message: 'Email already verified' });

    const otp    = generateOTP();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    user.emailVerificationOTP     = otp;
    user.emailVerificationExpiry  = expiry;
    await user.save();

    try { await sendOTPVerification(email, user.firstName, otp); } catch (e) { console.error('Email send failed:', e.message); }
    res.json({ message: 'Verification code resent' });
  } catch (err) { next(err); }
});

// ── Force password change (for OTP/invited accounts) ────────────────────────
router.post('/set-password', requireAuth, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const user = await User.findById(req.user._id);
    user.password          = newPassword;
    user.mustChangePassword = false;
    user.passwordResetToken  = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully', user });
  } catch (err) { next(err); }
});

// ── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// ── Current user ─────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json({ user: req.user, mustChangePassword: req.user.mustChangePassword });
  } catch (err) { next(err); }
});

// ── Mobile JWT login ─────────────────────────────────────────────────────────
router.post('/mobile/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({ token, user, mustChangePassword: user.mustChangePassword });
  } catch (err) { next(err); }
});

// ── Broker application (self-apply) ─────────────────────────────────────────
router.post('/broker-apply', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    const user = new User({
      firstName, lastName, email, password, phone,
      role: 'sales_broker',
      isEmailVerified: true,
      isActive: false,        // inactive until admin approves
      brokerStatus: 'pending',
    });
    await user.save();
    res.status(201).json({ message: 'Application submitted. You will be notified once approved.' });
  } catch (err) { next(err); }
});

module.exports = router;
