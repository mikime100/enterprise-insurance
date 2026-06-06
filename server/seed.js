/**
 * Presentation seed script — clears existing data and re-seeds a full demo dataset.
 * Run:  node seed.js
 * Requires MONGODB_URI in .env or a local MongoDB at default port.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User             = require('./models/User');
const Payer            = require('./models/Payer');
const InsuranceProduct = require('./models/InsuranceProduct');
const Coverage         = require('./models/Coverage');
const Tier             = require('./models/Tier');
const Institution      = require('./models/Institution');
const InsuredPerson    = require('./models/InsuredPerson');
const PolicyEnrollment = require('./models/PolicyEnrollment');
const Claim            = require('./models/Claim');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hash = (pw) => bcrypt.hash(pw, 12);

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise_insurance');
  console.log('Connected to MongoDB');

  // Clear
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

  // ── 1. Payer ─────────────────────────────────────────────────────────────────

  const payer = await Payer.create({
    name:          'Awash Insurance Company',
    licenseNumber: 'NBE-INS-2023-0041',
    type:          'composite',
    address:       { street: 'Bole Road, Nefas Silk', city: 'Addis Ababa', country: 'Ethiopia' },
    contactEmail:  'info@awashinsurance.et',
    contactPhone:  '+251 11 663 0000',
  });
  console.log('Created payer:', payer.name);

  // ── 2. Coverages ─────────────────────────────────────────────────────────────

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

  // ── 4. Tiers ─────────────────────────────────────────────────────────────────

  // Group Health tiers
  const ghBasic = await Tier.create({
    name: 'Basic', product: healthProduct._id, annualPremium: 8_400,
    employerSharePct: 100, maxDependents: 2,
    description: 'Essential inpatient and outpatient cover for employees.',
    coverages: [
      { coverage: cov['Inpatient Hospitalization']._id,  customLimit: 150_000 },
      { coverage: cov['Outpatient & Consultation']._id,   customLimit: 30_000  },
      { coverage: cov['Pharmacy & Medication']._id,       customLimit: 10_000  },
    ],
  });

  const ghStandard = await Tier.create({
    name: 'Standard', product: healthProduct._id, annualPremium: 14_400,
    employerSharePct: 80, maxDependents: 3,
    description: 'Adds dental and optical to core health benefits.',
    coverages: [
      { coverage: cov['Inpatient Hospitalization']._id,  customLimit: 200_000 },
      { coverage: cov['Outpatient & Consultation']._id,   customLimit: 50_000  },
      { coverage: cov['Dental Care']._id,                 customLimit: 12_000  },
      { coverage: cov['Optical Care']._id,                customLimit: 8_000   },
      { coverage: cov['Pharmacy & Medication']._id,       customLimit: 15_000  },
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
      { coverage: cov['Inpatient Hospitalization']._id,  customLimit: 300_000 },
      { coverage: cov['Outpatient & Consultation']._id,   customLimit: 60_000  },
      { coverage: cov['Dental Care']._id,                 customLimit: 15_000  },
      { coverage: cov['Optical Care']._id,                customLimit: 10_000  },
      { coverage: cov['Maternity & Newborn']._id },
      { coverage: cov['Pharmacy & Medication']._id,       customLimit: 20_000  },
      { coverage: cov['Life & Accidental Death']._id },
    ],
  });

  // Individual Health tiers
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

  // ── 5. Users — System ────────────────────────────────────────────────────────

  const adminPw = await hash('Admin@2024');
  const superadmin = await User.create({
    firstName: 'System', lastName: 'Administrator',
    email: 'admin@enterprise-insurance.et',
    password: adminPw, role: 'superadmin',
    phone: '+251 11 123 4567', isActive: true, isEmailVerified: true,
  });

  const claimsOfficer = await User.create({
    firstName: 'Hana', lastName: 'Girma',
    email: 'hana.girma@enterprise-insurance.et',
    password: adminPw, role: 'claims_officer',
    phone: '+251 91 234 5678', isActive: true, isEmailVerified: true,
  });

  const financeOfficer = await User.create({
    firstName: 'Robel', lastName: 'Tesfaye',
    email: 'robel.tesfaye@enterprise-insurance.et',
    password: adminPw, role: 'finance_officer',
    phone: '+251 91 345 6789', isActive: true, isEmailVerified: true,
  });

  console.log('Created system users (superadmin, claims officer, finance officer)');

  // ── 6. Broker ────────────────────────────────────────────────────────────────

  const brokerPw = await hash('Broker@2024');
  const broker = await User.create({
    firstName: 'Dawit', lastName: 'Bekele',
    email: 'dawit.bekele@enterprise-insurance.et',
    password: brokerPw, role: 'sales_broker',
    phone: '+251 91 456 7890', isActive: true, isEmailVerified: true,
    brokerStatus: 'approved',
  });
  console.log('Created broker:', broker.email);

  // ── 7. Institution ────────────────────────────────────────────────────────────

  const institution = await Institution.create({
    name: 'Ethio Telecom S.C.',
    type: 'corporate',
    registrationNumber: 'ET-CORP-2003-00001',
    address: { street: 'Churchill Avenue', city: 'Addis Ababa', country: 'Ethiopia' },
    contactEmail: 'hr@ethiotelecom.et',
    contactPhone: '+251 11 515 1515',
    assignedBroker: broker._id,
  });

  const hrPw = await hash('HR@EthioTelecom2024');
  const hrAdmin = await User.create({
    firstName: 'Solomon', lastName: 'Haile',
    email: 'solomon.haile@ethiotelecom.et',
    password: hrPw, role: 'institution_admin',
    phone: '+251 91 567 8901', isActive: true, isEmailVerified: true,
    institutionId: institution._id,
  });
  console.log('Created institution:', institution.name, '/ HR admin:', hrAdmin.email);

  // ── 8. Institution employees (insured persons + their user accounts) ──────────

  const empPw = await hash('Employee@2024');
  const empMustChange = await hash('TempPass@123');

  const employees = [
    { firstName: 'Biruk',    lastName: 'Tadesse',    email: 'biruk.tadesse@ethiotelecom.et',    phone: '+251 91 111 2233', gender: 'male',   tier: ghPremium,   dob: '1988-04-15', active: true  },
    { firstName: 'Tigist',   lastName: 'Alemu',      email: 'tigist.alemu@ethiotelecom.et',      phone: '+251 91 222 3344', gender: 'female', tier: ghStandard,  dob: '1991-07-22', active: true  },
    { firstName: 'Mekonnen', lastName: 'Abebe',      email: 'mekonnen.abebe@ethiotelecom.et',    phone: '+251 91 333 4455', gender: 'male',   tier: ghStandard,  dob: '1985-12-01', active: true  },
    { firstName: 'Hiwot',    lastName: 'Woldemariam',email: 'hiwot.wolde@ethiotelecom.et',       phone: '+251 91 444 5566', gender: 'female', tier: ghExecutive, dob: '1979-03-10', active: true  },
    { firstName: 'Yohannes', lastName: 'Kassa',      email: 'yohannes.kassa@ethiotelecom.et',    phone: '+251 91 555 6677', gender: 'male',   tier: ghBasic,     dob: '1995-09-28', active: true  },
    { firstName: 'Meron',    lastName: 'Getachew',   email: 'meron.getachew@ethiotelecom.et',    phone: '+251 91 666 7788', gender: 'female', tier: ghBasic,     dob: '1998-01-14', active: false }, // pending setup
  ];

  const empUsers = [];
  for (const emp of employees) {
    const isPending = !emp.active;
    const user = await User.create({
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      password: isPending ? empMustChange : empPw,
      role: 'insured_person',
      mustChangePassword: isPending,
      institutionId: institution._id,
      isActive: true, isEmailVerified: true,
    });
    const ip = await InsuredPerson.create({
      user: user._id,
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone,
      dateOfBirth: new Date(emp.dob),
      gender: emp.gender,
      institution: institution._id,
      isActive: true,
    });
    // Link the InsuredPerson back to the User so enrollment/claims filters work
    await User.findByIdAndUpdate(user._id, {
      linkedEntity: { entityType: 'InsuredPerson', entityId: ip._id },
    });
    empUsers.push({ user, ip, emp });
  }
  console.log('Created', empUsers.length, 'institution employees');

  // ── 9. Enrollments for active institution employees ──────────────────────────

  const enrollments = [];
  for (const { user, ip, emp } of empUsers) {
    if (!emp.active) continue;
    const start = daysAgo(90);
    const end   = daysFromNow(275);
    const enr = await PolicyEnrollment.create({
      product: healthProduct._id,
      tier:    emp.tier._id,
      payer:   payer._id,
      institution: institution._id,
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
        paidBy:    hrAdmin._id,
        reference: `ET-PAY-${Date.now().toString().slice(-6)}`,
      }],
    });
    enrollments.push({ enr, ip, user, emp });
  }
  console.log('Created', enrollments.length, 'active enrollments');

  // ── 10. Claims in various states ─────────────────────────────────────────────

  const claimDefs = [
    // Biruk — settled inpatient claim
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
    // Biruk — active outpatient claim under review
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
    // Tigist — dental claim approved, awaiting payment
    {
      empIdx: 1,
      claimType: 'dental', claimedAmount: 8_500, approvedAmount: 8_500,
      status: 'approved',
      incidentDate: daysAgo(25),
      description: 'Root canal treatment on lower right molar at Abyssinia Dental Clinic.',
      diagnosis: 'Pulpitis (K04.0)',
      services: [
        { name: 'Root canal — molar', quantity: 1, unitPrice: 6_500, totalAmount: 6_500 },
        { name: 'Temporary filling', quantity: 1, unitPrice: 800,   totalAmount: 800   },
        { name: 'X-ray (2 films)', quantity: 2,   unitPrice: 600,   totalAmount: 1_200 },
      ],
    },
    // Mekonnen — pharmacy claim, newly submitted
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
    // Hiwot — maternity claim, under review
    {
      empIdx: 3,
      claimType: 'maternity', claimedAmount: 35_000,
      status: 'under_review',
      incidentDate: daysAgo(18),
      description: 'Normal delivery at Bethzatha Hospital. 2-night post-delivery stay, newborn check-up included.',
      diagnosis: 'Normal spontaneous delivery (O80)',
      services: [
        { name: 'Delivery — normal', quantity: 1, unitPrice: 18_000, totalAmount: 18_000 },
        { name: 'Midwife assistance',  quantity: 1, unitPrice: 5_000,  totalAmount: 5_000  },
        { name: 'Room (2 nights)',      quantity: 2, unitPrice: 3_000,  totalAmount: 6_000  },
        { name: 'Newborn check-up',    quantity: 1, unitPrice: 4_000,  totalAmount: 4_000  },
        { name: 'Medications',         quantity: 1, unitPrice: 2_000,  totalAmount: 2_000  },
      ],
    },
    // Yohannes — optical claim, denied (limit exceeded at basic tier)
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

  // ── 11. Individual insured persons (broker customers) ────────────────────────

  const individualPw = await hash('Insured@2024');
  const individualDefs = [
    { firstName: 'Abebe',    lastName: 'Girma',    email: 'abebe.girma@gmail.com',     phone: '+251 91 777 1111', dob: '1983-06-12', gender: 'male',   tier: ihPremium,   active: true  },
    { firstName: 'Selamawit',lastName: 'Hailu',    email: 'selamawit.hailu@gmail.com', phone: '+251 91 777 2222', dob: '1990-11-30', gender: 'female', tier: ihStandard,  active: true  },
    { firstName: 'Gezahegn', lastName: 'Wolde',    email: 'gezahegn.wolde@gmail.com',  phone: '+251 91 777 3333', dob: '1975-02-18', gender: 'male',   tier: ihBasic,     active: true  },
    { firstName: 'Almaz',    lastName: 'Tadesse',  email: 'almaz.tadesse@yahoo.com',   phone: '+251 91 777 4444', dob: '1995-08-05', gender: 'female', tier: ihStandard,  active: false }, // pending
    { firstName: 'Tesfaye',  lastName: 'Bekele',   email: 'tesfaye.bekele@gmail.com',  phone: '+251 91 777 5555', dob: '1968-03-22', gender: 'male',   tier: null,        active: false }, // pending, no tier yet
  ];

  for (const def of individualDefs) {
    const isPending = !def.active;
    const user = await User.create({
      firstName: def.firstName, lastName: def.lastName,
      email: def.email, phone: def.phone,
      password: isPending ? empMustChange : individualPw,
      role: 'insured_person',
      mustChangePassword: isPending,
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

    if (def.tier) {
      const start = daysAgo(45);
      const end   = daysFromNow(320);
      await PolicyEnrollment.create({
        product: individualProduct._id,
        tier:    def.tier._id,
        payer:   payer._id,
        insuredPersons: [ip._id],
        coverages: def.tier.coverages.map(c => c.coverage),
        status:    def.active ? 'active' : 'pending',
        startDate: start,
        endDate:   end,
        premium: {
          amount:    def.tier.annualPremium,
          frequency: 'annual',
        },
        paymentHistory: def.active ? [{
          amount:    def.tier.annualPremium,
          method:    'mobile_money',
          status:    'completed',
          paidBy:    user._id,
          reference: `CHAPA-${Date.now().toString().slice(-6)}`,
        }] : [],
      });
    }
  }
  console.log('Created', individualDefs.length, 'individual accounts (broker customers)');

  // ── Summary ───────────────────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════════════');
  console.log('  DEMO CREDENTIALS — ENTERPRISE INSURANCE');
  console.log('══════════════════════════════════════════════');
  console.log('\n  SYSTEM ADMIN');
  console.log('  Email : admin@enterprise-insurance.et');
  console.log('  Pass  : Admin@2024');
  console.log('\n  SALES BROKER');
  console.log('  Email : dawit.bekele@enterprise-insurance.et');
  console.log('  Pass  : Broker@2024');
  console.log('\n  INSTITUTION HR ADMIN (Ethio Telecom)');
  console.log('  Email : solomon.haile@ethiotelecom.et');
  console.log('  Pass  : HR@EthioTelecom2024');
  console.log('\n  INSURED — EMPLOYEE (active, has claims)');
  console.log('  Email : biruk.tadesse@ethiotelecom.et');
  console.log('  Pass  : Employee@2024');
  console.log('\n  INSURED — INDIVIDUAL (active enrollment)');
  console.log('  Email : abebe.girma@gmail.com');
  console.log('  Pass  : Insured@2024');
  console.log('\n  INSURED — INDIVIDUAL (Standard tier)');
  console.log('  Email : selamawit.hailu@gmail.com');
  console.log('  Pass  : Insured@2024');
  console.log('\n  PENDING ACCOUNTS (must change password on first login)');
  console.log('  Email : meron.getachew@ethiotelecom.et   Pass: TempPass@123');
  console.log('  Email : almaz.tadesse@yahoo.com          Pass: TempPass@123');
  console.log('  Email : tesfaye.bekele@gmail.com         Pass: TempPass@123');
  console.log('\n══════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
