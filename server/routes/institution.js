const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const multer   = require('multer');
const { parse } = require('csv-parse/sync');
const User          = require('../models/User');
const Institution   = require('../models/Institution');
const InsuredPerson = require('../models/InsuredPerson');
const Group         = require('../models/Group');
const PolicyEnrollment = require('../models/PolicyEnrollment');
const Tier          = require('../models/Tier');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendEmployeeInvitation } = require('../services/email');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function generateTempPassword() {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

router.use(requireAuth, requireRole('institution_admin'));

// Resolve institution ID from either linkedEntity (portal-created) or institutionId (seed/legacy)
function getInstId(user) {
  return user.linkedEntity?.entityId || user.institutionId;
}

// ── GET /api/institution/info ────────────────────────────────────────────────
router.get('/info', async (req, res, next) => {
  try {
    const institution = await Institution.findById(getInstId(req.user));
    if (!institution) return res.status(404).json({ message: 'Institution not found' });
    res.json({ institution });
  } catch (err) { next(err); }
});

// ── GET /api/institution/employees ──────────────────────────────────────────
router.get('/employees', async (req, res, next) => {
  try {
    const employees = await User.find({
      role: 'insured_person',
      institutionId: getInstId(req.user),
    }).select('-password').sort({ createdAt: -1 });
    res.json({ employees });
  } catch (err) { next(err); }
});

// ── Helper: invite a single employee ────────────────────────────────────────
async function inviteEmployee({ firstName, lastName, email, phone, tierId, institutionId, institutionName }) {
  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) return { email, status: 'skipped', reason: 'Email already registered' };

  const tempPassword = generateTempPassword();

  const insured = await InsuredPerson.create({
    firstName, lastName, email: email.toLowerCase().trim(),
    phone: phone || '',
    gender: 'other', nationalId: '',
    address: { city: '', country: 'Ethiopia' },
    institution: institutionId,
  });

  const user = new User({
    firstName, lastName,
    email: email.toLowerCase().trim(),
    password: tempPassword,
    phone,
    role: 'insured_person',
    isEmailVerified: true,
    mustChangePassword: true,
    institutionId,
    linkedEntity: { entityType: 'InsuredPerson', entityId: insured._id },
  });
  await user.save();

  // Auto-enroll in selected tier if provided
  if (tierId) {
    const tier = await Tier.findById(tierId).populate('product');
    if (tier) {
      const effectiveDate = new Date();
      const expiryDate    = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      await PolicyEnrollment.create({
        payer:          tier.product?.payer,
        institution:    institutionId,
        product:        tier.product?._id,
        tier:           tier._id,
        insuredPersons: [insured._id],
        status:         'active',
        effectiveDate,
        expiryDate,
        premiumAmount:  tier.monthlyPremium || 0,
      });
    }
  }

  try { await sendEmployeeInvitation(email, firstName, tempPassword, institutionName); }
  catch (e) { console.error('Email send failed:', e.message); }

  return { email, status: 'invited' };
}

// ── POST /api/institution/employees/invite (single) ─────────────────────────
router.post('/employees/invite', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, tierId } = req.body;
    if (!firstName || !lastName || !email)
      return res.status(400).json({ message: 'First name, last name and email are required' });

    const institution = await Institution.findById(getInstId(req.user));
    if (!institution) return res.status(404).json({ message: 'Institution not found' });

    const result = await inviteEmployee({
      firstName, lastName, email, phone, tierId,
      institutionId: institution._id,
      institutionName: institution.name,
    });

    if (result.status === 'skipped')
      return res.status(409).json({ message: result.reason });

    res.status(201).json({ message: 'Employee invited successfully', result });
  } catch (err) { next(err); }
});

// ── POST /api/institution/employees/invite-csv (bulk) ───────────────────────
router.post('/employees/invite-csv', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV or Excel file is required' });

    const institution = await Institution.findById(getInstId(req.user));
    if (!institution) return res.status(404).json({ message: 'Institution not found' });

    const { tierId } = req.body;
    let rows;
    try {
      rows = parse(req.file.buffer.toString('utf8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      return res.status(400).json({ message: 'Could not parse file. Ensure it is a valid CSV.' });
    }

    // Expected columns: firstName, lastName, email, phone (optional)
    const results = [];
    for (const row of rows) {
      const firstName = row.firstName || row.first_name || row['First Name'] || '';
      const lastName  = row.lastName  || row.last_name  || row['Last Name']  || '';
      const email     = row.email     || row.Email      || '';
      const phone     = row.phone     || row.Phone      || '';

      if (!firstName || !lastName || !email) {
        results.push({ email: email || '(missing)', status: 'skipped', reason: 'Missing required fields' });
        continue;
      }
      const r = await inviteEmployee({
        firstName, lastName, email, phone, tierId,
        institutionId: institution._id,
        institutionName: institution.name,
      });
      results.push(r);
    }

    const invited = results.filter(r => r.status === 'invited').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    res.json({ message: `Done: ${invited} invited, ${skipped} skipped`, results });
  } catch (err) { next(err); }
});

// ── GET /api/institution/tiers — tiers available for this institution ────────
router.get('/tiers', async (req, res, next) => {
  try {
    const institution = await Institution.findById(getInstId(req.user));
    if (!institution) return res.status(404).json({ message: 'Institution not found' });
    const tiers = await Tier.find({ isActive: true }).populate('product', 'name productType');
    res.json({ tiers });
  } catch (err) { next(err); }
});

module.exports = router;
