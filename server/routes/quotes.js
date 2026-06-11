const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const PolicyEnrollment = require('../models/PolicyEnrollment');
const InsuredPerson = require('../models/InsuredPerson');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.payerId) filter.payer = req.query.payerId;

    if (req.user.role === 'institution_admin' && req.user.linkedEntity?.entityId) {
      filter.institution = req.user.linkedEntity.entityId;
    } else if (req.user.role === 'insured_person' && req.user.linkedEntity?.entityId) {
      filter.insuredPerson = req.user.linkedEntity.entityId;
    }

    const quotes = await Quote.find(filter)
      .populate('payer', 'name')
      .populate('product', 'name productType')
      .populate('institution', 'name')
      .populate('insuredPerson', 'firstName lastName')
      .populate('assignedUnderwriter', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ quotes });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('payer', 'name')
      .populate('product')
      .populate('institution', 'name contactEmail')
      .populate('insuredPerson', 'firstName lastName email')
      .populate('requestedBy', 'firstName lastName')
      .populate('assignedUnderwriter', 'firstName lastName')
      .populate('scenarios.tier')
      .populate('notes.author', 'firstName lastName role');
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    res.json({ quote });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const quote = new Quote({
      ...req.body,
      requestedBy: req.user._id,
      status: 'submitted',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    await quote.save();

    // Persist nationalId and dateOfBirth from the application onto the InsuredPerson profile
    const appData = req.body.applicationData || {};
    if (req.body.insuredPerson && (appData.nationalId || appData.dateOfBirth)) {
      const updates = {};
      if (appData.nationalId)  updates.nationalId  = appData.nationalId;
      if (appData.dateOfBirth) updates.dateOfBirth = new Date(appData.dateOfBirth);
      await InsuredPerson.findByIdAndUpdate(req.body.insuredPerson, updates).catch(() => {});
    }

    res.status(201).json({ quote });
  } catch (err) { next(err); }
});

// Underwriter takes ownership and adds scenarios/risk assessment
router.patch('/:id/underwrite', requireRole('underwriter', 'payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    quote.assignedUnderwriter = req.user._id;
    quote.status = 'under_review';
    if (req.body.riskFactors) quote.riskFactors = req.body.riskFactors;
    if (req.body.scenarios) quote.scenarios = req.body.scenarios;
    if (req.body.note) quote.notes.push({ author: req.user._id, content: req.body.note });
    await quote.save();
    res.json({ quote });
  } catch (err) { next(err); }
});

// Approve / reject quote
router.patch('/:id/status', requireRole('underwriter', 'payer_admin', 'superadmin'), async (req, res, next) => {
  try {
    const { status, note, finalPremium, validUntil, selectedTierId } = req.body;
    const allowed = ['approved', 'rejected', 'under_review', 'expired'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    quote.status = status;
    if (finalPremium !== undefined) quote.finalPremium = finalPremium;
    if (validUntil) quote.validUntil = new Date(validUntil);
    if (selectedTierId) quote.riskFactors = { ...(quote.riskFactors || {}), selectedTierId };
    if (note) quote.notes.push({ author: req.user._id, content: note });
    await quote.save();
    res.json({ quote });
  } catch (err) { next(err); }
});

// Accept approved quote → create PolicyEnrollment
router.post('/:id/accept', async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id).populate('product');
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    if (quote.status !== 'approved') return res.status(400).json({ message: 'Only approved quotes can be accepted' });

    // Use a safe premium: prefer finalPremium if > 0, then scenario, then product base
    const selectedIdx = req.body.selectedScenario ?? 0;
    const rawPremium = (quote.finalPremium > 0 ? quote.finalPremium : null)
      ?? quote.scenarios[selectedIdx]?.annualPremium
      ?? quote.product?.baseAnnualPremium;

    if (!rawPremium || rawPremium <= 0) {
      return res.status(400).json({ message: 'This quote has no approved premium amount. Please ask the insurer to revise the offer.' });
    }

    quote.status = 'accepted';
    quote.selectedScenario = selectedIdx;
    await quote.save();

    const selectedTier = quote.scenarios[selectedIdx]?.tier;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const enrollment = new PolicyEnrollment({
      quote:          quote._id,
      product:        quote.product._id,
      tier:           selectedTier,
      payer:          quote.payer,
      institution:    quote.institution || undefined,
      // Link the insured person so Coverage page can find this enrollment
      insuredPersons: quote.insuredPerson ? [quote.insuredPerson] : [],
      status:         'pending',
      startDate,
      endDate,
      renewalDate:    endDate,
      premium: { amount: rawPremium, frequency: 'annual' },
    });
    await enrollment.save();
    res.status(201).json({ quote, enrollment });
  } catch (err) { next(err); }
});

module.exports = router;
