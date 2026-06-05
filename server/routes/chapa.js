const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const PolicyEnrollment = require('../models/PolicyEnrollment');
const { requireAuth } = require('../middleware/auth');

const CHAPA_BASE = 'https://api.chapa.co/v1';
const getKey = () => process.env.CHAPA_SECRET_KEY || '';

// ── POST /api/chapa/initialize ───────────────────────────────────────────────
// Creates a Chapa transaction for a pending enrollment and returns checkout_url
router.post('/initialize', requireAuth, async (req, res, next) => {
  try {
    const { enrollmentId } = req.body;
    if (!enrollmentId) return res.status(400).json({ message: 'enrollmentId required' });

    const enrollment = await PolicyEnrollment.findById(enrollmentId)
      .populate('product', 'name')
      .populate('tier', 'name annualPremium');
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    if (enrollment.status !== 'pending')
      return res.status(400).json({ message: 'Enrollment is not in pending state' });

    const tx_ref      = `EI_${enrollment._id}_${Date.now()}`;
    const amount      = enrollment.premium.amount;
    const clientUrl   = process.env.CLIENT_URL  || 'http://localhost:5173';
    const serverUrl   = process.env.SERVER_URL  || 'https://enterprise-insurance-api.onrender.com';
    const returnUrl   = `${clientUrl}/insured/coverage?chapa_status=success&tx_ref=${tx_ref}`;
    const callbackUrl = `${serverUrl}/api/chapa/webhook`;

    const chapaRes = await axios.post(
      `${CHAPA_BASE}/transaction/initialize`,
      {
        amount:      amount.toString(),
        currency:    'ETB',
        email:       req.user.email,
        first_name:  req.user.firstName,
        last_name:   req.user.lastName,
        tx_ref,
        return_url:  returnUrl,
        callback_url: callbackUrl,
        customization: {
          title:       'Enterprise Insurance',
          description: `${enrollment.product?.name || 'Insurance'} — ${enrollment.tier?.name || ''} Plan`,
        },
      },
      {
        headers: {
          Authorization:  `Bearer ${getKey()}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Store tx_ref in payment history for later verification
    enrollment.paymentHistory.push({
      amount,
      method:    'mobile_money',
      status:    'pending',
      reference: tx_ref,
      paidBy:    req.user._id,
    });
    await enrollment.save();

    res.json({
      checkout_url: chapaRes.data.data.checkout_url,
      tx_ref,
    });
  } catch (err) {
    if (err.response?.data) {
      return res.status(400).json({
        message: err.response.data.message || 'Chapa initialization failed',
        detail:  err.response.data,
      });
    }
    next(err);
  }
});

// ── GET /api/chapa/verify/:tx_ref ────────────────────────────────────────────
// Called by frontend after Chapa redirects back — activates enrollment on success
router.get('/verify/:tx_ref', requireAuth, async (req, res, next) => {
  try {
    const { tx_ref } = req.params;

    const chapaRes = await axios.get(
      `${CHAPA_BASE}/transaction/verify/${tx_ref}`,
      { headers: { Authorization: `Bearer ${getKey()}` } }
    );

    const data = chapaRes.data.data;
    if (data.status !== 'success') {
      return res.status(400).json({ message: 'Payment not completed', chapaStatus: data.status });
    }

    // Find enrollment via stored tx_ref in paymentHistory
    const enrollment = await PolicyEnrollment.findOne({
      'paymentHistory.reference': tx_ref,
    });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found for this transaction' });

    if (enrollment.status !== 'active') {
      enrollment.status = 'active';
      const record = enrollment.paymentHistory.find(p => p.reference === tx_ref);
      if (record) record.status = 'completed';
      await enrollment.save();
    }

    res.json({ message: 'Payment verified and enrollment activated', enrollmentId: enrollment._id });
  } catch (err) {
    if (err.response?.data) {
      return res.status(400).json({
        message: err.response.data.message || 'Verification failed',
      });
    }
    next(err);
  }
});

// ── POST /api/chapa/webhook ───────────────────────────────────────────────────
// Chapa server-side callback — auto-activates enrollment
router.post('/webhook', async (req, res, next) => {
  try {
    const { tx_ref, status } = req.body;
    if (status === 'success' && tx_ref) {
      const enrollment = await PolicyEnrollment.findOne({ 'paymentHistory.reference': tx_ref });
      if (enrollment && enrollment.status !== 'active') {
        enrollment.status = 'active';
        const record = enrollment.paymentHistory.find(p => p.reference === tx_ref);
        if (record) record.status = 'completed';
        await enrollment.save();
      }
    }
    res.json({ message: 'ok' });
  } catch (err) { next(err); }
});

module.exports = router;
