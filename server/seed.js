/**
 * Presentation seed script — clears existing data and re-seeds a full demo dataset.
 * Run:  node seed.js
 * Requires MONGODB_URI in .env or a local MongoDB at default port.
 *
 * NOTE: Do NOT pre-hash passwords here. The User pre('save') hook hashes them once.
 * Passing an already-hashed string to User.create() causes double-hashing, which
 * makes every credential fail at login time.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User             = require('./models/User');
const Payer            = require('./models/Payer');
const InsuranceProduct = require('./models/InsuranceProduct');
const Coverage         = require('./models/Coverage');
const Tier             = require('./models/Tier');
const Institution      = require('./models/Institution');
const InsuredPerson    = require('./models/InsuredPerson');
const PolicyEnrollment = require('./models/PolicyEnrollment');
const Claim            = require('./models/Claim');

function daysAgo(n)      { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n)  { const d = new Date(); d.setDate(d.getDate() + n); return d; }

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise_insurance');
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Payer.deleteMany({}),
    InsuranceProduct.deleteMany({}),
    Coverage.deleteMany({}),
    Tier.deleteMany({}),
    Institution.deleteMany({}),
    InsuredPerson.deleteMany({}),
    PolicyEnrollment.deleteMany({}),
    Claim.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── 1. Payer ──────────────────────────────────────────────────────────────────

  const payer = await Payer.create({
    name:          'Awash Insurance Company',
    licenseNumber: 'NBE-INS-2023-0041',
    type:          'composite',
    address:       { street: 'Bole Road, Nefas Silk', city: 'Addis Ababa', country: 'Ethiopia' },
    contactEmail:  'info@awashinsurance.et',
    contactPhone:  '+251 11 663 0000',
  });
  console.log('Created payer:', payer.name);

  // ── 2. Coverages ──────────────────────────────────────────────────────────────

  const coverageDefs = [
    {
      name: 'Inpatient Hospitalization',
      productType: 'health',
      description: 'Covers hospital stays, surgery, and room & board.',
      limits: { annual: 300_000, perClaim: 120_000 },
      deductible: 1_500,
      copaymentPct: 10,
    },
    {
      name: 'Outpatient & Consultation',
      productType: 'health',
      description: 'Covers GP/specialist visits, diagnostics, and minor procedures.',
      limits: { annual: 60_000, perClaim: 8_000 },
      deductible: 300,
      copaymentPct: 20,
    },
    {
      name: 'Dental Care',
      productType: 'health',
      description: 'Covers routine dental check-ups, fillings, extractions, and dentures.',
      limits: { annual: 15_000, perClaim: 5_000 },
      deductible: 500,
      copaymentPct: 20,
    },
    {
      name: 'Optical Care',
      productType: 'health',
      description: 'Covers eye examinations, prescription glasses, and contact lenses.',
      limits: { annual: 10_000, perClaim: 4_000 },
      deductible: 0,
      copaymentPct: 0,
    },
    {
      name: 'Maternity & Newborn',
      productType: 'health',
      description: 'Covers prenatal visits, delivery (normal & C-section), and newborn care.',
      limits: { annual: 80_000, perClaim: 80_000 },
      deductible: 2_000,
      copaymentPct: 10,
    },
    {
      name: 'Pharmacy & Medication',
      productType: 'health',
      description: 'Covers prescribed medications and chronic disease drugs.',
      limits: { annual: 20_000, perClaim: 3_000 },
      deductible: 0,
      copaymentPct: 15,
    },
    {
      name: 'Life & Accidental Death',
      productType: 'life',
      description: 'Lump-sum payout to beneficiaries on death or permanent disability.',
      limits: { lifetime: 1_000_000 },
      deductible: 0,
      copaymentPct: 0,
    },
  ];

  const coverages = await Coverage.insertMany(
    coverageDefs.map(c => ({ ...c, payer: payer._id, isActive: true }))
  );
  const cov = {};
  coverages.forEach(c => { cov[c.name] = c; });
  console.log('Created', coverages.length, 'coverages');

  // ── 3. Products ───────────────────────────────────────────────────────────────

  const healthProduct = await InsuranceProduct.create({
    name:               'Group Health Insurance',
    payer:              payer._id,
    productType:        'health',
    description:        'Comprehensive group medical coverage for corporate employees and their families.',
    targetMarkets:      ['Corporate', 'Government'],
    baseAnnualPremium:  8_400,
    waitingPeriodMonths: 1,
    features: [
      'Cashless hospitalisation at 150+ network hospitals',
      'Annual health check-up included',
      'Family floater option up to 4 dependents',
      'Emergency evacuation coverage',
      '24/7 nurse helpline',
    ],
    availableForIndividual: false,
    isActive: true,
  });

  const individualProduct = await InsuranceProduct.create({
    name:               'Individual Health Plus',
    payer:              payer._id,
    productType:        'health',
    description:        'Flexible individual health plan with inpatient, outpatient, dental, and optical benefits.',
    targetMarkets:      ['Individual', 'SME'],
    baseAnnualPremium:  5_000,
    waitingPeriodMonths: 2,
    features: [
      'Choose your own coverage tiers',
      'Dental and optical included from Standard tier',
      'Maternity benefit from Premium tier',
      'Online claims submission',
      'No age loading up to 55',
    ],
    availableForIndividual: true,
    isActive: true,
  });

  const lifeProduct = await InsuranceProduct.create({
    name:               'Term Life & Disability',
    payer:              payer._id,
    productType:        'life',
    description:        'Pure term life insurance with accidental death and permanent disability rider.',
    targetMarkets:      ['Corporate', 'Individual'],
    baseAnnualPremium:  3_600,
    waitingPeriodMonths: 0,
    features: [
      'Death benefit: ETB 500,000 – 2,000,000',
      'Permanent disability payout',
      'Accidental death double indemnity',
      'Premium waiver on disability',
      'Beneficiary nomination',
    ],
    availableForIndividual: true,
    isActive: true,
  });

  console.log('Created 3 insurance products');

  // ── 4. Tiers ──────────────────────────────────────────────────────────────────

  const ghBasic = await Tier.create({
    name: 'Basic', product: healthProduct._id, annualPremium: 8_400,
    employerSharePct: 100, maxDependents: 2,
    description: 'Essential inpatient and outpatient cover for employees.',
    coverages: [
      { coverage: cov['Inpatient Hospitalization']._id, customLimit: 150_000 },
      { coverage: cov['Outpatient & Consultation']._id,  customLimit: 30_000  },
      { coverage: cov['Pharmacy & Medication']._id,      customLimit: 10_000  },
    ],
  });

  const ghStandard = await Tier.create({
    name: 'Standard', product: healthProduct._id, annualPremium: 14_400,
    employerSharePct: 80, maxDependents: 3,
    description: 'Adds dental and optical to core health benefits.',
    coverages: [
      { coverage: cov['Inpatient Hospitalization']._id, customLimit: 200_000 },
      { coverage: cov['Outpatient & Consultation']._id,  customLimit: 50_000  },
      { coverage: cov['Dental Care']._id,                customLimit: 12_000  },
      { coverage: cov['Optical Care']._id,               customLimit: 8_000   },
      { coverage: cov['Pharmacy & Medication']._id,      customLimit: 15_000  },
    ],
  });

  const ghPremium = await Tier.create({
    name: 'Premium', product: healthProduct._id, annualPremium: 21_600,
    employerSharePct: 70, maxDependents: 4,
    description: 'Full cover including maternity and enhanced limits.',
    coverages: [
      { coverage: cov['Inpatient Hospitalization']._id },
      { coverage: cov['Outpatient & Consultation']._id },
      { coverage: cov['Dental Care']._id },
      { coverage: cov['Optical Care']._id },
      { coverage: cov['Maternity & Newborn']._id },
      { coverage: cov['Pharmacy & Medication']._id },
    ],
  });

  const ghExecutive = await Tier.create({
    name: 'Executive', product: healthProduct._id, annualPremium: 36_000,
    employerSharePct: 60, maxDependents: 4,
    description: 'Top-tier plan with maximum limits and life benefit.',
    coverages: [
      { coverage: cov['Inpatient Hospitalization']._id, customLimit: 300_000 },
      { coverage: cov['Outpatient & Consultation']._id,  customLimit: 60_000  },
      { coverage: cov['Dental Care']._id,                customLimit: 15_000  },
      { coverage: cov['Optical Care']._id,               customLimit: 10_000  },
      { coverage: cov['Maternity & Newborn']._id },
      { coverage: cov['Pharmacy & Medication']._id,      customLimit: 20_000  },
      { coverage: cov['Life & Accidental Death']._id },
    ],
  });

  const ihBasic = await Tier.create({
    name: 'Basic', product: individualProduct._id, annualPremium: 5_000,
    employerSharePct: 0, maxDependents: 0,
    description: 'Basic inpatient-only plan for individuals.',
    coverages: [
      { coverage: cov['Inpatient Hospitalization']._id, customLimit: 100_000 },
      { coverage: cov['Pharmacy & Medication']._id,      customLimit: 8_000   },
    ],
  });

  const ihStandard = await Tier.create({
    name: 'Standard', product: individualProduct._id, annualPremium: 8_500,
    employerSharePct: 0, maxDependents: 2,
    description: 'Adds outpatient, dental, and optical.',
    coverages: [
      { coverage: cov['Inpatient Hospitalization']._id, customLimit: 150_000 },
      { coverage: cov['Outpatient & Consultation']._id,  customLimit: 40_000  },
      { coverage: cov['Dental Care']._id },
      { coverage: cov['Optical Care']._id },
      { coverage: cov['Pharmacy & Medication']._id },
    ],
  });

  const ihPremium = await Tier.create({
    name: 'Premium', product: individualProduct._id, annualPremium: 14_000,
    employerSharePct: 0, maxDependents: 4,
    description: 'Complete individual cover with maternity.',
    coverages: [
      { coverage: cov['Inpatient Hospitalization']._id },
      { coverage: cov['Outpatient & Consultation']._id },
      { coverage: cov['Dental Care']._id },
      { coverage: cov['Optical Care']._id },
      { coverage: cov['Maternity & Newborn']._id },
      { coverage: cov['Pharmacy & Medication']._id },
    ],
  });

  console.log('Created 7 tiers');

  // ── 5. System users ───────────────────────────────────────────────────────────
  // Plain text passwords — User pre('save') hook hashes them once

  const superadmin = await User.create({
    firstName: 'System', lastName: 'Administrator',
    email: 'admin@enterprise-insurance.et',
    password: 'Admin@2024', role: 'superadmin',
    phone: '+251 11 123 4567', isActive: true, isEmailVerified: true,
  });

  const claimsOfficer = await User.create({
    firstName: 'Hana', lastName: 'Girma',
    email: 'hana.girma@enterprise-insurance.et',
    password: 'Admin@2024', role: 'claims_officer',
    phone: '+251 91 234 5678', isActive: true, isEmailVerified: true,
  });

  const financeOfficer = await User.create({
    firstName: 'Robel', lastName: 'Tesfaye',
    email: 'robel.tesfaye@enterprise-insurance.et',
    password: 'Admin@2024', role: 'finance_officer',
    phone: '+251 91 345 6789', isActive: true, isEmailVerified: true,
  });

  console.log('Created system users (superadmin, claims_officer, finance_officer)');

  // ── 6. Broker ─────────────────────────────────────────────────────────────────

  const broker = await User.create({
    firstName: 'Dawit', lastName: 'Bekele',
    email: 'dawit.bekele@enterprise-insurance.et',
    password: 'Broker@2024', role: 'sales_broker',
    phone: '+251 91 456 7890', isActive: true, isEmailVerified: true,
    brokerStatus: 'approved',
  });
  console.log('Created broker:', broker.email);

  // ── 7. Institutions + HR admins ───────────────────────────────────────────────

  // Helper: create an institution and its HR admin user
  async function createInstitution({ name, type, regNumber, street, email, phone, hrFirst, hrLast, hrEmail, hrPhone, hrPassword }) {
    const inst = await Institution.create({
      name,
      type,
      registrationNumber: regNumber,
      address: { street, city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: email,
      contactPhone: phone,
      assignedBroker: broker._id,
    });
    const hr = await User.create({
      firstName: hrFirst, lastName: hrLast,
      email: hrEmail,
      password: hrPassword,
      role: 'institution_admin',
      phone: hrPhone, isActive: true, isEmailVerified: true,
      institutionId: inst._id,
    });
    return { inst, hr };
  }

  const { inst: ethioTelecom, hr: hrEthioTelecom } = await createInstitution({
    name: 'Ethio Telecom S.C.',
    type: 'corporate',
    regNumber: 'ET-CORP-2003-00001',
    street: 'Churchill Avenue',
    email: 'hr@ethiotelecom.et',
    phone: '+251 11 515 1515',
    hrFirst: 'Solomon', hrLast: 'Haile',
    hrEmail: 'solomon.haile@ethiotelecom.et',
    hrPhone: '+251 91 567 8901',
    hrPassword: 'HR@EthioTelecom2024',
  });

  const { inst: cbe, hr: hrCBE } = await createInstitution({
    name: 'Commercial Bank of Ethiopia',
    type: 'government',
    regNumber: 'ET-GOV-1963-00042',
    street: 'Gambia Street, Meskel Square',
    email: 'hr@cbe.com.et',
    phone: '+251 11 551 5000',
    hrFirst: 'Meseret', hrLast: 'Alemu',
    hrEmail: 'meseret.alemu@cbe.com.et',
    hrPhone: '+251 91 620 1234',
    hrPassword: 'HR@CBE2024',
  });

  const { inst: etAir, hr: hrEtAir } = await createInstitution({
    name: 'Ethiopian Airlines Group',
    type: 'corporate',
    regNumber: 'ET-CORP-1945-00001',
    street: 'Bole International Airport',
    email: 'hr@ethiopianairlines.com',
    phone: '+251 11 665 0000',
    hrFirst: 'Habtamu', hrLast: 'Abebe',
    hrEmail: 'habtamu.abebe@ethiopianairlines.com',
    hrPhone: '+251 91 710 5678',
    hrPassword: 'HR@EtAir2024',
  });

  const { inst: aau, hr: hrAAU } = await createInstitution({
    name: 'Addis Ababa University',
    type: 'government',
    regNumber: 'ET-GOV-1950-00003',
    street: 'Sidist Kilo Campus, Arada',
    email: 'hr@aau.edu.et',
    phone: '+251 11 123 9000',
    hrFirst: 'Belay', hrLast: 'Tadesse',
    hrEmail: 'belay.tadesse@aau.edu.et',
    hrPhone: '+251 91 830 9012',
    hrPassword: 'HR@AAU2024',
  });

  console.log('Created 4 institutions with HR admins');

  // ── 8. Ethio Telecom employees + enrollments ──────────────────────────────────

  const empDefs = [
    { firstName: 'Biruk',    lastName: 'Tadesse',     email: 'biruk.tadesse@ethiotelecom.et',     phone: '+251 91 111 2233', gender: 'male',   tier: ghPremium,   dob: '1988-04-15', active: true  },
    { firstName: 'Tigist',   lastName: 'Alemu',       email: 'tigist.alemu@ethiotelecom.et',       phone: '+251 91 222 3344', gender: 'female', tier: ghStandard,  dob: '1991-07-22', active: true  },
    { firstName: 'Mekonnen', lastName: 'Abebe',       email: 'mekonnen.abebe@ethiotelecom.et',     phone: '+251 91 333 4455', gender: 'male',   tier: ghStandard,  dob: '1985-12-01', active: true  },
    { firstName: 'Hiwot',    lastName: 'Woldemariam', email: 'hiwot.wolde@ethiotelecom.et',        phone: '+251 91 444 5566', gender: 'female', tier: ghExecutive, dob: '1979-03-10', active: true  },
    { firstName: 'Yohannes', lastName: 'Kassa',       email: 'yohannes.kassa@ethiotelecom.et',     phone: '+251 91 555 6677', gender: 'male',   tier: ghBasic,     dob: '1995-09-28', active: true  },
    { firstName: 'Meron',    lastName: 'Getachew',    email: 'meron.getachew@ethiotelecom.et',     phone: '+251 91 666 7788', gender: 'female', tier: ghBasic,     dob: '1998-01-14', active: false },
  ];

  const empUsers = [];
  for (const emp of empDefs) {
    const user = await User.create({
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      password: emp.active ? 'Employee@2024' : 'TempPass@123',
      role: 'insured_person',
      mustChangePassword: !emp.active,
      institutionId: ethioTelecom._id,
      isActive: true, isEmailVerified: true,
    });
    const ip = await InsuredPerson.create({
      user: user._id,
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      dateOfBirth: new Date(emp.dob),
      gender: emp.gender,
      institution: ethioTelecom._id,
      isActive: true,
    });
    await User.findByIdAndUpdate(user._id, {
      linkedEntity: { entityType: 'InsuredPerson', entityId: ip._id },
    });
    empUsers.push({ user, ip, emp });
  }
  console.log('Created', empUsers.length, 'Ethio Telecom employees');

  // ── 9. CBE employees ──────────────────────────────────────────────────────────

  const cbeDefs = [
    { firstName: 'Liya',     lastName: 'Fekadu',  email: 'liya.fekadu@cbe.com.et',    phone: '+251 91 811 1111', gender: 'female', tier: ghStandard, dob: '1992-03-18', active: true  },
    { firstName: 'Ermias',   lastName: 'Teshome', email: 'ermias.teshome@cbe.com.et', phone: '+251 91 811 2222', gender: 'male',   tier: ghBasic,    dob: '1986-11-05', active: true  },
    { firstName: 'Azeb',     lastName: 'Hailu',   email: 'azeb.hailu@cbe.com.et',     phone: '+251 91 811 3333', gender: 'female', tier: ghPremium,  dob: '1980-07-30', active: false },
  ];

  for (const emp of cbeDefs) {
    const user = await User.create({
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      password: emp.active ? 'Employee@2024' : 'TempPass@123',
      role: 'insured_person',
      mustChangePassword: !emp.active,
      institutionId: cbe._id,
      isActive: true, isEmailVerified: true,
    });
    const ip = await InsuredPerson.create({
      user: user._id,
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      dateOfBirth: new Date(emp.dob),
      gender: emp.gender,
      institution: cbe._id,
      isActive: true,
    });
    await User.findByIdAndUpdate(user._id, {
      linkedEntity: { entityType: 'InsuredPerson', entityId: ip._id },
    });
    if (emp.active) {
      const start = daysAgo(60); const end = daysFromNow(305);
      await PolicyEnrollment.create({
        product: healthProduct._id, tier: emp.tier._id, payer: payer._id,
        institution: cbe._id, insuredPersons: [ip._id],
        coverages: emp.tier.coverages.map(c => c.coverage),
        status: 'active', startDate: start, endDate: end, renewalDate: end,
        premium: {
          amount: emp.tier.annualPremium, frequency: 'annual',
          employerShare: Math.round(emp.tier.annualPremium * emp.tier.employerSharePct / 100),
          employeeShare: Math.round(emp.tier.annualPremium * (100 - emp.tier.employerSharePct) / 100),
        },
        paymentHistory: [{ amount: emp.tier.annualPremium, method: 'bank_transfer', status: 'completed', paidBy: hrCBE._id, reference: `CBE-PAY-${Date.now().toString().slice(-6)}` }],
      });
    }
  }
  console.log('Created', cbeDefs.length, 'CBE employees');

  // ── 10. Ethiopian Airlines employees ─────────────────────────────────────────

  const etAirDefs = [
    { firstName: 'Natnael',  lastName: 'Girma',   email: 'natnael.girma@ethiopianairlines.com',   phone: '+251 91 922 1111', gender: 'male',   tier: ghExecutive, dob: '1984-01-20', active: true  },
    { firstName: 'Saron',    lastName: 'Bekele',  email: 'saron.bekele@ethiopianairlines.com',     phone: '+251 91 922 2222', gender: 'female', tier: ghPremium,   dob: '1990-09-14', active: true  },
    { firstName: 'Dawit',    lastName: 'Mulugeta',email: 'dawit.mulugeta@ethiopianairlines.com',   phone: '+251 91 922 3333', gender: 'male',   tier: ghStandard,  dob: '1978-06-08', active: false },
  ];

  for (const emp of etAirDefs) {
    const user = await User.create({
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      password: emp.active ? 'Employee@2024' : 'TempPass@123',
      role: 'insured_person',
      mustChangePassword: !emp.active,
      institutionId: etAir._id,
      isActive: true, isEmailVerified: true,
    });
    const ip = await InsuredPerson.create({
      user: user._id,
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      dateOfBirth: new Date(emp.dob),
      gender: emp.gender,
      institution: etAir._id,
      isActive: true,
    });
    await User.findByIdAndUpdate(user._id, {
      linkedEntity: { entityType: 'InsuredPerson', entityId: ip._id },
    });
    if (emp.active) {
      const start = daysAgo(30); const end = daysFromNow(335);
      await PolicyEnrollment.create({
        product: healthProduct._id, tier: emp.tier._id, payer: payer._id,
        institution: etAir._id, insuredPersons: [ip._id],
        coverages: emp.tier.coverages.map(c => c.coverage),
        status: 'active', startDate: start, endDate: end, renewalDate: end,
        premium: {
          amount: emp.tier.annualPremium, frequency: 'annual',
          employerShare: Math.round(emp.tier.annualPremium * emp.tier.employerSharePct / 100),
          employeeShare: Math.round(emp.tier.annualPremium * (100 - emp.tier.employerSharePct) / 100),
        },
        paymentHistory: [{ amount: emp.tier.annualPremium, method: 'bank_transfer', status: 'completed', paidBy: hrEtAir._id, reference: `ETAIR-PAY-${Date.now().toString().slice(-6)}` }],
      });
    }
  }
  console.log('Created', etAirDefs.length, 'Ethiopian Airlines employees');

  // ── 11. AAU employees ─────────────────────────────────────────────────────────

  const aauDefs = [
    { firstName: 'Selam',    lastName: 'Worku',   email: 'selam.worku@aau.edu.et',    phone: '+251 91 830 1111', gender: 'female', tier: ghBasic,    dob: '1987-05-12', active: true  },
    { firstName: 'Tewodros', lastName: 'Bekele',  email: 'tewodros.bekele@aau.edu.et',phone: '+251 91 830 2222', gender: 'male',   tier: ghStandard, dob: '1982-10-03', active: true  },
    { firstName: 'Rahel',    lastName: 'Mekonnen',email: 'rahel.mekonnen@aau.edu.et', phone: '+251 91 830 3333', gender: 'female', tier: ghBasic,    dob: '1994-08-25', active: false },
  ];

  for (const emp of aauDefs) {
    const user = await User.create({
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      password: emp.active ? 'Employee@2024' : 'TempPass@123',
      role: 'insured_person',
      mustChangePassword: !emp.active,
      institutionId: aau._id,
      isActive: true, isEmailVerified: true,
    });
    const ip = await InsuredPerson.create({
      user: user._id,
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      dateOfBirth: new Date(emp.dob),
      gender: emp.gender,
      institution: aau._id,
      isActive: true,
    });
    await User.findByIdAndUpdate(user._id, {
      linkedEntity: { entityType: 'InsuredPerson', entityId: ip._id },
    });
    if (emp.active) {
      const start = daysAgo(120); const end = daysFromNow(245);
      await PolicyEnrollment.create({
        product: healthProduct._id, tier: emp.tier._id, payer: payer._id,
        institution: aau._id, insuredPersons: [ip._id],
        coverages: emp.tier.coverages.map(c => c.coverage),
        status: 'active', startDate: start, endDate: end, renewalDate: end,
        premium: {
          amount: emp.tier.annualPremium, frequency: 'annual',
          employerShare: Math.round(emp.tier.annualPremium * emp.tier.employerSharePct / 100),
          employeeShare: Math.round(emp.tier.annualPremium * (100 - emp.tier.employerSharePct) / 100),
        },
        paymentHistory: [{ amount: emp.tier.annualPremium, method: 'bank_transfer', status: 'completed', paidBy: hrAAU._id, reference: `AAU-PAY-${Date.now().toString().slice(-6)}` }],
      });
    }
  }
  console.log('Created', aauDefs.length, 'AAU employees');

  // ── 12. Ethio Telecom enrollments + claims ────────────────────────────────────

  const enrollments = [];
  for (const { user, ip, emp } of empUsers) {
    if (!emp.active) continue;
    const start = daysAgo(90);
    const end   = daysFromNow(275);
    const enr = await PolicyEnrollment.create({
      product: healthProduct._id,
      tier:    emp.tier._id,
      payer:   payer._id,
      institution: ethioTelecom._id,
      insuredPersons: [ip._id],
      coverages: emp.tier.coverages.map(c => c.coverage),
      status:    'active',
      startDate: start,
      endDate:   end,
      renewalDate: end,
      premium: {
        amount:        emp.tier.annualPremium,
        frequency:     'annual',
        employerShare: Math.round(emp.tier.annualPremium * emp.tier.employerSharePct / 100),
        employeeShare: Math.round(emp.tier.annualPremium * (100 - emp.tier.employerSharePct) / 100),
      },
      paymentHistory: [{
        amount:    emp.tier.annualPremium,
        method:    'bank_transfer',
        status:    'completed',
        paidBy:    hrEthioTelecom._id,
        reference: `ET-PAY-${Date.now().toString().slice(-6)}`,
      }],
    });
    enrollments.push({ enr, ip, user, emp });
  }
  console.log('Created', enrollments.length, 'Ethio Telecom enrollments');

  const claimDefs = [
    {
      empIdx: 0,
      claimType: 'inpatient', claimedAmount: 45_000, approvedAmount: 40_500, settlementAmount: 40_500,
      status: 'settled',
      incidentDate: daysAgo(60),
      description: 'Appendectomy at St. Gabriel Hospital. Patient was admitted for 4 nights post-surgery.',
      diagnosis: 'Acute appendicitis (K35.9)',
      services: [
        { name: 'Surgery (appendectomy)', quantity: 1, unitPrice: 30_000, totalAmount: 30_000 },
        { name: 'Hospital room (4 nights)', quantity: 4, unitPrice: 2_500, totalAmount: 10_000 },
        { name: 'Anaesthesia', quantity: 1, unitPrice: 5_000, totalAmount: 5_000 },
      ],
    },
    {
      empIdx: 0,
      claimType: 'outpatient', claimedAmount: 6_200,
      status: 'under_review',
      incidentDate: daysAgo(10),
      description: 'Cardiology consultation and ECG at Tikur Anbessa Hospital.',
      diagnosis: 'Hypertension follow-up',
      services: [
        { name: 'Specialist consultation', quantity: 1, unitPrice: 3_500, totalAmount: 3_500 },
        { name: 'ECG', quantity: 1, unitPrice: 1_200, totalAmount: 1_200 },
        { name: 'Blood pressure monitoring kit', quantity: 1, unitPrice: 1_500, totalAmount: 1_500 },
      ],
    },
    {
      empIdx: 1,
      claimType: 'dental', claimedAmount: 8_500, approvedAmount: 8_500,
      status: 'approved',
      incidentDate: daysAgo(25),
      description: 'Root canal treatment on lower right molar at Abyssinia Dental Clinic.',
      diagnosis: 'Pulpitis (K04.0)',
      services: [
        { name: 'Root canal — molar', quantity: 1, unitPrice: 6_500, totalAmount: 6_500 },
        { name: 'Temporary filling',  quantity: 1, unitPrice: 800,   totalAmount: 800   },
        { name: 'X-ray (2 films)',    quantity: 2, unitPrice: 600,   totalAmount: 1_200 },
      ],
    },
    {
      empIdx: 2,
      claimType: 'pharmacy', claimedAmount: 2_800,
      status: 'submitted',
      incidentDate: daysAgo(3),
      description: 'Monthly diabetes medication refill — Metformin 500mg (90 tablets) and Glipizide 5mg (30 tablets).',
      diagnosis: 'Type 2 Diabetes Mellitus (E11)',
      services: [
        { name: 'Metformin 500mg × 90', quantity: 90, unitPrice: 18, totalAmount: 1_620 },
        { name: 'Glipizide 5mg × 30',   quantity: 30, unitPrice: 39, totalAmount: 1_170 },
      ],
    },
    {
      empIdx: 3,
      claimType: 'maternity', claimedAmount: 35_000,
      status: 'under_review',
      incidentDate: daysAgo(18),
      description: 'Normal delivery at Bethzatha Hospital. 2-night post-delivery stay, newborn check-up included.',
      diagnosis: 'Normal spontaneous delivery (O80)',
      services: [
        { name: 'Delivery — normal',  quantity: 1, unitPrice: 18_000, totalAmount: 18_000 },
        { name: 'Midwife assistance', quantity: 1, unitPrice: 5_000,  totalAmount: 5_000  },
        { name: 'Room (2 nights)',    quantity: 2, unitPrice: 3_000,  totalAmount: 6_000  },
        { name: 'Newborn check-up',  quantity: 1, unitPrice: 4_000,  totalAmount: 4_000  },
        { name: 'Medications',       quantity: 1, unitPrice: 2_000,  totalAmount: 2_000  },
      ],
    },
    {
      empIdx: 4,
      claimType: 'optical', claimedAmount: 9_800, approvedAmount: 0,
      status: 'denied',
      incidentDate: daysAgo(35),
      description: 'Progressive lenses and designer frame purchase. Amount exceeds Basic tier optical limit.',
      diagnosis: 'Myopia with astigmatism (H52.1)',
      services: [
        { name: 'Progressive lenses', quantity: 1, unitPrice: 7_800, totalAmount: 7_800 },
        { name: 'Frame',              quantity: 1, unitPrice: 2_000, totalAmount: 2_000 },
      ],
    },
  ];

  for (const def of claimDefs) {
    const { enr, ip } = enrollments[def.empIdx];
    const claim = new Claim({
      insuredPerson:  ip._id,
      enrollment:     enr._id,
      submittedBy:    empUsers[def.empIdx].user._id,
      submissionType: 'insured_reimbursement',
      claimType:      def.claimType,
      status:         def.status,
      priority:       def.claimType === 'maternity' || def.claimType === 'inpatient' ? 'high' : 'medium',
      incidentDate:   def.incidentDate,
      description:    def.description,
      diagnosis:      def.diagnosis,
      services:       def.services,
      claimedAmount:  def.claimedAmount,
      approvedAmount: def.approvedAmount,
      settlementAmount: def.settlementAmount,
      assignedOfficer: claimsOfficer._id,
      estimatedResolutionDate: daysFromNow(7),
      statusHistory: [{ status: 'submitted', changedBy: empUsers[def.empIdx].user._id, timestamp: def.incidentDate }],
    });
    await claim.save();
  }
  console.log('Created', claimDefs.length, 'claims');

  // ── 13. Individual insured (broker customers) ─────────────────────────────────

  const individualDefs = [
    { firstName: 'Abebe',     lastName: 'Girma',   email: 'abebe.girma@gmail.com',     phone: '+251 91 777 1111', dob: '1983-06-12', gender: 'male',   tier: ihPremium,  active: true  },
    { firstName: 'Selamawit', lastName: 'Hailu',   email: 'selamawit.hailu@gmail.com', phone: '+251 91 777 2222', dob: '1990-11-30', gender: 'female', tier: ihStandard, active: true  },
    { firstName: 'Gezahegn',  lastName: 'Wolde',   email: 'gezahegn.wolde@gmail.com',  phone: '+251 91 777 3333', dob: '1975-02-18', gender: 'male',   tier: ihBasic,    active: true  },
    { firstName: 'Almaz',     lastName: 'Tadesse', email: 'almaz.tadesse@yahoo.com',   phone: '+251 91 777 4444', dob: '1995-08-05', gender: 'female', tier: ihStandard, active: false },
    { firstName: 'Tesfaye',   lastName: 'Bekele',  email: 'tesfaye.bekele@gmail.com',  phone: '+251 91 777 5555', dob: '1968-03-22', gender: 'male',   tier: null,       active: false },
  ];

  for (const def of individualDefs) {
    const user = await User.create({
      firstName: def.firstName, lastName: def.lastName,
      email: def.email, phone: def.phone,
      password: def.active ? 'Insured@2024' : 'TempPass@123',
      role: 'insured_person',
      mustChangePassword: !def.active,
      registeredByBroker: broker._id,
      isActive: true, isEmailVerified: true,
    });
    const ip = await InsuredPerson.create({
      user: user._id,
      firstName: def.firstName, lastName: def.lastName,
      email: def.email, phone: def.phone,
      dateOfBirth: new Date(def.dob),
      gender: def.gender,
      isActive: true,
    });
    await User.findByIdAndUpdate(user._id, {
      linkedEntity: { entityType: 'InsuredPerson', entityId: ip._id },
    });
    if (def.tier && def.active) {
      const start = daysAgo(45);
      const end   = daysFromNow(320);
      await PolicyEnrollment.create({
        product: individualProduct._id,
        tier:    def.tier._id,
        payer:   payer._id,
        insuredPersons: [ip._id],
        coverages: def.tier.coverages.map(c => c.coverage),
        status:    'active',
        startDate: start,
        endDate:   end,
        premium: {
          amount:    def.tier.annualPremium,
          frequency: 'annual',
        },
        paymentHistory: [{
          amount:    def.tier.annualPremium,
          method:    'mobile_money',
          status:    'completed',
          paidBy:    user._id,
          reference: `CHAPA-${Date.now().toString().slice(-6)}`,
        }],
      });
    }
  }
  console.log('Created', individualDefs.length, 'individual accounts (broker customers)');

  // ── Summary ───────────────────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  DEMO CREDENTIALS — ENTERPRISE INSURANCE');
  console.log('══════════════════════════════════════════════════════');
  console.log('\n  SYSTEM');
  console.log('  admin@enterprise-insurance.et         Admin@2024');
  console.log('  hana.girma@enterprise-insurance.et   Admin@2024   (claims officer)');
  console.log('  robel.tesfaye@enterprise-insurance.et Admin@2024  (finance officer)');
  console.log('\n  BROKER');
  console.log('  dawit.bekele@enterprise-insurance.et  Broker@2024');
  console.log('\n  HR ADMINS');
  console.log('  solomon.haile@ethiotelecom.et          HR@EthioTelecom2024');
  console.log('  meseret.alemu@cbe.com.et               HR@CBE2024');
  console.log('  habtamu.abebe@ethiopianairlines.com    HR@EtAir2024');
  console.log('  belay.tadesse@aau.edu.et               HR@AAU2024');
  console.log('\n  EMPLOYEES (Ethio Telecom — active, have claims)');
  console.log('  biruk.tadesse@ethiotelecom.et          Employee@2024');
  console.log('  tigist.alemu@ethiotelecom.et           Employee@2024');
  console.log('  mekonnen.abebe@ethiotelecom.et         Employee@2024');
  console.log('  hiwot.wolde@ethiotelecom.et            Employee@2024');
  console.log('  yohannes.kassa@ethiotelecom.et         Employee@2024');
  console.log('\n  EMPLOYEES (other institutions)');
  console.log('  liya.fekadu@cbe.com.et                 Employee@2024');
  console.log('  ermias.teshome@cbe.com.et              Employee@2024');
  console.log('  natnael.girma@ethiopianairlines.com    Employee@2024');
  console.log('  saron.bekele@ethiopianairlines.com     Employee@2024');
  console.log('  selam.worku@aau.edu.et                 Employee@2024');
  console.log('  tewodros.bekele@aau.edu.et             Employee@2024');
  console.log('\n  INDIVIDUAL INSURED');
  console.log('  abebe.girma@gmail.com                  Insured@2024');
  console.log('  selamawit.hailu@gmail.com              Insured@2024');
  console.log('  gezahegn.wolde@gmail.com               Insured@2024');
  console.log('\n  PENDING (must set password on first login)');
  console.log('  meron.getachew@ethiotelecom.et         TempPass@123');
  console.log('  azeb.hailu@cbe.com.et                  TempPass@123');
  console.log('  dawit.mulugeta@ethiopianairlines.com   TempPass@123');
  console.log('  rahel.mekonnen@aau.edu.et              TempPass@123');
  console.log('  almaz.tadesse@yahoo.com                TempPass@123');
  console.log('  tesfaye.bekele@gmail.com               TempPass@123');
  console.log('\n══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
