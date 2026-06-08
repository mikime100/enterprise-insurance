require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Payer = require('../models/Payer');
const Provider = require('../models/Provider');
const Institution = require('../models/Institution');
const InsuredPerson = require('../models/InsuredPerson');
const Group = require('../models/Group');
const InsuranceProduct = require('../models/InsuranceProduct');
const Coverage = require('../models/Coverage');
const Tier = require('../models/Tier');
const Quote = require('../models/Quote');
const PolicyEnrollment = require('../models/PolicyEnrollment');
const Claim = require('../models/Claim');
const Payment = require('../models/Payment');
const Agreement = require('../models/Agreement');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthsAgo(m, day = 15) {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  d.setDate(day);
  return d;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise_insurance');
  console.log('Connected to MongoDB');

  await Promise.all([
    User, Payer, Provider, Institution, InsuredPerson, Group,
    InsuranceProduct, Coverage, Tier, Quote, PolicyEnrollment,
    Claim, Payment, Agreement
  ].map(m => m.deleteMany({})));
  console.log('Cleared existing data');

  // ─── PAYER ───────────────────────────────────────────────────────────────
  const payer = await Payer.create({
    name: 'Enterprise Insurance S.C.',
    licenseNumber: 'ETH-INS-0012',
    type: 'composite',
    address: { street: 'Bole Road, Friendship Building', city: 'Addis Ababa', country: 'Ethiopia' },
    contactEmail: 'info@enterpriseinsurance.com',
    contactPhone: '+251 11 551 4430'
  });

  // ─── PROVIDERS ───────────────────────────────────────────────────────────
  const [stGabriel, blackLion, landmarkHosp, minayePharma, autoFix, tekeze] = await Provider.create([
    {
      name: 'St. Gabriel General Hospital',
      type: 'hospital', licenseNumber: 'HOSP-0045',
      specializations: ['General Medicine', 'Surgery', 'Maternity', 'Emergency'],
      address: { street: 'Cazanchis, Debre Zeit Road', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'billing@stgabriel.com', contactPhone: '+251 11 662 0033'
    },
    {
      name: 'Black Lion Specialized Hospital',
      type: 'hospital', licenseNumber: 'HOSP-0008',
      specializations: ['Oncology', 'Cardiology', 'Neurology', 'Orthopedics'],
      address: { street: 'Lideta, Jimma Road', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'billing@blacklion.gov.et', contactPhone: '+251 11 123 4567'
    },
    {
      name: 'Landmark General Hospital',
      type: 'hospital', licenseNumber: 'HOSP-0112',
      specializations: ['General Medicine', 'Pediatrics', 'Obstetrics', 'Dental'],
      address: { street: 'Bole, Airport Road', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'info@landmarkhospital.et', contactPhone: '+251 11 667 8900'
    },
    {
      name: 'Minaye Pharmacy & Diagnostics',
      type: 'pharmacy', licenseNumber: 'PHARM-0244',
      specializations: ['Dispensing', 'Lab Tests', 'Vaccines'],
      address: { street: 'Piazza, Ras Desta Damtew', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'info@minayepharma.et', contactPhone: '+251 91 234 5678'
    },
    {
      name: 'AutoFix Service Center',
      type: 'auto_repair', licenseNumber: 'GAR-0078',
      specializations: ['Collision Repair', 'Engine Repair', 'Paint & Body'],
      address: { street: 'Megenagna, Ring Road', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'service@autofix.et', contactPhone: '+251 91 123 4567'
    },
    {
      name: 'Tekeze Auto Garage',
      type: 'auto_repair', licenseNumber: 'GAR-0145',
      specializations: ['Mechanical', 'Electrical', 'Towing', 'Windscreen'],
      address: { street: 'Kera, Gofa Road', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'repair@tekeze.et', contactPhone: '+251 91 876 5432'
    }
  ]);

  // ─── INSTITUTIONS ────────────────────────────────────────────────────────
  const [ethioTelecom, cbe, ethioAirlines, aau] = await Institution.create([
    {
      name: 'Ethio Telecom',
      type: 'corporate', registrationNumber: 'ETH-CORP-0001',
      address: { street: 'Churchill Avenue, Telecom Building', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'hr@ethiotelecom.et', contactPhone: '+251 11 551 5151',
      employeeCount: 8500
    },
    {
      name: 'Commercial Bank of Ethiopia',
      type: 'corporate', registrationNumber: 'ETH-CORP-0002',
      address: { street: 'Gambia Street, CBE Headquarters', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'hr@cbe.com.et', contactPhone: '+251 11 551 2200',
      employeeCount: 22000
    },
    {
      name: 'Ethiopian Airlines',
      type: 'corporate', registrationNumber: 'ETH-CORP-0003',
      address: { street: 'Bole International Airport', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'hr@ethiopianairlines.com', contactPhone: '+251 11 665 2222',
      employeeCount: 18000
    },
    {
      name: 'Addis Ababa University',
      type: 'government', registrationNumber: 'ETH-GOV-0101',
      address: { street: 'Sidist Kilo, University Road', city: 'Addis Ababa', country: 'Ethiopia' },
      contactEmail: 'hr@aau.edu.et', contactPhone: '+251 11 123 9000',
      employeeCount: 4200
    }
  ]);

  // ─── USERS ───────────────────────────────────────────────────────────────
  const coreUsers = await User.create([
    // Super Admin
    { firstName: 'System',    lastName: 'Admin',    email: 'admin@enterpriseinsurance.com',       password: 'Admin@123',       role: 'superadmin',        phone: '+251 91 000 0001', isEmailVerified: true, isActive: true },
    // Payer staff
    { firstName: 'Yohannes',  lastName: 'Tesfaye',  email: 'payer.admin@enterpriseinsurance.com', password: 'Payer@123',       role: 'payer_admin',       phone: '+251 91 100 0001', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Payer', entityId: payer._id } },
    { firstName: 'Meron',     lastName: 'Bekele',   email: 'underwriter@enterpriseinsurance.com', password: 'Under@123',       role: 'underwriter',       phone: '+251 91 100 0002', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Payer', entityId: payer._id } },
    { firstName: 'Dawit',     lastName: 'Haile',    email: 'claims@enterpriseinsurance.com',      password: 'Claims@123',      role: 'claims_officer',    phone: '+251 91 100 0003', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Payer', entityId: payer._id } },
    { firstName: 'Tigist',    lastName: 'Wolde',    email: 'finance@enterpriseinsurance.com',     password: 'Finance@123',     role: 'finance_officer',   phone: '+251 91 100 0004', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Payer', entityId: payer._id } },
    // Provider users
    { firstName: 'Abebe',     lastName: 'Girma',    email: 'billing@stgabriel.com',         password: 'Provider@123',    role: 'provider_admin',    phone: '+251 91 200 0001', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Provider', entityId: stGabriel._id } },
    { firstName: 'Fikirte',   lastName: 'Alemu',    email: 'billing@blacklion.gov.et',      password: 'Provider@123',    role: 'provider_admin',    phone: '+251 91 200 0002', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Provider', entityId: blackLion._id } },
    // Institution HR users
    { firstName: 'Selam',     lastName: 'Tadesse',  email: 'hr@ethiotelecom.et',            password: 'Institution@123', role: 'institution_admin', phone: '+251 91 300 0001', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Institution', entityId: ethioTelecom._id } },
    { firstName: 'Tsehay',    lastName: 'Girma',    email: 'hr@cbe.com.et',                 password: 'Institution@123', role: 'institution_admin', phone: '+251 91 300 0002', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Institution', entityId: cbe._id } },
    { firstName: 'Robel',     lastName: 'Hailu',    email: 'hr@ethiopianairlines.com',      password: 'Institution@123', role: 'institution_admin', phone: '+251 91 300 0003', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Institution', entityId: ethioAirlines._id } },
    { firstName: 'Lemlem',    lastName: 'Woldemariam', email: 'hr@aau.edu.et',              password: 'Institution@123', role: 'institution_admin', phone: '+251 91 300 0004', isEmailVerified: true, isActive: true, linkedEntity: { entityType: 'Institution', entityId: aau._id } },
    // Insured — demo login (institution employee)
    { firstName: 'Biruk',     lastName: 'Assefa',   email: 'biruk@ethiotelecom.et',         password: 'Insured@123',     role: 'insured_person',    phone: '+251 91 400 0001', isEmailVerified: true, isActive: true },
    // Sales broker — demo
    { firstName: 'Kebede',    lastName: 'Worku',    email: 'broker@enterpriseinsurance.com', password: 'Broker@123',     role: 'sales_broker',      phone: '+251 91 500 0001', isEmailVerified: true, isActive: true, brokerStatus: 'approved' },
    // Individual self-registered insured persons (no institution)
    { firstName: 'Daniel',    lastName: 'Tesfaye',  email: 'daniel.tesfaye@gmail.com',      password: 'Insured@123',     role: 'insured_person',    phone: '+251 91 600 0001', isEmailVerified: true, isActive: true },
    { firstName: 'Helen',     lastName: 'Girma',    email: 'helen.girma@gmail.com',         password: 'Insured@123',     role: 'insured_person',    phone: '+251 91 600 0002', isEmailVerified: true, isActive: true },
    { firstName: 'Yonas',     lastName: 'Alemu',    email: 'yonas.alemu@gmail.com',         password: 'Insured@123',     role: 'insured_person',    phone: '+251 91 600 0003', isEmailVerified: true, isActive: true },
  ]);

  const [superAdmin, payerAdmin, underwriter, claimsOfficer, financeOfficer,
         stGabrielUser, blackLionUser,
         etHrUser, cbeHrUser, ethioAirHrUser, aauHrUser,
         insuredDemo, brokerUser,
         danielUser, helenUser, yonasUser] = coreUsers;

  // ─── INSURED PERSON USERS (bulk) ─────────────────────────────────────────
  const ipUserData = [
    // Ethio Telecom employees
    { firstName: 'Hanna',     lastName: 'Mekonnen',  email: 'hanna@ethiotelecom.et',      inst: ethioTelecom._id },
    { firstName: 'Samuel',    lastName: 'Kebede',    email: 'samuel@ethiotelecom.et',     inst: ethioTelecom._id },
    { firstName: 'Natnael',   lastName: 'Girma',     email: 'natnael@ethiotelecom.et',    inst: ethioTelecom._id },
    { firstName: 'Yordanos',  lastName: 'Abebe',     email: 'yordanos@ethiotelecom.et',   inst: ethioTelecom._id },
    { firstName: 'Meseret',   lastName: 'Hailu',     email: 'meseret@ethiotelecom.et',    inst: ethioTelecom._id },
    { firstName: 'Tewodros',  lastName: 'Tadesse',   email: 'tewodros@ethiotelecom.et',   inst: ethioTelecom._id },
    { firstName: 'Liya',      lastName: 'Solomon',   email: 'liya.s@ethiotelecom.et',     inst: ethioTelecom._id },
    { firstName: 'Haben',     lastName: 'Tesfaye',   email: 'haben@ethiotelecom.et',      inst: ethioTelecom._id },
    { firstName: 'Dawit',     lastName: 'Bekele',    email: 'dawit.b@ethiotelecom.et',    inst: ethioTelecom._id },
    { firstName: 'Rekik',     lastName: 'Asfaw',     email: 'rekik@ethiotelecom.et',      inst: ethioTelecom._id },
    // CBE employees
    { firstName: 'Abreham',   lastName: 'Tekle',     email: 'abreham@cbe.com.et',         inst: cbe._id },
    { firstName: 'Selamawit', lastName: 'Alemu',     email: 'selamawit@cbe.com.et',       inst: cbe._id },
    { firstName: 'Getnet',    lastName: 'Worku',     email: 'getnet@cbe.com.et',          inst: cbe._id },
    { firstName: 'Tsega',     lastName: 'Hailu',     email: 'tsega@cbe.com.et',           inst: cbe._id },
    { firstName: 'Habtamu',   lastName: 'Demeke',    email: 'habtamu@cbe.com.et',         inst: cbe._id },
    { firstName: 'Mihret',    lastName: 'Alene',     email: 'mihret@cbe.com.et',          inst: cbe._id },
    { firstName: 'Ephrem',    lastName: 'Girma',     email: 'ephrem@cbe.com.et',          inst: cbe._id },
    { firstName: 'Freweyni',  lastName: 'Kebede',    email: 'freweyni@cbe.com.et',        inst: cbe._id },
    // Ethiopian Airlines
    { firstName: 'Fasika',    lastName: 'Woldu',     email: 'fasika@ethiopianairlines.com', inst: ethioAirlines._id },
    { firstName: 'Kidan',     lastName: 'Berhe',     email: 'kidan@ethiopianairlines.com',  inst: ethioAirlines._id },
    { firstName: 'Eyob',      lastName: 'Gebre',     email: 'eyob@ethiopianairlines.com',   inst: ethioAirlines._id },
    { firstName: 'Tigist',    lastName: 'Mengistu',  email: 'tigist@ethiopianairlines.com', inst: ethioAirlines._id },
    { firstName: 'Biniam',    lastName: 'Haile',     email: 'biniam@ethiopianairlines.com', inst: ethioAirlines._id },
    { firstName: 'Eden',      lastName: 'Teshome',   email: 'eden@ethiopianairlines.com',   inst: ethioAirlines._id },
    { firstName: 'Robel',     lastName: 'Desta',     email: 'robel.d@ethiopianairlines.com',inst: ethioAirlines._id },
    // AAU staff
    { firstName: 'Prof. Kebede', lastName: 'Woldemariam', email: 'k.woldemariam@aau.edu.et', inst: aau._id },
    { firstName: 'Dr. Hiwot',    lastName: 'Mengistu',    email: 'h.mengistu@aau.edu.et',    inst: aau._id },
    { firstName: 'Aster',        lastName: 'Mekonnen',    email: 'a.mekonnen@aau.edu.et',    inst: aau._id },
    { firstName: 'Zelalem',      lastName: 'Teklu',       email: 'z.teklu@aau.edu.et',       inst: aau._id },
    { firstName: 'Miriam',       lastName: 'Bekele',      email: 'm.bekele@aau.edu.et',      inst: aau._id },
  ];

  const ipUsers = await User.create(
    ipUserData.map(u => ({
      firstName: u.firstName, lastName: u.lastName, email: u.email,
      password: 'Insured@123', role: 'insured_person', phone: '+251 91 400 0000',
      isEmailVerified: true, isActive: true,
    }))
  );

  // ─── INSURED PERSONS ─────────────────────────────────────────────────────
  // Demo user first
  const demoIP = await InsuredPerson.create({
    user: insuredDemo._id,
    firstName: 'Biruk', lastName: 'Assefa',
    email: 'biruk@ethiotelecom.et', phone: '+251 91 400 0001',
    dateOfBirth: new Date('1988-04-12'), gender: 'male',
    nationalId: 'ETH-FYD-001234',
    institution: ethioTelecom._id,
    dependents: [
      { firstName: 'Sara',  lastName: 'Assefa', dateOfBirth: new Date('2012-06-05'), gender: 'female', relationship: 'child' },
      { firstName: 'Liya',  lastName: 'Assefa', dateOfBirth: new Date('1990-08-20'), gender: 'female', relationship: 'spouse' }
    ]
  });
  await User.updateOne({ _id: insuredDemo._id }, { 'linkedEntity.entityType': 'InsuredPerson', 'linkedEntity.entityId': demoIP._id });

  // Bulk insured persons
  const ipDOBs = [
    '1992-11-28','1985-02-17','1990-07-04','1994-03-21','1987-09-15',
    '1995-06-30','1983-01-12','1991-12-03','1989-05-25','1993-08-18',
    '1986-10-07','1997-04-14','1984-07-22','1996-02-28','1988-11-11',
    '1991-09-05','1993-03-17','1985-06-23','1990-01-09','1987-08-31',
    '1992-04-16','1986-12-20','1994-07-08','1983-05-13','1996-10-25',
    '1988-02-14','1991-07-19','1985-11-30','1993-01-06','1989-09-22',
  ];
  const ipGenders = [
    'female','male','male','female','female','male','male','female','male','female',
    'male','female','male','female','male','male','female','male','female','female',
    'male','male','female','male','female','male','female','male','female','male',
  ];

  const ipRecords = await InsuredPerson.insertMany(
    ipUsers.map((u, i) => ({
      user: u._id,
      firstName: ipUserData[i].firstName,
      lastName: ipUserData[i].lastName,
      email: ipUserData[i].email,
      phone: '+251 91 400 0000',
      dateOfBirth: new Date(ipDOBs[i]),
      gender: ipGenders[i],
      nationalId: `ETH-FYD-${(10000 + i).toString()}`,
      institution: ipUserData[i].inst,
      dependents: i % 3 === 0 ? [
        { firstName: 'Yared', lastName: ipUserData[i].lastName, dateOfBirth: new Date('2015-01-01'), gender: 'male', relationship: 'child' }
      ] : []
    }))
  );

  // Link bulk users to insured person records
  await Promise.all(ipUsers.map((u, i) =>
    User.updateOne({ _id: u._id }, { 'linkedEntity.entityType': 'InsuredPerson', 'linkedEntity.entityId': ipRecords[i]._id })
  ));

  // ─── INDIVIDUAL (SELF-REGISTERED) INSURED PERSONS ────────────────────────
  const [danielIP, helenIP, yonasIP] = await InsuredPerson.insertMany([
    {
      user: danielUser._id,
      firstName: 'Daniel', lastName: 'Tesfaye',
      email: 'daniel.tesfaye@gmail.com', phone: '+251 91 600 0001',
      dateOfBirth: new Date('1991-03-14'), gender: 'male',
      nationalId: 'ETH-IND-000001',
      address: { city: 'Addis Ababa', country: 'Ethiopia' },
      dependents: [
        { firstName: 'Mekdes', lastName: 'Tesfaye', dateOfBirth: new Date('1993-07-22'), gender: 'female', relationship: 'spouse' },
        { firstName: 'Nathan', lastName: 'Tesfaye', dateOfBirth: new Date('2018-11-05'), gender: 'male', relationship: 'child' },
      ],
    },
    {
      user: helenUser._id,
      firstName: 'Helen', lastName: 'Girma',
      email: 'helen.girma@gmail.com', phone: '+251 91 600 0002',
      dateOfBirth: new Date('1995-08-30'), gender: 'female',
      nationalId: 'ETH-IND-000002',
      address: { city: 'Addis Ababa', country: 'Ethiopia' },
      dependents: [],
    },
    {
      user: yonasUser._id,
      firstName: 'Yonas', lastName: 'Alemu',
      email: 'yonas.alemu@gmail.com', phone: '+251 91 600 0003',
      dateOfBirth: new Date('1988-05-19'), gender: 'male',
      nationalId: 'ETH-IND-000003',
      address: { city: 'Dire Dawa', country: 'Ethiopia' },
      dependents: [
        { firstName: 'Rahel', lastName: 'Alemu', dateOfBirth: new Date('2016-02-10'), gender: 'female', relationship: 'child' },
      ],
    },
  ]);
  await Promise.all([
    User.updateOne({ _id: danielUser._id }, { 'linkedEntity.entityType': 'InsuredPerson', 'linkedEntity.entityId': danielIP._id }),
    User.updateOne({ _id: helenUser._id },  { 'linkedEntity.entityType': 'InsuredPerson', 'linkedEntity.entityId': helenIP._id }),
    User.updateOne({ _id: yonasUser._id },  { 'linkedEntity.entityType': 'InsuredPerson', 'linkedEntity.entityId': yonasIP._id }),
  ]);

  // ─── BROKER CUSTOMERS (registered by broker) ─────────────────────────────
  const brokerCustomerData = [
    { firstName: 'Firehiwot', lastName: 'Bekele',  email: 'firehiwot.b@gmail.com', phone: '+251 91 700 0001', dob: '1990-06-12', gender: 'female' },
    { firstName: 'Muluken',   lastName: 'Tadesse',  email: 'muluken.t@gmail.com',   phone: '+251 91 700 0002', dob: '1985-09-25', gender: 'male' },
    { firstName: 'Bethlehem', lastName: 'Solomon',  email: 'bethlehem.s@gmail.com', phone: '+251 91 700 0003', dob: '1993-01-17', gender: 'female' },
  ];
  const brokerCustomerUsers = await User.create(brokerCustomerData.map(c => ({
    firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone,
    password: 'Insured@123', role: 'insured_person', isEmailVerified: true, isActive: true, mustChangePassword: false,
  })));
  const brokerCustomerIPs = await InsuredPerson.insertMany(brokerCustomerData.map((c, i) => ({
    user: brokerCustomerUsers[i]._id,
    firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone,
    dateOfBirth: new Date(c.dob), gender: c.gender,
    nationalId: `ETH-BRK-${(20000 + i).toString()}`,
    address: { city: 'Addis Ababa', country: 'Ethiopia' },
    registeredByBroker: brokerUser._id,
    dependents: i === 0 ? [{ firstName: 'Amir', lastName: 'Bekele', dateOfBirth: new Date('2019-04-03'), gender: 'male', relationship: 'child' }] : [],
  })));
  await Promise.all(brokerCustomerUsers.map((u, i) =>
    User.updateOne({ _id: u._id }, { 'linkedEntity.entityType': 'InsuredPerson', 'linkedEntity.entityId': brokerCustomerIPs[i]._id })
  ));

  console.log('Created stakeholders: 4 institutions, 6 providers, 30 group + 3 individual + 3 broker-registered insured persons');

  // Convenient refs
  const [etIP1, etIP2, etIP3, etIP4, etIP5, etIP6, etIP7, etIP8, etIP9, etIP10,
         cbeIP1, cbeIP2, cbeIP3, cbeIP4, cbeIP5, cbeIP6, cbeIP7, cbeIP8,
         airIP1, airIP2, airIP3, airIP4, airIP5, airIP6, airIP7,
         aauIP1, aauIP2, aauIP3, aauIP4, aauIP5] = ipRecords;

  // ─── GROUPS ──────────────────────────────────────────────────────────────
  const [etExec, etEng, etOps, cbeExec, cbeBranch, airExec, airCrew, aauFaculty] = await Group.create([
    { name: 'Executive Management', institution: ethioTelecom._id, description: 'C-suite, VP level' },
    { name: 'Engineering & IT',     institution: ethioTelecom._id, description: 'Software and network engineers' },
    { name: 'Operations',           institution: ethioTelecom._id, description: 'Field and operations staff' },
    { name: 'Executive',            institution: cbe._id,          description: 'Senior management' },
    { name: 'Branch Banking',       institution: cbe._id,          description: 'Branch staff and tellers' },
    { name: 'Management',           institution: ethioAirlines._id,description: 'Senior management and pilots' },
    { name: 'Cabin Crew',           institution: ethioAirlines._id,description: 'Flight attendants and ground crew' },
    { name: 'Faculty',              institution: aau._id,          description: 'Academic and research staff' },
  ]);

  // ─── INSURANCE PRODUCTS ──────────────────────────────────────────────────
  const [healthProduct, autoProduct] = await InsuranceProduct.create([
    {
      name: 'EnterpriseCare Group Health Plan', payer: payer._id, productType: 'health',
      description: 'Comprehensive group health insurance for corporate clients. Covers inpatient, outpatient, dental, and optical.',
      targetMarkets: ['Corporate', 'Government'],
      ageRange: { min: 18, max: 65 }, baseAnnualPremium: 8400, waitingPeriodMonths: 1,
      features: ['Nationwide Hospital Network', 'Cashless Treatment', 'Family Coverage', 'Pre-existing After 12 Months'],
      terms: 'Annual renewable. Waiting period 1 month. Pre-existing conditions covered after 12 months.'
    },
    {
      name: 'EnterpriseAuto Comprehensive Cover', payer: payer._id, productType: 'auto',
      description: 'Full comprehensive motor insurance for corporate fleets and individuals.',
      targetMarkets: ['Corporate', 'SME'],
      ageRange: { min: 18, max: 70 }, baseAnnualPremium: 3600,
      features: ['Own Damage', 'Third Party Liability', 'Roadside Assistance', 'Windscreen Cover'],
      terms: 'Annual renewable. Third party liability mandatory per Ethiopian law.'
    }
  ]);

  // ─── COVERAGES ───────────────────────────────────────────────────────────
  const [inpatientCov, outpatientCov, dentalCov, opticalCov,
         collisionCov, comprehensiveCov, liabilityCov] = await Coverage.create([
    { name: 'Inpatient / Hospitalization', payer: payer._id, productType: 'health', description: 'Hospital admission, surgery, ICU, ward', limits: { annual: 150000, perClaim: 80000 }, deductible: 500,  copaymentPct: 10 },
    { name: 'Outpatient / Consultation',   payer: payer._id, productType: 'health', description: 'GP visits, specialist, lab tests',        limits: { annual: 20000,  perClaim: 2000  }, deductible: 0,    copaymentPct: 20 },
    { name: 'Dental',                      payer: payer._id, productType: 'health', description: 'Checkups, fillings, extractions',          limits: { annual: 8000,   perClaim: 2000  }, deductible: 0,    copaymentPct: 20 },
    { name: 'Optical',                     payer: payer._id, productType: 'health', description: 'Eye exams, glasses, contact lenses',       limits: { annual: 5000,   perClaim: 2500  }, deductible: 0,    copaymentPct: 0  },
    { name: 'Own Damage / Collision',      payer: payer._id, productType: 'auto',   description: 'Damage to own vehicle from collision',     limits: { annual: 500000, perClaim: 500000}, deductible: 3000, copaymentPct: 0  },
    { name: 'Comprehensive (Fire & Theft)',payer: payer._id, productType: 'auto',   description: 'Fire, theft, vandalism',                   limits: { annual: 500000, perClaim: 500000}, deductible: 2000, copaymentPct: 0  },
    { name: 'Third Party Liability',       payer: payer._id, productType: 'auto',   description: 'Injury or damage to third parties',        limits: { annual: 1000000,perClaim: 500000}, deductible: 0,    copaymentPct: 0  },
  ]);

  // ─── TIERS ───────────────────────────────────────────────────────────────
  const [basicTier, standardTier, premiumTier, thirdPartyTier, autoComprehensiveTier] = await Tier.create([
    {
      name: 'Basic', product: healthProduct._id,
      coverages: [{ coverage: inpatientCov._id, customLimit: 100000 }, { coverage: outpatientCov._id, customLimit: 10000 }],
      annualPremium: 6000, employerSharePct: 80, maxDependents: 2, description: 'Essential health coverage'
    },
    {
      name: 'Standard', product: healthProduct._id,
      coverages: [{ coverage: inpatientCov._id }, { coverage: outpatientCov._id }, { coverage: dentalCov._id, customLimit: 5000 }],
      annualPremium: 8400, employerSharePct: 85, maxDependents: 3, description: 'Comprehensive with dental'
    },
    {
      name: 'Premium', product: healthProduct._id,
      coverages: [{ coverage: inpatientCov._id }, { coverage: outpatientCov._id }, { coverage: dentalCov._id }, { coverage: opticalCov._id }],
      annualPremium: 12000, employerSharePct: 90, maxDependents: 4, description: 'Full coverage including optical'
    },
    {
      name: 'Third Party', product: autoProduct._id,
      coverages: [{ coverage: liabilityCov._id }],
      annualPremium: 1800, employerSharePct: 100, maxDependents: 0, description: 'Mandatory liability only'
    },
    {
      name: 'Comprehensive', product: autoProduct._id,
      coverages: [{ coverage: collisionCov._id }, { coverage: comprehensiveCov._id }, { coverage: liabilityCov._id }],
      annualPremium: 3600, employerSharePct: 100, maxDependents: 0, description: 'Full comprehensive motor'
    }
  ]);

  console.log('Created products, coverages, tiers');

  // ─── PROVIDER-PAYER AGREEMENTS ────────────────────────────────────────────
  await Agreement.create([
    {
      payer: payer._id, provider: stGabriel._id, status: 'active',
      effectiveDate: new Date('2026-01-01'), expiryDate: new Date('2026-12-31'),
      paymentCycle: 'monthly',
      services: [
        { name: 'General Consultation',     description: 'GP visit',               agreedPrice: 350   },
        { name: 'Specialist Consultation',  description: 'Specialist visit',        agreedPrice: 700   },
        { name: 'Inpatient Ward (per night)',description: 'Standard ward',          agreedPrice: 3500  },
        { name: 'ICU (per night)',           description: 'Intensive care',         agreedPrice: 12000 },
        { name: 'Minor Surgery',            description: 'Day surgery',            agreedPrice: 15000 },
        { name: 'Major Surgery',            description: 'Complex surgical',       agreedPrice: 80000 }
      ],
      coverages: [inpatientCov._id, outpatientCov._id],
      notes: 'Standard hospital agreement. Payment within 30 days.'
    },
    {
      payer: payer._id, provider: blackLion._id, status: 'active',
      effectiveDate: new Date('2026-01-01'), expiryDate: new Date('2026-12-31'),
      paymentCycle: 'monthly',
      services: [
        { name: 'Oncology Consultation',   description: 'Cancer specialist',       agreedPrice: 1200  },
        { name: 'Cardiology Consultation', description: 'Heart specialist',        agreedPrice: 1000  },
        { name: 'Inpatient (per night)',   description: 'Private ward',            agreedPrice: 5000  },
        { name: 'MRI Scan',               description: 'Magnetic resonance',      agreedPrice: 8000  },
      ],
      coverages: [inpatientCov._id, outpatientCov._id],
      notes: 'Specialist hospital agreement. Payment within 45 days.'
    },
    {
      payer: payer._id, provider: autoFix._id, status: 'active',
      effectiveDate: new Date('2026-01-01'), expiryDate: new Date('2026-12-31'),
      paymentCycle: 'monthly',
      services: [
        { name: 'Repair Assessment',       description: 'Vehicle assessment fee',  agreedPrice: 2000  },
        { name: 'Body Repair (per panel)', description: 'Panel beating/paint',     agreedPrice: 6000  },
        { name: 'Major Engine Repair',     description: 'Engine overhaul',         agreedPrice: 35000 },
      ],
      coverages: [collisionCov._id],
      notes: 'Auto repair agreement for fleet vehicles.'
    }
  ]);

  // ─── QUOTES ───────────────────────────────────────────────────────────────
  const [etQuote, cbeQuote, airQuote, aauQuote, draftQuote] = await Quote.create([
    {
      payer: payer._id, product: healthProduct._id, institution: ethioTelecom._id,
      requestedBy: etHrUser._id, assignedUnderwriter: underwriter._id, memberCount: 120,
      riskFactors: { averageAge: 34, claimsHistory: 'low', riskScore: 3 },
      scenarios: [
        { name: 'Option A — Standard', tier: standardTier._id, annualPremium: 8400 * 120, notes: 'Base for all staff' },
        { name: 'Option B — Mixed',    tier: premiumTier._id,  annualPremium: 9200 * 120, notes: 'Premium (30) + Standard (90)' }
      ],
      status: 'approved', validUntil: daysAgo(-60), finalPremium: 8400 * 120,
      notes: [{ author: underwriter._id, content: 'Risk low. Recommend Option A.' }]
    },
    {
      payer: payer._id, product: healthProduct._id, institution: cbe._id,
      requestedBy: cbeHrUser._id, assignedUnderwriter: underwriter._id, memberCount: 450,
      riskFactors: { averageAge: 38, claimsHistory: 'moderate', riskScore: 5 },
      scenarios: [
        { name: 'Standard Tier',  tier: standardTier._id, annualPremium: 8400 * 450, notes: 'All staff standard' },
        { name: 'Premium Tier',   tier: premiumTier._id,  annualPremium: 12000 * 100, notes: 'Management only' }
      ],
      status: 'approved', validUntil: daysAgo(-30), finalPremium: 8400 * 450,
      notes: [{ author: underwriter._id, content: 'Medium risk profile. Recommend Standard.' }]
    },
    {
      payer: payer._id, product: healthProduct._id, institution: ethioAirlines._id,
      requestedBy: ethioAirHrUser._id, assignedUnderwriter: underwriter._id, memberCount: 800,
      riskFactors: { averageAge: 35, claimsHistory: 'high', riskScore: 7 },
      scenarios: [
        { name: 'Premium Tier — All', tier: premiumTier._id, annualPremium: 12000 * 800, notes: 'Full coverage for crew' }
      ],
      status: 'under_review', validUntil: daysAgo(-14),
      notes: [{ author: underwriter._id, content: 'High risk due to occupational hazards. Reviewing premium loading.' }]
    },
    {
      payer: payer._id, product: healthProduct._id, institution: aau._id,
      requestedBy: etHrUser._id, assignedUnderwriter: underwriter._id, memberCount: 280,
      riskFactors: { averageAge: 45, claimsHistory: 'moderate', riskScore: 5 },
      scenarios: [
        { name: 'Standard Tier', tier: standardTier._id, annualPremium: 8400 * 280, notes: 'Academic staff' }
      ],
      status: 'approved', validUntil: daysAgo(-7), finalPremium: 8400 * 280,
      notes: [{ author: underwriter._id, content: 'Approved. Higher age average noted.' }]
    },
    {
      payer: payer._id, product: autoProduct._id, institution: ethioTelecom._id,
      requestedBy: etHrUser._id, assignedUnderwriter: underwriter._id, memberCount: 45,
      riskFactors: { averageAge: 0, claimsHistory: 'low', riskScore: 2 },
      scenarios: [
        { name: 'Comprehensive Auto', tier: autoComprehensiveTier._id, annualPremium: 3600 * 45, notes: 'Fleet of 45 vehicles' }
      ],
      status: 'draft'
    }
  ]);

  // ─── POLICY ENROLLMENTS ──────────────────────────────────────────────────
  const enrollStart = new Date('2026-01-01');
  const enrollEnd   = new Date('2026-12-31');

  const etAllIPs  = [demoIP._id, ...ipRecords.slice(0,10).map(p=>p._id)];
  const cbeAllIPs = ipRecords.slice(10, 18).map(p=>p._id);
  const airAllIPs = ipRecords.slice(18, 25).map(p=>p._id);
  const aauAllIPs = ipRecords.slice(25, 30).map(p=>p._id);

  const [etEnroll, cbeEnroll, airEnroll, aauEnroll, etAutoEnroll] = await PolicyEnrollment.create([
    {
      quote: etQuote._id, product: healthProduct._id, tier: standardTier._id,
      payer: payer._id, institution: ethioTelecom._id, insuredPersons: etAllIPs,
      coverages: [inpatientCov._id, outpatientCov._id, dentalCov._id],
      status: 'active', startDate: enrollStart, endDate: enrollEnd, renewalDate: enrollEnd,
      premium: { amount: 8400 * 120, frequency: 'annual', employerShare: 8400*120*0.85, employeeShare: 8400*120*0.15 },
      paymentHistory: [{ amount: 8400*120, method: 'bank_transfer', status: 'completed', reference: 'REF-ET-2026-001', date: enrollStart }],
      notes: 'Group health — Ethio Telecom FY2026'
    },
    {
      quote: cbeQuote._id, product: healthProduct._id, tier: standardTier._id,
      payer: payer._id, institution: cbe._id, insuredPersons: cbeAllIPs,
      coverages: [inpatientCov._id, outpatientCov._id, dentalCov._id],
      status: 'active', startDate: enrollStart, endDate: enrollEnd, renewalDate: enrollEnd,
      premium: { amount: 8400 * 450, frequency: 'annual', employerShare: 8400*450*0.85, employeeShare: 8400*450*0.15 },
      paymentHistory: [{ amount: 8400*450, method: 'bank_transfer', status: 'completed', reference: 'REF-CBE-2026-001', date: enrollStart }],
      notes: 'Group health — CBE FY2026'
    },
    {
      quote: airQuote._id, product: healthProduct._id, tier: premiumTier._id,
      payer: payer._id, institution: ethioAirlines._id, insuredPersons: airAllIPs,
      coverages: [inpatientCov._id, outpatientCov._id, dentalCov._id, opticalCov._id],
      status: 'active', startDate: enrollStart, endDate: enrollEnd, renewalDate: enrollEnd,
      premium: { amount: 12000 * 800, frequency: 'annual', employerShare: 12000*800*0.90, employeeShare: 12000*800*0.10 },
      paymentHistory: [{ amount: 12000*800, method: 'bank_transfer', status: 'completed', reference: 'REF-AIR-2026-001', date: enrollStart }],
      notes: 'Group health — Ethiopian Airlines FY2026'
    },
    {
      quote: aauQuote._id, product: healthProduct._id, tier: standardTier._id,
      payer: payer._id, institution: aau._id, insuredPersons: aauAllIPs,
      coverages: [inpatientCov._id, outpatientCov._id, dentalCov._id],
      status: 'active', startDate: enrollStart, endDate: enrollEnd, renewalDate: enrollEnd,
      premium: { amount: 8400 * 280, frequency: 'annual', employerShare: 8400*280*0.85, employeeShare: 8400*280*0.15 },
      paymentHistory: [{ amount: 8400*280, method: 'bank_transfer', status: 'completed', reference: 'REF-AAU-2026-001', date: enrollStart }],
      notes: 'Group health — AAU FY2026'
    },
    {
      product: autoProduct._id, tier: autoComprehensiveTier._id,
      payer: payer._id, institution: ethioTelecom._id, insuredPersons: [demoIP._id, etIP3._id, etIP5._id],
      coverages: [collisionCov._id, comprehensiveCov._id, liabilityCov._id],
      status: 'active', startDate: enrollStart, endDate: enrollEnd, renewalDate: enrollEnd,
      premium: { amount: 3600 * 15, frequency: 'annual', employerShare: 3600 * 15 },
      paymentHistory: [{ amount: 3600*15, method: 'bank_transfer', status: 'completed', reference: 'REF-ET-AUTO-001', date: enrollStart }],
      notes: 'Fleet auto — Ethio Telecom'
    }
  ]);

  console.log('Created quotes and enrollments');

  // ─── CLAIMS ──────────────────────────────────────────────────────────────
  // All statuses: submitted, acknowledged, under_review, documentation_requested,
  // investigation, assessment, pending_finance_approval, approved, partially_approved,
  // denied, payment_initiated, settled, closed

  const allIPs = [demoIP, ...ipRecords];
  const enrollments = [etEnroll, cbeEnroll, airEnroll, aauEnroll, etAutoEnroll];

  const claimSeeds = [
    // 1. submitted — fresh, unacknowledged
    {
      ip: demoIP._id, enroll: etEnroll._id, provider: null,
      submittedBy: insuredDemo._id, submissionType: 'insured_reimbursement',
      claimType: 'inpatient', status: 'submitted', priority: 'high',
      incidentDate: daysAgo(2),
      description: 'Emergency appendectomy. Admitted for 3 nights at St. Gabriel.',
      diagnosis: 'Acute appendicitis (K35.89)',
      services: [
        { name: 'Emergency Admission', quantity: 1, unitPrice: 2000,  totalAmount: 2000  },
        { name: 'Appendectomy Surgery', quantity: 1, unitPrice: 45000, totalAmount: 45000 },
        { name: 'Ward (3 nights)',      quantity: 3, unitPrice: 3500,  totalAmount: 10500 },
        { name: 'Medications',         quantity: 1, unitPrice: 4200,  totalAmount: 4200  },
      ],
      claimedAmount: 61700,
      statusHistory: [{ status: 'submitted', changedBy: insuredDemo._id, timestamp: daysAgo(2) }]
    },
    // 2. submitted — provider direct
    {
      ip: etIP2._id, enroll: etEnroll._id, provider: stGabriel._id,
      submittedBy: stGabrielUser._id, submissionType: 'provider_direct',
      claimType: 'outpatient', status: 'submitted', priority: 'medium',
      incidentDate: daysAgo(1),
      description: 'Outpatient consultation for hypertension management.',
      diagnosis: 'Essential hypertension (I10)',
      services: [
        { name: 'Specialist Consultation', quantity: 1, unitPrice: 700,  totalAmount: 700  },
        { name: 'ECG',                     quantity: 1, unitPrice: 1200, totalAmount: 1200 },
        { name: 'Medications (1 month)',   quantity: 1, unitPrice: 1800, totalAmount: 1800 },
      ],
      claimedAmount: 3700,
      statusHistory: [{ status: 'submitted', changedBy: stGabrielUser._id, timestamp: daysAgo(1) }]
    },
    // 3. acknowledged
    {
      ip: etIP1._id, enroll: etEnroll._id, provider: null,
      submittedBy: ipUsers[0]._id, submissionType: 'insured_reimbursement',
      claimType: 'outpatient', status: 'acknowledged', priority: 'medium',
      incidentDate: daysAgo(5),
      description: 'Annual check-up and blood tests.',
      diagnosis: 'Routine health screening',
      services: [
        { name: 'GP Consultation',    quantity: 1, unitPrice: 350,  totalAmount: 350  },
        { name: 'Full Blood Count',   quantity: 1, unitPrice: 800,  totalAmount: 800  },
        { name: 'Urinalysis',         quantity: 1, unitPrice: 300,  totalAmount: 300  },
      ],
      claimedAmount: 1450,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[0]._id,   timestamp: daysAgo(5) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(4) }
      ]
    },
    // 4. under_review
    {
      ip: cbeIP1._id, enroll: cbeEnroll._id, provider: blackLion._id,
      submittedBy: blackLionUser._id, submissionType: 'provider_direct',
      claimType: 'inpatient', status: 'under_review', priority: 'high',
      incidentDate: monthsAgo(1, 25),
      description: 'Cardiac evaluation and angioplasty procedure.',
      diagnosis: 'Coronary artery disease (I25.10)',
      services: [
        { name: 'Cardiology Consultation', quantity: 1, unitPrice: 1000,  totalAmount: 1000  },
        { name: 'Coronary Angiography',    quantity: 1, unitPrice: 22000, totalAmount: 22000 },
        { name: 'Angioplasty',             quantity: 1, unitPrice: 65000, totalAmount: 65000 },
        { name: 'Inpatient (4 nights)',    quantity: 4, unitPrice: 5000,  totalAmount: 20000 },
        { name: 'Medications',            quantity: 1, unitPrice: 8500,  totalAmount: 8500  },
      ],
      claimedAmount: 116500,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: blackLionUser._id,  timestamp: daysAgo(10) },
        { status: 'acknowledged', changedBy: claimsOfficer._id,  timestamp: daysAgo(9) },
        { status: 'under_review', changedBy: claimsOfficer._id,  timestamp: daysAgo(7) }
      ],
      notes: [{ author: claimsOfficer._id, content: 'Large claim. Requesting additional documentation.', isInternal: true }]
    },
    // 5. documentation_requested
    {
      ip: airIP1._id, enroll: airEnroll._id, provider: null,
      submittedBy: ipUsers[18]._id, submissionType: 'insured_reimbursement',
      claimType: 'inpatient', status: 'documentation_requested', priority: 'medium',
      incidentDate: monthsAgo(1, 28),
      description: 'Surgery for torn ACL after sporting injury.',
      diagnosis: 'ACL rupture (S83.511)',
      services: [
        { name: 'Orthopedic Consultation', quantity: 1, unitPrice: 800,  totalAmount: 800  },
        { name: 'MRI Knee',               quantity: 1, unitPrice: 6500, totalAmount: 6500 },
        { name: 'ACL Reconstruction',     quantity: 1, unitPrice: 55000,totalAmount: 55000},
        { name: 'Physiotherapy (6 sessions)', quantity: 6, unitPrice: 1200, totalAmount: 7200 },
      ],
      claimedAmount: 69500,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',                changedBy: ipUsers[18]._id,    timestamp: daysAgo(12) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id,  timestamp: daysAgo(11) },
        { status: 'under_review',             changedBy: claimsOfficer._id,  timestamp: daysAgo(10) },
        { status: 'documentation_requested',  changedBy: claimsOfficer._id,  timestamp: daysAgo(8), reason: 'Please submit original hospital bills and surgical team certificate.' }
      ]
    },
    // 6. investigation
    {
      ip: cbeIP2._id, enroll: cbeEnroll._id, provider: null,
      submittedBy: ipUsers[11]._id, submissionType: 'insured_reimbursement',
      claimType: 'inpatient', status: 'investigation', priority: 'urgent',
      incidentDate: monthsAgo(2, 3),
      description: 'Claimed hospitalization for spinal disc surgery.',
      diagnosis: 'Lumbar disc herniation (M51.16)',
      services: [
        { name: 'Neurosurgery Consultation', quantity: 1, unitPrice: 1200,  totalAmount: 1200  },
        { name: 'Lumbar Microdiscectomy',    quantity: 1, unitPrice: 90000, totalAmount: 90000 },
        { name: 'Inpatient (5 nights)',      quantity: 5, unitPrice: 4500,  totalAmount: 22500 },
        { name: 'Rehabilitation (10 sessions)', quantity: 10, unitPrice: 1500, totalAmount: 15000 },
      ],
      claimedAmount: 128700,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[11]._id,   timestamp: daysAgo(20) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(19) },
        { status: 'under_review', changedBy: claimsOfficer._id, timestamp: daysAgo(17) },
        { status: 'investigation',changedBy: claimsOfficer._id, timestamp: daysAgo(14), reason: 'Inconsistency in dates. Contacting hospital directly.' }
      ],
      notes: [{ author: claimsOfficer._id, content: 'Invoice date does not match admission date. Hospital contacted for clarification.', isInternal: true }]
    },
    // 7. assessment
    {
      ip: aauIP1._id, enroll: aauEnroll._id, provider: stGabriel._id,
      submittedBy: stGabrielUser._id, submissionType: 'provider_direct',
      claimType: 'outpatient', status: 'assessment', priority: 'medium',
      incidentDate: daysAgo(8),
      description: 'Type 2 diabetes management, quarterly check-up.',
      diagnosis: 'Type 2 Diabetes mellitus (E11)',
      services: [
        { name: 'Specialist Consultation',  quantity: 1, unitPrice: 700,  totalAmount: 700  },
        { name: 'HbA1c Test',              quantity: 1, unitPrice: 800,  totalAmount: 800  },
        { name: 'Lipid Panel',             quantity: 1, unitPrice: 650,  totalAmount: 650  },
        { name: 'Medications (3 months)',  quantity: 1, unitPrice: 3200, totalAmount: 3200 },
      ],
      claimedAmount: 5350,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: stGabrielUser._id, timestamp: daysAgo(8) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(7) },
        { status: 'under_review', changedBy: claimsOfficer._id, timestamp: daysAgo(6) },
        { status: 'assessment',   changedBy: claimsOfficer._id, timestamp: daysAgo(5) }
      ]
    },
    // 8. pending_finance_approval
    {
      ip: etIP3._id, enroll: etEnroll._id, provider: stGabriel._id,
      submittedBy: stGabrielUser._id, submissionType: 'provider_direct',
      claimType: 'inpatient', status: 'pending_finance_approval', priority: 'high',
      incidentDate: monthsAgo(1, 20),
      description: 'Maternity — normal delivery with 3-night stay.',
      diagnosis: 'Normal delivery (O80)',
      services: [
        { name: 'Antenatal Checkup x4', quantity: 4, unitPrice: 500,  totalAmount: 2000  },
        { name: 'Delivery Suite',       quantity: 1, unitPrice: 8000, totalAmount: 8000  },
        { name: 'Postnatal Ward (3n)',  quantity: 3, unitPrice: 3500, totalAmount: 10500 },
        { name: 'Newborn Screening',    quantity: 1, unitPrice: 2000, totalAmount: 2000  },
      ],
      claimedAmount: 22500,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',                changedBy: stGabrielUser._id, timestamp: daysAgo(18) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id, timestamp: daysAgo(17) },
        { status: 'under_review',             changedBy: claimsOfficer._id, timestamp: daysAgo(15) },
        { status: 'assessment',               changedBy: claimsOfficer._id, timestamp: daysAgo(12) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id, timestamp: daysAgo(10), reason: 'Reviewed. Sending to finance for payment authorization.' }
      ]
    },
    // 9. pending_finance_approval — auto
    {
      ip: demoIP._id, enroll: etAutoEnroll._id, provider: autoFix._id,
      submittedBy: insuredDemo._id, submissionType: 'insured_reimbursement',
      claimType: 'auto_accident', status: 'pending_finance_approval', priority: 'medium',
      incidentDate: daysAgo(22),
      description: 'Side collision on Meskel Square junction. Left side damage.',
      services: [
        { name: 'Damage Assessment',    quantity: 1, unitPrice: 2000,  totalAmount: 2000  },
        { name: 'Left Door Replacement',quantity: 1, unitPrice: 16000, totalAmount: 16000 },
        { name: 'Body Repair & Paint',  quantity: 1, unitPrice: 12000, totalAmount: 12000 },
        { name: 'Glass Replacement',    quantity: 2, unitPrice: 3500,  totalAmount: 7000  },
      ],
      claimedAmount: 37000,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',                changedBy: insuredDemo._id,   timestamp: daysAgo(22) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id, timestamp: daysAgo(21) },
        { status: 'under_review',             changedBy: claimsOfficer._id, timestamp: daysAgo(19) },
        { status: 'assessment',               changedBy: claimsOfficer._id, timestamp: daysAgo(16) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id, timestamp: daysAgo(13) }
      ]
    },
    // 10. approved
    {
      ip: cbeIP3._id, enroll: cbeEnroll._id, provider: null,
      submittedBy: ipUsers[12]._id, submissionType: 'insured_reimbursement',
      claimType: 'dental', status: 'approved', priority: 'low',
      incidentDate: daysAgo(25),
      description: 'Dental extraction and root canal treatment.',
      diagnosis: 'Dental caries and periapical abscess (K02, K04)',
      services: [
        { name: 'Dental Consultation',  quantity: 1, unitPrice: 400,  totalAmount: 400  },
        { name: 'X-ray (3 views)',      quantity: 3, unitPrice: 300,  totalAmount: 900  },
        { name: 'Root Canal Treatment', quantity: 1, unitPrice: 3500, totalAmount: 3500 },
        { name: 'Extraction (2 teeth)', quantity: 2, unitPrice: 800,  totalAmount: 1600 },
        { name: 'Antibiotics',          quantity: 1, unitPrice: 450,  totalAmount: 450  },
      ],
      claimedAmount: 6850, approvedAmount: 6200,
      assignedOfficer: claimsOfficer._id,
      financeApproval: {
        approvedBy: financeOfficer._id, approvedAt: daysAgo(5),
        notes: 'Approved. Dental limit applied. Copayment 20% deducted.'
      },
      statusHistory: [
        { status: 'submitted',                changedBy: ipUsers[12]._id,   timestamp: daysAgo(25) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id, timestamp: daysAgo(24) },
        { status: 'under_review',             changedBy: claimsOfficer._id, timestamp: daysAgo(22) },
        { status: 'assessment',               changedBy: claimsOfficer._id, timestamp: daysAgo(20) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id, timestamp: daysAgo(15) },
        { status: 'approved',                 changedBy: financeOfficer._id, timestamp: daysAgo(5) }
      ]
    },
    // 11. approved — optical
    {
      ip: airIP2._id, enroll: airEnroll._id, provider: null,
      submittedBy: ipUsers[19]._id, submissionType: 'insured_reimbursement',
      claimType: 'optical', status: 'approved', priority: 'low',
      incidentDate: daysAgo(30),
      description: 'Annual eye test and prescription glasses.',
      diagnosis: 'Myopia (H52.1)',
      services: [
        { name: 'Eye Examination',  quantity: 1, unitPrice: 500,  totalAmount: 500  },
        { name: 'Prescription Lenses (pair)', quantity: 1, unitPrice: 2800, totalAmount: 2800 },
        { name: 'Frame',            quantity: 1, unitPrice: 1200, totalAmount: 1200 },
      ],
      claimedAmount: 4500, approvedAmount: 4500,
      assignedOfficer: claimsOfficer._id,
      financeApproval: { approvedBy: financeOfficer._id, approvedAt: daysAgo(10), notes: 'Full approval within optical limit.' },
      statusHistory: [
        { status: 'submitted',                changedBy: ipUsers[19]._id,   timestamp: daysAgo(30) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id, timestamp: daysAgo(29) },
        { status: 'under_review',             changedBy: claimsOfficer._id, timestamp: daysAgo(27) },
        { status: 'assessment',               changedBy: claimsOfficer._id, timestamp: daysAgo(25) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id, timestamp: daysAgo(18) },
        { status: 'approved',                 changedBy: financeOfficer._id, timestamp: daysAgo(10) }
      ]
    },
    // 12. partially_approved
    {
      ip: cbeIP4._id, enroll: cbeEnroll._id, provider: blackLion._id,
      submittedBy: blackLionUser._id, submissionType: 'provider_direct',
      claimType: 'inpatient', status: 'partially_approved', priority: 'high',
      incidentDate: daysAgo(35),
      description: 'Oncology treatment — chemotherapy cycle 1.',
      diagnosis: 'Breast cancer stage II (C50)',
      services: [
        { name: 'Oncology Consultation',  quantity: 1, unitPrice: 1200,  totalAmount: 1200  },
        { name: 'Chemotherapy (cycle 1)', quantity: 1, unitPrice: 85000, totalAmount: 85000 },
        { name: 'Inpatient (3 nights)',   quantity: 3, unitPrice: 5000,  totalAmount: 15000 },
        { name: 'Anti-nausea meds',       quantity: 1, unitPrice: 4500,  totalAmount: 4500  },
      ],
      claimedAmount: 105700, approvedAmount: 80000,
      assignedOfficer: claimsOfficer._id,
      financeApproval: {
        approvedBy: financeOfficer._id, approvedAt: daysAgo(8),
        notes: 'Partially approved. Annual inpatient limit reached. ETB 80,000 authorized.'
      },
      statusHistory: [
        { status: 'submitted',                changedBy: blackLionUser._id,  timestamp: daysAgo(35) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id,  timestamp: daysAgo(34) },
        { status: 'under_review',             changedBy: claimsOfficer._id,  timestamp: daysAgo(32) },
        { status: 'assessment',               changedBy: claimsOfficer._id,  timestamp: daysAgo(28) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id,  timestamp: daysAgo(20) },
        { status: 'partially_approved',       changedBy: financeOfficer._id, timestamp: daysAgo(8) }
      ]
    },
    // 13. denied
    {
      ip: etIP4._id, enroll: etEnroll._id, provider: null,
      submittedBy: ipUsers[3]._id, submissionType: 'insured_reimbursement',
      claimType: 'inpatient', status: 'denied', priority: 'medium',
      incidentDate: daysAgo(40),
      description: 'Cosmetic rhinoplasty surgery.',
      diagnosis: 'Cosmetic procedure (Z41.1)',
      services: [
        { name: 'Plastic Surgery Consultation', quantity: 1, unitPrice: 1500,  totalAmount: 1500  },
        { name: 'Rhinoplasty',                  quantity: 1, unitPrice: 75000, totalAmount: 75000 },
        { name: 'Anesthesia',                   quantity: 1, unitPrice: 8000,  totalAmount: 8000  },
      ],
      claimedAmount: 84500,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[3]._id,    timestamp: daysAgo(40) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(39) },
        { status: 'under_review', changedBy: claimsOfficer._id, timestamp: daysAgo(37) },
        { status: 'denied',       changedBy: claimsOfficer._id, timestamp: daysAgo(34), reason: 'Cosmetic procedures are excluded from policy coverage.' }
      ],
      resolution: 'Denied — cosmetic procedure not covered per policy Section 4.3.'
    },
    // 14. denied — duplicate claim
    {
      ip: aauIP2._id, enroll: aauEnroll._id, provider: null,
      submittedBy: ipUsers[26]._id, submissionType: 'insured_reimbursement',
      claimType: 'outpatient', status: 'denied', priority: 'low',
      incidentDate: daysAgo(50),
      description: 'Outpatient visit — suspected duplicate of previous claim.',
      diagnosis: 'Upper respiratory tract infection (J06)',
      services: [
        { name: 'GP Consultation', quantity: 1, unitPrice: 350, totalAmount: 350 },
        { name: 'Medications',     quantity: 1, unitPrice: 650, totalAmount: 650 },
      ],
      claimedAmount: 1000,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[26]._id,   timestamp: daysAgo(50) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(49) },
        { status: 'under_review', changedBy: claimsOfficer._id, timestamp: daysAgo(48) },
        { status: 'denied',       changedBy: claimsOfficer._id, timestamp: daysAgo(46), reason: 'Duplicate claim. Already processed under CLM-2026-00XX.' }
      ],
      resolution: 'Denied — duplicate submission.'
    },
    // 15. payment_initiated
    {
      ip: etIP5._id, enroll: etEnroll._id, provider: null,
      submittedBy: ipUsers[4]._id, submissionType: 'insured_reimbursement',
      claimType: 'inpatient', status: 'payment_initiated', priority: 'high',
      incidentDate: daysAgo(45),
      description: 'Cholecystectomy (gallbladder removal) surgery.',
      diagnosis: 'Cholelithiasis with acute cholecystitis (K80.00)',
      services: [
        { name: 'Surgery Consultation', quantity: 1, unitPrice: 800,   totalAmount: 800   },
        { name: 'Ultrasound Abdomen',   quantity: 1, unitPrice: 2500,  totalAmount: 2500  },
        { name: 'Laparoscopic Chole.', quantity: 1, unitPrice: 42000, totalAmount: 42000 },
        { name: 'Inpatient (2 nights)', quantity: 2, unitPrice: 3500,  totalAmount: 7000  },
        { name: 'Medications',          quantity: 1, unitPrice: 3200,  totalAmount: 3200  },
      ],
      claimedAmount: 55500, approvedAmount: 52000, settlementAmount: 52000,
      assignedOfficer: claimsOfficer._id,
      financeApproval: {
        approvedBy: financeOfficer._id, approvedAt: daysAgo(5),
        notes: 'Approved. Deductible ETB 3,500 applied.'
      },
      statusHistory: [
        { status: 'submitted',                changedBy: ipUsers[4]._id,    timestamp: daysAgo(45) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id, timestamp: daysAgo(44) },
        { status: 'under_review',             changedBy: claimsOfficer._id, timestamp: daysAgo(42) },
        { status: 'assessment',               changedBy: claimsOfficer._id, timestamp: daysAgo(38) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id, timestamp: daysAgo(25) },
        { status: 'approved',                 changedBy: financeOfficer._id, timestamp: daysAgo(5) },
        { status: 'payment_initiated',        changedBy: financeOfficer._id, timestamp: daysAgo(2), reason: 'Bank transfer initiated. Ref: PAY-ET-2026-008' }
      ]
    },
    // 16. settled
    {
      ip: etIP3._id, enroll: etAutoEnroll._id, provider: autoFix._id,
      submittedBy: ipUsers[2]._id, submissionType: 'insured_reimbursement',
      claimType: 'auto_accident', status: 'settled', priority: 'high',
      incidentDate: daysAgo(60),
      description: 'Rear-end collision on Bole Road. Rear bumper and trunk damage.',
      services: [
        { name: 'Repair Assessment',       quantity: 1, unitPrice: 2000,  totalAmount: 2000  },
        { name: 'Rear Bumper Replacement', quantity: 1, unitPrice: 18000, totalAmount: 18000 },
        { name: 'Trunk Repair & Paint',    quantity: 1, unitPrice: 12000, totalAmount: 12000 },
      ],
      claimedAmount: 32000, approvedAmount: 29000, settlementAmount: 29000,
      assignedOfficer: claimsOfficer._id,
      financeApproval: {
        approvedBy: financeOfficer._id, approvedAt: daysAgo(30),
        notes: 'Approved. Deductible ETB 3,000.'
      },
      resolution: 'Settled ETB 29,000 via bank transfer.',
      statusHistory: [
        { status: 'submitted',                changedBy: ipUsers[2]._id,    timestamp: daysAgo(60) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id, timestamp: daysAgo(59) },
        { status: 'under_review',             changedBy: claimsOfficer._id, timestamp: daysAgo(57) },
        { status: 'assessment',               changedBy: claimsOfficer._id, timestamp: daysAgo(52) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id, timestamp: daysAgo(40) },
        { status: 'approved',                 changedBy: financeOfficer._id, timestamp: daysAgo(30) },
        { status: 'payment_initiated',        changedBy: financeOfficer._id, timestamp: daysAgo(25) },
        { status: 'settled',                  changedBy: financeOfficer._id, timestamp: daysAgo(20), reason: 'Payment confirmed by insured.' }
      ]
    },
    // 17. settled — health
    {
      ip: cbeIP5._id, enroll: cbeEnroll._id, provider: stGabriel._id,
      submittedBy: stGabrielUser._id, submissionType: 'provider_direct',
      claimType: 'inpatient', status: 'settled', priority: 'medium',
      incidentDate: daysAgo(55),
      description: 'Appendicitis emergency — laparoscopic surgery.',
      diagnosis: 'Acute appendicitis (K35.89)',
      services: [
        { name: 'Emergency Assessment',    quantity: 1, unitPrice: 2000,  totalAmount: 2000  },
        { name: 'Laparoscopic Appendix.',  quantity: 1, unitPrice: 38000, totalAmount: 38000 },
        { name: 'Inpatient (2 nights)',    quantity: 2, unitPrice: 3500,  totalAmount: 7000  },
        { name: 'Medications',             quantity: 1, unitPrice: 3500,  totalAmount: 3500  },
      ],
      claimedAmount: 50500, approvedAmount: 50000, settlementAmount: 50000,
      assignedOfficer: claimsOfficer._id,
      financeApproval: { approvedBy: financeOfficer._id, approvedAt: daysAgo(25), notes: 'Approved.' },
      resolution: 'Settled ETB 50,000. Direct payment to hospital.',
      statusHistory: [
        { status: 'submitted',                changedBy: stGabrielUser._id,  timestamp: daysAgo(55) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id,  timestamp: daysAgo(54) },
        { status: 'under_review',             changedBy: claimsOfficer._id,  timestamp: daysAgo(52) },
        { status: 'assessment',               changedBy: claimsOfficer._id,  timestamp: daysAgo(48) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id,  timestamp: daysAgo(38) },
        { status: 'approved',                 changedBy: financeOfficer._id, timestamp: daysAgo(25) },
        { status: 'payment_initiated',        changedBy: financeOfficer._id, timestamp: daysAgo(20) },
        { status: 'settled',                  changedBy: financeOfficer._id, timestamp: daysAgo(15) }
      ]
    },
    // 18. closed
    {
      ip: airIP3._id, enroll: airEnroll._id, provider: null,
      submittedBy: ipUsers[20]._id, submissionType: 'insured_reimbursement',
      claimType: 'outpatient', status: 'closed', priority: 'low',
      incidentDate: daysAgo(90),
      description: 'Physiotherapy sessions for lower back pain.',
      diagnosis: 'Non-specific low back pain (M54.5)',
      services: [
        { name: 'Physiotherapy (8 sessions)', quantity: 8, unitPrice: 1200, totalAmount: 9600 },
        { name: 'GP Consultation',            quantity: 1, unitPrice: 350,  totalAmount: 350  },
      ],
      claimedAmount: 9950, approvedAmount: 9500, settlementAmount: 9500,
      assignedOfficer: claimsOfficer._id,
      financeApproval: { approvedBy: financeOfficer._id, approvedAt: daysAgo(65), notes: 'Approved.' },
      resolution: 'Settled and closed.',
      statusHistory: [
        { status: 'submitted',                changedBy: ipUsers[20]._id,   timestamp: daysAgo(90) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id, timestamp: daysAgo(89) },
        { status: 'under_review',             changedBy: claimsOfficer._id, timestamp: daysAgo(87) },
        { status: 'assessment',               changedBy: claimsOfficer._id, timestamp: daysAgo(82) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id, timestamp: daysAgo(78) },
        { status: 'approved',                 changedBy: financeOfficer._id, timestamp: daysAgo(65) },
        { status: 'payment_initiated',        changedBy: financeOfficer._id, timestamp: daysAgo(62) },
        { status: 'settled',                  changedBy: financeOfficer._id, timestamp: daysAgo(58) },
        { status: 'closed',                   changedBy: claimsOfficer._id, timestamp: daysAgo(45), reason: 'Claim fully resolved. File closed.' }
      ]
    },
    // ─── Additional claims to fill out all statuses with volume ───────────
    // 19–28: more submitted/acknowledged/under_review
    {
      ip: cbeIP6._id, enroll: cbeEnroll._id, provider: null,
      submittedBy: ipUsers[15]._id, submissionType: 'insured_reimbursement',
      claimType: 'outpatient', status: 'submitted', priority: 'low',
      incidentDate: daysAgo(1),
      description: 'Dermatology consultation for skin rash.',
      services: [{ name: 'Dermatology Consult', quantity: 1, unitPrice: 700, totalAmount: 700 }, { name: 'Topical Medications', quantity: 1, unitPrice: 850, totalAmount: 850 }],
      claimedAmount: 1550,
      statusHistory: [{ status: 'submitted', changedBy: ipUsers[15]._id, timestamp: daysAgo(1) }]
    },
    {
      ip: airIP4._id, enroll: airEnroll._id, provider: null,
      submittedBy: ipUsers[21]._id, submissionType: 'insured_reimbursement',
      claimType: 'outpatient', status: 'submitted', priority: 'medium',
      incidentDate: daysAgo(3),
      description: 'Hearing test and ENT consultation.',
      services: [{ name: 'ENT Consultation', quantity: 1, unitPrice: 700, totalAmount: 700 }, { name: 'Audiometry Test', quantity: 1, unitPrice: 1200, totalAmount: 1200 }],
      claimedAmount: 1900,
      statusHistory: [{ status: 'submitted', changedBy: ipUsers[21]._id, timestamp: daysAgo(3) }]
    },
    {
      ip: aauIP3._id, enroll: aauEnroll._id, provider: stGabriel._id,
      submittedBy: stGabrielUser._id, submissionType: 'provider_direct',
      claimType: 'outpatient', status: 'submitted', priority: 'low',
      incidentDate: daysAgo(2),
      description: 'Routine preventive health screen for over-45s.',
      services: [{ name: 'Comprehensive Screen', quantity: 1, unitPrice: 3500, totalAmount: 3500 }],
      claimedAmount: 3500,
      statusHistory: [{ status: 'submitted', changedBy: stGabrielUser._id, timestamp: daysAgo(2) }]
    },
    {
      ip: etIP6._id, enroll: etEnroll._id, provider: null,
      submittedBy: ipUsers[5]._id, submissionType: 'insured_reimbursement',
      claimType: 'dental', status: 'acknowledged', priority: 'low',
      incidentDate: daysAgo(6),
      description: 'Dental cleaning and fluoride treatment.',
      services: [{ name: 'Dental Cleaning', quantity: 1, unitPrice: 800, totalAmount: 800 }, { name: 'Fluoride Treatment', quantity: 1, unitPrice: 400, totalAmount: 400 }],
      claimedAmount: 1200,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[5]._id,    timestamp: daysAgo(6) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(5) }
      ]
    },
    {
      ip: cbeIP7._id, enroll: cbeEnroll._id, provider: null,
      submittedBy: ipUsers[16]._id, submissionType: 'insured_reimbursement',
      claimType: 'outpatient', status: 'acknowledged', priority: 'medium',
      incidentDate: daysAgo(7),
      description: 'Gynecology consultation and ultrasound.',
      services: [{ name: 'Gynecology Consult', quantity: 1, unitPrice: 700, totalAmount: 700 }, { name: 'Pelvic Ultrasound', quantity: 1, unitPrice: 2200, totalAmount: 2200 }],
      claimedAmount: 2900,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[16]._id,   timestamp: daysAgo(7) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(6) }
      ]
    },
    {
      ip: airIP5._id, enroll: airEnroll._id, provider: blackLion._id,
      submittedBy: blackLionUser._id, submissionType: 'provider_direct',
      claimType: 'inpatient', status: 'under_review', priority: 'urgent',
      incidentDate: daysAgo(9),
      description: 'Work-related injury — fracture of left forearm from equipment accident.',
      diagnosis: 'Closed fracture radius (S52.001)',
      services: [
        { name: 'Emergency Treatment', quantity: 1, unitPrice: 2000,  totalAmount: 2000  },
        { name: 'X-ray (2 views)',     quantity: 2, unitPrice: 800,   totalAmount: 1600  },
        { name: 'ORIF Procedure',      quantity: 1, unitPrice: 35000, totalAmount: 35000 },
        { name: 'Inpatient (1 night)', quantity: 1, unitPrice: 5000,  totalAmount: 5000  },
        { name: 'Physiotherapy x6',    quantity: 6, unitPrice: 1200,  totalAmount: 7200  },
      ],
      claimedAmount: 50800,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: blackLionUser._id,  timestamp: daysAgo(9) },
        { status: 'acknowledged', changedBy: claimsOfficer._id,  timestamp: daysAgo(8) },
        { status: 'under_review', changedBy: claimsOfficer._id,  timestamp: daysAgo(7) }
      ]
    },
    {
      ip: etIP7._id, enroll: etEnroll._id, provider: null,
      submittedBy: ipUsers[6]._id, submissionType: 'insured_reimbursement',
      claimType: 'inpatient', status: 'under_review', priority: 'high',
      incidentDate: daysAgo(11),
      description: 'C-section delivery at private hospital.',
      diagnosis: 'Caesarean section (O82)',
      services: [
        { name: 'Obstetric Consultation', quantity: 1, unitPrice: 700,   totalAmount: 700   },
        { name: 'C-Section Procedure',    quantity: 1, unitPrice: 32000, totalAmount: 32000 },
        { name: 'Inpatient (4 nights)',   quantity: 4, unitPrice: 3500,  totalAmount: 14000 },
        { name: 'Newborn Checkup',        quantity: 1, unitPrice: 1500,  totalAmount: 1500  },
      ],
      claimedAmount: 48200,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[6]._id,    timestamp: daysAgo(11) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(10) },
        { status: 'under_review', changedBy: claimsOfficer._id, timestamp: daysAgo(8) }
      ]
    },
    {
      ip: aauIP4._id, enroll: aauEnroll._id, provider: null,
      submittedBy: ipUsers[28]._id, submissionType: 'insured_reimbursement',
      claimType: 'outpatient', status: 'under_review', priority: 'low',
      incidentDate: daysAgo(14),
      description: 'Psychiatry consultation and therapy sessions.',
      diagnosis: 'Major depressive disorder (F32)',
      services: [
        { name: 'Psychiatry Consultation', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
        { name: 'CBT Sessions x4',         quantity: 4, unitPrice: 1500, totalAmount: 6000 },
        { name: 'Antidepressants',         quantity: 1, unitPrice: 1800, totalAmount: 1800 },
      ],
      claimedAmount: 8800,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[28]._id,   timestamp: daysAgo(14) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(13) },
        { status: 'under_review', changedBy: claimsOfficer._id, timestamp: daysAgo(11) }
      ]
    },
    // 27 — investigation
    {
      ip: cbeIP8._id, enroll: cbeEnroll._id, provider: null,
      submittedBy: ipUsers[17]._id, submissionType: 'insured_reimbursement',
      claimType: 'auto_accident', status: 'investigation', priority: 'urgent',
      incidentDate: daysAgo(28),
      description: 'Total loss claim — vehicle stolen from parking.',
      services: [
        { name: 'Vehicle Valuation',     quantity: 1, unitPrice: 2500,   totalAmount: 2500   },
        { name: 'Stolen Vehicle (total)',quantity: 1, unitPrice: 350000, totalAmount: 350000 },
      ],
      claimedAmount: 352500,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[17]._id,   timestamp: daysAgo(28) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(27) },
        { status: 'under_review', changedBy: claimsOfficer._id, timestamp: daysAgo(25) },
        { status: 'investigation',changedBy: claimsOfficer._id, timestamp: daysAgo(22), reason: 'High value claim. Awaiting police report and vehicle registration documents.' }
      ],
      notes: [{ author: claimsOfficer._id, content: 'Police case opened. OB number requested.', isInternal: true }]
    },
    // 28 — assessment
    {
      ip: airIP6._id, enroll: airEnroll._id, provider: stGabriel._id,
      submittedBy: stGabrielUser._id, submissionType: 'provider_direct',
      claimType: 'inpatient', status: 'assessment', priority: 'medium',
      incidentDate: daysAgo(16),
      description: 'Hernia repair surgery — inguinal hernia.',
      diagnosis: 'Inguinal hernia (K40.9)',
      services: [
        { name: 'Surgery Consultation',  quantity: 1, unitPrice: 800,   totalAmount: 800   },
        { name: 'Hernia Repair Surgery', quantity: 1, unitPrice: 28000, totalAmount: 28000 },
        { name: 'Inpatient (2 nights)',  quantity: 2, unitPrice: 3500,  totalAmount: 7000  },
        { name: 'Anesthesia',            quantity: 1, unitPrice: 5000,  totalAmount: 5000  },
      ],
      claimedAmount: 40800,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: stGabrielUser._id, timestamp: daysAgo(16) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(15) },
        { status: 'under_review', changedBy: claimsOfficer._id, timestamp: daysAgo(13) },
        { status: 'assessment',   changedBy: claimsOfficer._id, timestamp: daysAgo(10) }
      ]
    },
    // 29 — pending_finance_approval (another one)
    {
      ip: aauIP5._id, enroll: aauEnroll._id, provider: blackLion._id,
      submittedBy: blackLionUser._id, submissionType: 'provider_direct',
      claimType: 'inpatient', status: 'pending_finance_approval', priority: 'high',
      incidentDate: daysAgo(33),
      description: 'MRI-guided surgery for brain meningioma.',
      diagnosis: 'Meningioma (D32.0)',
      services: [
        { name: 'Neurosurgery Consult',  quantity: 1, unitPrice: 1500,  totalAmount: 1500  },
        { name: 'Brain MRI',             quantity: 1, unitPrice: 10000, totalAmount: 10000 },
        { name: 'Craniotomy Procedure',  quantity: 1, unitPrice: 95000, totalAmount: 95000 },
        { name: 'ICU (3 nights)',        quantity: 3, unitPrice: 12000, totalAmount: 36000 },
        { name: 'Ward (5 nights)',       quantity: 5, unitPrice: 5000,  totalAmount: 25000 },
        { name: 'Medications',           quantity: 1, unitPrice: 12000, totalAmount: 12000 },
      ],
      claimedAmount: 179500,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',                changedBy: blackLionUser._id,  timestamp: daysAgo(33) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id,  timestamp: daysAgo(32) },
        { status: 'under_review',             changedBy: claimsOfficer._id,  timestamp: daysAgo(30) },
        { status: 'assessment',               changedBy: claimsOfficer._id,  timestamp: daysAgo(26) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id,  timestamp: daysAgo(22) }
      ]
    },
    // 30–35: More settled/approved/closed for history
    {
      ip: etIP8._id, enroll: etEnroll._id, provider: null,
      submittedBy: ipUsers[7]._id, submissionType: 'insured_reimbursement',
      claimType: 'outpatient', status: 'settled', priority: 'low',
      incidentDate: daysAgo(70),
      description: 'Annual medical checkup and vaccinations.',
      services: [{ name: 'Comprehensive Health Screen', quantity: 1, unitPrice: 4500, totalAmount: 4500 }, { name: 'Flu Vaccine', quantity: 1, unitPrice: 800, totalAmount: 800 }],
      claimedAmount: 5300, approvedAmount: 5300, settlementAmount: 5300,
      financeApproval: { approvedBy: financeOfficer._id, approvedAt: daysAgo(50), notes: 'Approved.' },
      resolution: 'Settled.',
      statusHistory: [
        { status: 'submitted',                changedBy: ipUsers[7]._id,    timestamp: daysAgo(70) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id, timestamp: daysAgo(69) },
        { status: 'under_review',             changedBy: claimsOfficer._id, timestamp: daysAgo(67) },
        { status: 'assessment',               changedBy: claimsOfficer._id, timestamp: daysAgo(63) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id, timestamp: daysAgo(58) },
        { status: 'approved',                 changedBy: financeOfficer._id, timestamp: daysAgo(50) },
        { status: 'payment_initiated',        changedBy: financeOfficer._id, timestamp: daysAgo(48) },
        { status: 'settled',                  changedBy: financeOfficer._id, timestamp: daysAgo(45) }
      ]
    },
    {
      ip: etIP9._id, enroll: etEnroll._id, provider: stGabriel._id,
      submittedBy: stGabrielUser._id, submissionType: 'provider_direct',
      claimType: 'inpatient', status: 'settled', priority: 'medium',
      incidentDate: daysAgo(75),
      description: 'Knee replacement surgery — osteoarthritis.',
      diagnosis: 'Severe osteoarthritis knee (M17.11)',
      services: [
        { name: 'Orthopedic Consult',   quantity: 1, unitPrice: 800,   totalAmount: 800   },
        { name: 'Knee Replacement',     quantity: 1, unitPrice: 75000, totalAmount: 75000 },
        { name: 'Inpatient (5 nights)', quantity: 5, unitPrice: 3500,  totalAmount: 17500 },
        { name: 'Physiotherapy x8',     quantity: 8, unitPrice: 1200,  totalAmount: 9600  },
      ],
      claimedAmount: 102900, approvedAmount: 80000, settlementAmount: 80000,
      financeApproval: { approvedBy: financeOfficer._id, approvedAt: daysAgo(40), notes: 'Partially approved. Annual limit reached.' },
      resolution: 'Partially settled — ETB 80,000 (annual limit).',
      statusHistory: [
        { status: 'submitted',                changedBy: stGabrielUser._id,  timestamp: daysAgo(75) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id,  timestamp: daysAgo(74) },
        { status: 'under_review',             changedBy: claimsOfficer._id,  timestamp: daysAgo(72) },
        { status: 'assessment',               changedBy: claimsOfficer._id,  timestamp: daysAgo(68) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id,  timestamp: daysAgo(55) },
        { status: 'partially_approved',       changedBy: financeOfficer._id, timestamp: daysAgo(40) },
        { status: 'payment_initiated',        changedBy: financeOfficer._id, timestamp: daysAgo(38) },
        { status: 'settled',                  changedBy: financeOfficer._id, timestamp: daysAgo(35) }
      ]
    },
    {
      ip: cbeIP1._id, enroll: cbeEnroll._id, provider: null,
      submittedBy: ipUsers[10]._id, submissionType: 'insured_reimbursement',
      claimType: 'dental', status: 'closed', priority: 'low',
      incidentDate: daysAgo(100),
      description: 'Full dental restoration — crowns on 3 teeth.',
      services: [
        { name: 'Dental X-rays',       quantity: 4, unitPrice: 300,  totalAmount: 1200  },
        { name: 'Crown Placement x3',  quantity: 3, unitPrice: 4500, totalAmount: 13500 },
        { name: 'Follow-up',           quantity: 1, unitPrice: 300,  totalAmount: 300   },
      ],
      claimedAmount: 15000, approvedAmount: 7500, settlementAmount: 7500,
      financeApproval: { approvedBy: financeOfficer._id, approvedAt: daysAgo(72), notes: 'Dental annual limit applied.' },
      resolution: 'Settled ETB 7,500. Dental annual limit reached. Closed.',
      statusHistory: [
        { status: 'submitted',                changedBy: ipUsers[10]._id,    timestamp: daysAgo(100) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id,  timestamp: daysAgo(99)  },
        { status: 'under_review',             changedBy: claimsOfficer._id,  timestamp: daysAgo(97)  },
        { status: 'assessment',               changedBy: claimsOfficer._id,  timestamp: daysAgo(92)  },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id,  timestamp: daysAgo(85)  },
        { status: 'partially_approved',       changedBy: financeOfficer._id, timestamp: daysAgo(72)  },
        { status: 'payment_initiated',        changedBy: financeOfficer._id, timestamp: daysAgo(70)  },
        { status: 'settled',                  changedBy: financeOfficer._id, timestamp: daysAgo(65)  },
        { status: 'closed',                   changedBy: claimsOfficer._id,  timestamp: daysAgo(55), reason: 'Fully resolved.' }
      ]
    },
    {
      ip: airIP7._id, enroll: airEnroll._id, provider: autoFix._id,
      submittedBy: ipUsers[24]._id, submissionType: 'insured_reimbursement',
      claimType: 'auto_accident', status: 'closed', priority: 'medium',
      incidentDate: daysAgo(85),
      description: 'Front-end collision damage. Radiator, hood, and bumper.',
      services: [
        { name: 'Damage Assessment',    quantity: 1, unitPrice: 2000,  totalAmount: 2000  },
        { name: 'Hood Replacement',     quantity: 1, unitPrice: 14000, totalAmount: 14000 },
        { name: 'Radiator Replacement', quantity: 1, unitPrice: 18000, totalAmount: 18000 },
        { name: 'Front Bumper',         quantity: 1, unitPrice: 9000,  totalAmount: 9000  },
        { name: 'Repainting',           quantity: 1, unitPrice: 6000,  totalAmount: 6000  },
      ],
      claimedAmount: 49000, approvedAmount: 46000, settlementAmount: 46000,
      financeApproval: { approvedBy: financeOfficer._id, approvedAt: daysAgo(60), notes: 'Approved minus deductible ETB 3,000.' },
      resolution: 'Settled ETB 46,000. Closed.',
      statusHistory: [
        { status: 'submitted',                changedBy: ipUsers[24]._id,    timestamp: daysAgo(85) },
        { status: 'acknowledged',             changedBy: claimsOfficer._id,  timestamp: daysAgo(84) },
        { status: 'under_review',             changedBy: claimsOfficer._id,  timestamp: daysAgo(82) },
        { status: 'assessment',               changedBy: claimsOfficer._id,  timestamp: daysAgo(78) },
        { status: 'pending_finance_approval', changedBy: claimsOfficer._id,  timestamp: daysAgo(70) },
        { status: 'approved',                 changedBy: financeOfficer._id, timestamp: daysAgo(60) },
        { status: 'payment_initiated',        changedBy: financeOfficer._id, timestamp: daysAgo(58) },
        { status: 'settled',                  changedBy: financeOfficer._id, timestamp: daysAgo(55) },
        { status: 'closed',                   changedBy: claimsOfficer._id,  timestamp: daysAgo(40) }
      ]
    },
    // 36: denied — pre-existing condition
    {
      ip: etIP10._id, enroll: etEnroll._id, provider: null,
      submittedBy: ipUsers[9]._id, submissionType: 'insured_reimbursement',
      claimType: 'inpatient', status: 'denied', priority: 'high',
      incidentDate: daysAgo(42),
      description: 'Claimed hospitalization for chronic kidney failure.',
      diagnosis: 'Chronic kidney disease stage 4 (N18.4)',
      services: [
        { name: 'Nephrology Consult',     quantity: 1, unitPrice: 1000, totalAmount: 1000 },
        { name: 'Dialysis (10 sessions)', quantity: 10,unitPrice: 4500, totalAmount: 45000 },
        { name: 'Medications',            quantity: 1, unitPrice: 8000, totalAmount: 8000 },
      ],
      claimedAmount: 54000,
      assignedOfficer: claimsOfficer._id,
      statusHistory: [
        { status: 'submitted',    changedBy: ipUsers[9]._id,    timestamp: daysAgo(42) },
        { status: 'acknowledged', changedBy: claimsOfficer._id, timestamp: daysAgo(41) },
        { status: 'under_review', changedBy: claimsOfficer._id, timestamp: daysAgo(39) },
        { status: 'denied',       changedBy: claimsOfficer._id, timestamp: daysAgo(36), reason: 'Pre-existing condition declared at enrollment. Waiting period not yet elapsed.' }
      ],
      resolution: 'Denied — pre-existing condition exclusion (waiting period).'
    },
    // 37: urgent submitted (SLA breach test)
    {
      ip: cbeIP2._id, enroll: cbeEnroll._id, provider: null,
      submittedBy: ipUsers[11]._id, submissionType: 'insured_reimbursement',
      claimType: 'inpatient', status: 'submitted', priority: 'urgent',
      incidentDate: daysAgo(3),
      description: 'ICU admission — severe pneumonia. Still hospitalized.',
      diagnosis: 'Severe pneumonia (J18.0)',
      services: [
        { name: 'ICU Admission',      quantity: 1, unitPrice: 12000, totalAmount: 12000 },
        { name: 'ICU (3 nights est)', quantity: 3, unitPrice: 12000, totalAmount: 36000 },
        { name: 'Oxygen therapy',     quantity: 3, unitPrice: 3000,  totalAmount: 9000  },
        { name: 'IV Antibiotics',     quantity: 1, unitPrice: 7500,  totalAmount: 7500  },
      ],
      claimedAmount: 64500,
      statusHistory: [{ status: 'submitted', changedBy: ipUsers[11]._id, timestamp: daysAgo(3) }]
    },
  ];

  const createdClaims = await Claim.create(
    claimSeeds.map(c => ({
      insuredPerson: c.ip,
      enrollment: c.enroll,
      provider: c.provider || undefined,
      submittedBy: c.submittedBy,
      submissionType: c.submissionType,
      assignedOfficer: c.assignedOfficer || claimsOfficer._id,
      claimType: c.claimType,
      status: c.status,
      priority: c.priority,
      incidentDate: c.incidentDate,
      description: c.description,
      diagnosis: c.diagnosis || undefined,
      services: c.services || [],
      documents: [],
      claimedAmount: c.claimedAmount,
      approvedAmount: c.approvedAmount || undefined,
      settlementAmount: c.settlementAmount || undefined,
      financeApproval: c.financeApproval || undefined,
      resolution: c.resolution || undefined,
      statusHistory: c.statusHistory || [{ status: c.status, changedBy: c.submittedBy }],
      notes: c.notes || [],
    }))
  );

  console.log(`Created ${createdClaims.length} claims`);

  // ─── PAYMENTS ────────────────────────────────────────────────────────────
  const settledClaims = createdClaims.filter(c => ['settled','payment_initiated'].includes(c.status));

  await Payment.create([
    // Premium collections
    { type: 'premium_collection', direction: 'institution_to_payer', enrollment: etEnroll._id,  amount: 8400*120, status: 'completed', paymentMethod: 'bank_transfer', reference: 'REF-ET-2026-001',  initiatedBy: etHrUser._id,      approvedBy: financeOfficer._id, processedAt: enrollStart },
    { type: 'premium_collection', direction: 'institution_to_payer', enrollment: cbeEnroll._id, amount: 8400*450, status: 'completed', paymentMethod: 'bank_transfer', reference: 'REF-CBE-2026-001', initiatedBy: cbeHrUser._id,     approvedBy: financeOfficer._id, processedAt: enrollStart },
    { type: 'premium_collection', direction: 'institution_to_payer', enrollment: airEnroll._id, amount: 12000*800,status: 'completed', paymentMethod: 'bank_transfer', reference: 'REF-AIR-2026-001', initiatedBy: ethioAirHrUser._id,approvedBy: financeOfficer._id, processedAt: enrollStart },
    { type: 'premium_collection', direction: 'institution_to_payer', enrollment: aauEnroll._id, amount: 8400*280, status: 'completed', paymentMethod: 'bank_transfer', reference: 'REF-AAU-2026-001', initiatedBy: aauHrUser._id,     approvedBy: financeOfficer._id, processedAt: enrollStart },
    // Claim settlements for settled/payment_initiated claims
    ...settledClaims.map((c, i) => ({
      type: 'claim_settlement',
      direction: c.submissionType === 'provider_direct' ? 'payer_to_provider' : 'payer_to_insured',
      claim: c._id,
      enrollment: c.enrollment,
      amount: c.settlementAmount || c.approvedAmount || c.claimedAmount,
      status: c.status === 'settled' ? 'completed' : 'processing',
      paymentMethod: 'bank_transfer',
      reference: `REF-CLM-${(2026100 + i).toString()}`,
      initiatedBy: financeOfficer._id,
      approvedBy: financeOfficer._id,
      processedAt: c.status === 'settled' ? daysAgo(20) : undefined
    }))
  ]);

  console.log('Created payments');

  // ─── ASSIGN GROUPS TO INSURED PERSONS ────────────────────────────────────
  // Ethio Telecom
  await InsuredPerson.updateOne({ _id: demoIP._id },   { group: etEng._id });
  for (let i = 0; i < 10; i++) {
    const g = i < 2 ? etExec._id : i < 7 ? etEng._id : etOps._id;
    await InsuredPerson.updateOne({ _id: ipRecords[i]._id }, { group: g });
  }
  // CBE
  for (let i = 10; i < 18; i++) {
    const g = i < 12 ? cbeExec._id : cbeBranch._id;
    await InsuredPerson.updateOne({ _id: ipRecords[i]._id }, { group: g });
  }
  // Ethiopian Airlines
  for (let i = 18; i < 25; i++) {
    const g = i < 20 ? airExec._id : airCrew._id;
    await InsuredPerson.updateOne({ _id: ipRecords[i]._id }, { group: g });
  }
  // AAU
  for (let i = 25; i < 30; i++) {
    await InsuredPerson.updateOne({ _id: ipRecords[i]._id }, { group: aauFaculty._id });
  }

  console.log('\n========== SEED COMPLETE ==========');
  console.log(`\n  4 institutions | 6 providers | 36 insured persons (30 group + 3 individual + 3 broker-registered) | ${createdClaims.length} claims`);
  console.log('\nDemo Login Credentials:');
  console.log('─'.repeat(62));
  console.log('SUPER ADMIN');
  console.log('  admin@enterpriseinsurance.com          / Admin@123');
  console.log('\nPAYER STAFF');
  console.log('  payer.admin@enterpriseinsurance.com    / Payer@123       [Payer Admin]');
  console.log('  underwriter@enterpriseinsurance.com    / Under@123       [Underwriter]');
  console.log('  claims@enterpriseinsurance.com         / Claims@123      [Claims Officer]');
  console.log('  finance@enterpriseinsurance.com        / Finance@123     [Finance Officer]');
  console.log('\nPROVIDERS');
  console.log('  billing@stgabriel.com            / Provider@123    [St. Gabriel Hospital]');
  console.log('  billing@blacklion.gov.et         / Provider@123    [Black Lion Hospital]');
  console.log('\nINSTITUTION HR');
  console.log('  hr@ethiotelecom.et               / Institution@123 [Ethio Telecom HR]');
  console.log('  hr@cbe.com.et                    / Institution@123 [CBE HR]');
  console.log('  hr@ethiopianairlines.com         / Institution@123 [Ethiopian Airlines HR]');
  console.log('  hr@aau.edu.et                    / Institution@123 [AAU HR]');
  console.log('\nSALES BROKER');
  console.log('  broker@enterpriseinsurance.com   / Broker@123');
  console.log('\nINSURED PERSONS');
  console.log('  biruk@ethiotelecom.et            / Insured@123     [Institution employee — with claims]');
  console.log('  daniel.tesfaye@gmail.com         / Insured@123     [Self-registered individual]');
  console.log('  helen.girma@gmail.com            / Insured@123     [Self-registered individual]');
  console.log('  yonas.alemu@gmail.com            / Insured@123     [Self-registered individual]');
  console.log('  firehiwot.b@gmail.com            / Insured@123     [Broker-registered customer]');
  console.log('  muluken.t@gmail.com              / Insured@123     [Broker-registered customer]');
  console.log('  bethlehem.s@gmail.com            / Insured@123     [Broker-registered customer]');
  console.log('─'.repeat(62));

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
