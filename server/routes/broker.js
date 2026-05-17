const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const User     = require('../models/User');
const InsuredPerson = require('../models/InsuredPerson');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendBrokerCustomerInvitation } = require('../services/email');

function generateTempPassword() {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

// All broker routes require an approved sales_broker
router.use(requireAuth, requireRole('sales_broker'));

// GET /api/broker/customers — list customers this broker registered
router.get('/customers', async (req, res, next) => {
  try {
    const customers = await User.find({
      role: 'insured_person',
      'linkedEntity.entityType': 'InsuredPerson',
      registeredByBroker: req.user._id,
    }).select('-password').sort({ createdAt: -1 });
    res.json({ customers });
  } catch (err) { next(err); }
});

// POST /api/broker/register-customer — broker creates a customer account
router.post('/register-customer', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, dateOfBirth } = req.body;
    if (!firstName || !lastName || !email)
      return res.status(400).json({ message: 'First name, last name and email are required' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    const tempPassword = generateTempPassword();
    const broker = req.user;

    const insured = await InsuredPerson.create({
      firstName, lastName, email,
      phone: phone || '',
      dateOfBirth: dateOfBirth || null,
      gender: 'other',
      nationalId: '',
      address: { city: '', country: 'Ethiopia' },
    });

    const user = new User({
      firstName, lastName, email,
      password: tempPassword,
      phone, dateOfBirth,
      role: 'insured_person',
      isEmailVerified: true,
      mustChangePassword: true,
      registeredByBroker: broker._id,
      linkedEntity: { entityType: 'InsuredPerson', entityId: insured._id },
    });
    await user.save();

    const brokerName = `${broker.firstName} ${broker.lastName}`;
    try { await sendBrokerCustomerInvitation(email, firstName, tempPassword, brokerName); }
    catch (e) { console.error('Email send failed:', e.message); }

    res.status(201).json({ message: 'Customer account created and invitation sent', user });
  } catch (err) { next(err); }
});

module.exports = router;
