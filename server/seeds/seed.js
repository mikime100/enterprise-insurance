require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const InsuranceProduct = require('../models/InsuranceProduct');
const Policy = require('../models/Policy');
const Claim = require('../models/Claim');
const Quote = require('../models/Quote');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise_insurance');
  console.log('Connected to MongoDB');

  await Promise.all([User, InsuranceProduct, Policy, Claim, Quote].map(m => m.deleteMany({})));
  console.log('Cleared existing data');

  // Users
  const users = await User.create([
    {
      firstName: 'System', lastName: 'Admin', email: 'admin@insurance.com',
      password: 'Admin@123', role: 'admin',
      phone: '555-000-0001',
    },
    {
      firstName: 'Sarah', lastName: 'Mitchell', email: 'sarah.agent@insurance.com',
      password: 'Agent@123', role: 'agent',
      phone: '555-000-0101', licenseNumber: 'AGT-001-2024',
    },
    {
      firstName: 'James', lastName: 'Carter', email: 'james.agent@insurance.com',
      password: 'Agent@123', role: 'agent',
      phone: '555-000-0102', licenseNumber: 'AGT-002-2024',
    },
    {
      firstName: 'Michael', lastName: 'Johnson', email: 'michael@customer.com',
      password: 'Customer@123', role: 'customer',
      phone: '555-111-0001', dateOfBirth: new Date('1985-03-15'),
      address: { street: '123 Oak Ave', city: 'Dallas', state: 'TX', zip: '75201' },
    },
    {
      firstName: 'Emily', lastName: 'Williams', email: 'emily@customer.com',
      password: 'Customer@123', role: 'customer',
      phone: '555-111-0002', dateOfBirth: new Date('1990-07-22'),
      address: { street: '456 Pine St', city: 'Austin', state: 'TX', zip: '78701' },
    },
    {
      firstName: 'Robert', lastName: 'Davis', email: 'robert@customer.com',
      password: 'Customer@123', role: 'customer',
      phone: '555-111-0003', dateOfBirth: new Date('1978-11-05'),
      address: { street: '789 Elm Blvd', city: 'Houston', state: 'TX', zip: '77001' },
    },
    {
      firstName: 'Jennifer', lastName: 'Taylor', email: 'jennifer@customer.com',
      password: 'Customer@123', role: 'customer',
      phone: '555-111-0004', dateOfBirth: new Date('1992-02-28'),
      address: { street: '321 Maple Dr', city: 'San Antonio', state: 'TX', zip: '78201' },
    },
    {
      firstName: 'David', lastName: 'Anderson', email: 'david@customer.com',
      password: 'Customer@123', role: 'customer',
      phone: '555-111-0005', dateOfBirth: new Date('1982-09-14'),
      address: { street: '654 Cedar Ln', city: 'Fort Worth', state: 'TX', zip: '76101' },
    },
  ]);

  const [admin, agent1, agent2, c1, c2, c3, c4, c5] = users;

  // Assign agents to customers
  await User.updateMany({ _id: { $in: [c1._id, c2._id, c3._id] } }, { assignedAgent: agent1._id });
  await User.updateMany({ _id: { $in: [c4._id, c5._id] } }, { assignedAgent: agent2._id });
  console.log('Created users');

  // Products
  const products = await InsuranceProduct.create([
    {
      name: 'Shield Auto', type: 'auto',
      description: 'Comprehensive auto coverage for individuals and families. Protect your vehicle against accidents, theft, and liability.',
      baseMonthlyPremium: 89,
      features: ['24/7 Roadside Assistance', 'Rental Car Coverage', 'New Car Replacement', 'Accident Forgiveness'],
      coverageOptions: [
        { name: 'Comprehensive', description: 'Covers non-collision damage including theft, weather, and vandalism', basePrice: 45, maxCoverage: 50000 },
        { name: 'Collision', description: 'Covers damage from collisions with other vehicles or objects', basePrice: 55, maxCoverage: 50000 },
        { name: 'Liability', description: 'Covers bodily injury and property damage to others', basePrice: 35, maxCoverage: 100000 },
        { name: 'Uninsured Motorist', description: 'Covers costs if hit by an uninsured driver', basePrice: 20, maxCoverage: 50000 },
      ],
    },
    {
      name: 'HomeGuard', type: 'home',
      description: 'Complete home protection covering structure, belongings, and liability for homeowners.',
      baseMonthlyPremium: 120,
      features: ['Guaranteed Replacement Cost', 'Identity Theft Protection', 'Home Business Coverage', 'Water Backup Coverage'],
      coverageOptions: [
        { name: 'Dwelling', description: 'Covers the physical structure of your home', basePrice: 60, maxCoverage: 500000 },
        { name: 'Personal Property', description: 'Covers your belongings inside the home', basePrice: 40, maxCoverage: 100000 },
        { name: 'Liability', description: 'Covers legal expenses if someone is injured on your property', basePrice: 30, maxCoverage: 300000 },
        { name: 'Additional Living Expenses', description: 'Covers hotel/rental costs if home is uninhabitable', basePrice: 25, maxCoverage: 50000 },
      ],
    },
    {
      name: 'LifeSecure', type: 'life',
      description: 'Flexible life insurance options to protect your family\'s financial future.',
      baseMonthlyPremium: 45,
      features: ['Flexible Beneficiary Designation', 'Policy Loan Option', 'Accelerated Death Benefit', 'Waiver of Premium'],
      coverageOptions: [
        { name: 'Term 10-Year', description: '10-year term life coverage', basePrice: 20, maxCoverage: 1000000 },
        { name: 'Term 20-Year', description: '20-year term life coverage', basePrice: 40, maxCoverage: 1000000 },
        { name: 'Whole Life', description: 'Permanent coverage with cash value component', basePrice: 120, maxCoverage: 500000 },
        { name: 'Accidental Death', description: 'Additional benefit for accidental death', basePrice: 15, maxCoverage: 250000 },
      ],
    },
    {
      name: 'HealthFirst', type: 'health',
      description: 'Comprehensive health insurance with wide network coverage and prescription benefits.',
      baseMonthlyPremium: 350,
      features: ['Nationwide Network', 'Preventive Care Covered', 'Mental Health Coverage', 'Telehealth Services'],
      coverageOptions: [
        { name: 'Individual Plan', description: 'Coverage for a single person', basePrice: 0, maxCoverage: 1000000 },
        { name: 'Family Plan', description: 'Coverage for the whole family (up to 5 members)', basePrice: 250, maxCoverage: 2000000 },
        { name: 'Dental & Vision', description: 'Add-on dental and vision coverage', basePrice: 45, maxCoverage: 10000 },
        { name: 'Prescription Drug', description: 'Enhanced prescription drug coverage', basePrice: 35, maxCoverage: 50000 },
      ],
    },
    {
      name: 'TravelShield', type: 'travel',
      description: 'Comprehensive travel protection for domestic and international trips.',
      baseMonthlyPremium: 25,
      features: ['Cancel for Any Reason', '24/7 Travel Assistance', 'Emergency Evacuation', 'Baggage Delay Coverage'],
      coverageOptions: [
        { name: 'Trip Cancellation', description: 'Reimburses non-refundable trip costs', basePrice: 10, maxCoverage: 10000 },
        { name: 'Travel Medical', description: 'Medical coverage while traveling', basePrice: 15, maxCoverage: 100000 },
        { name: 'Baggage Protection', description: 'Covers lost, stolen, or damaged luggage', basePrice: 8, maxCoverage: 2500 },
        { name: 'Flight Delay', description: 'Covers expenses for flight delays over 6 hours', basePrice: 5, maxCoverage: 500 },
      ],
    },
    {
      name: 'PetCare Plus', type: 'pet',
      description: 'Veterinary coverage for your beloved pets including accidents, illness, and wellness.',
      baseMonthlyPremium: 35,
      features: ['No Age Limit', 'Multi-Pet Discount', 'Alternative Therapy Coverage', 'Behavioral Treatment'],
      coverageOptions: [
        { name: 'Accident Only', description: 'Covers treatment for accidents and injuries', basePrice: 0, maxCoverage: 5000 },
        { name: 'Accident & Illness', description: 'Covers accidents and illnesses', basePrice: 25, maxCoverage: 15000 },
        { name: 'Wellness Care', description: 'Covers routine checkups and preventive care', basePrice: 20, maxCoverage: 500 },
        { name: 'Dental Care', description: 'Covers dental cleanings and procedures', basePrice: 15, maxCoverage: 2000 },
      ],
    },
    {
      name: 'BusinessPro', type: 'business',
      description: 'Complete business insurance package for small to mid-size enterprises.',
      baseMonthlyPremium: 200,
      features: ['Business Interruption Coverage', 'Cyber Liability', 'Professional Liability', 'Commercial Auto'],
      coverageOptions: [
        { name: 'General Liability', description: 'Covers third-party bodily injury and property damage', basePrice: 80, maxCoverage: 1000000 },
        { name: 'Commercial Property', description: 'Covers business equipment and property', basePrice: 70, maxCoverage: 500000 },
        { name: 'Workers Compensation', description: 'Covers employee injuries and illnesses', basePrice: 90, maxCoverage: 500000 },
        { name: 'Cyber Protection', description: 'Covers data breaches and cyber attacks', basePrice: 60, maxCoverage: 250000 },
      ],
    },
    {
      name: 'RentersShield', type: 'renters',
      description: 'Affordable renters insurance protecting your personal belongings and liability.',
      baseMonthlyPremium: 22,
      features: ['Electronics Coverage', 'Credit Card Fraud', 'Replacement Cost Value', 'Roommate Coverage Option'],
      coverageOptions: [
        { name: 'Personal Property', description: 'Covers your belongings against theft and damage', basePrice: 0, maxCoverage: 30000 },
        { name: 'Liability', description: 'Covers you if someone is injured in your rental', basePrice: 10, maxCoverage: 100000 },
        { name: 'Additional Living Expenses', description: 'Pays for temporary housing if rental is damaged', basePrice: 8, maxCoverage: 10000 },
        { name: 'Electronics Rider', description: 'Enhanced coverage for electronics and gadgets', basePrice: 12, maxCoverage: 5000 },
      ],
    },
  ]);

  const [auto, home, life, health, travel, pet, business, renters] = products;
  console.log('Created products');

  // Policies
  const policyStart = new Date();
  policyStart.setMonth(policyStart.getMonth() - 6);
  const policyEnd = new Date();
  policyEnd.setMonth(policyEnd.getMonth() + 6);

  const policies = await Policy.create([
    {
      customer: c1._id, product: auto._id, agent: agent1._id,
      status: 'active',
      coverageDetails: { selectedOptions: ['Comprehensive', 'Collision', 'Liability'], coverageAmount: 50000, deductible: 500 },
      premium: { amount: 179, frequency: 'monthly' },
      startDate: policyStart, endDate: policyEnd,
      paymentHistory: [
        { amount: 179, method: 'credit_card', status: 'completed', transactionId: 'TXN-SEED-001', date: policyStart },
      ],
    },
    {
      customer: c1._id, product: home._id, agent: agent1._id,
      status: 'active',
      coverageDetails: { selectedOptions: ['Dwelling', 'Personal Property', 'Liability'], coverageAmount: 350000, deductible: 1000 },
      premium: { amount: 210, frequency: 'monthly' },
      startDate: policyStart, endDate: policyEnd,
      paymentHistory: [
        { amount: 210, method: 'credit_card', status: 'completed', transactionId: 'TXN-SEED-002', date: policyStart },
      ],
    },
    {
      customer: c2._id, product: health._id, agent: agent1._id,
      status: 'active',
      coverageDetails: { selectedOptions: ['Individual Plan', 'Dental & Vision'], coverageAmount: 1000000, deductible: 2500 },
      premium: { amount: 395, frequency: 'monthly' },
      startDate: policyStart, endDate: policyEnd,
      paymentHistory: [
        { amount: 395, method: 'bank_transfer', status: 'completed', transactionId: 'TXN-SEED-003', date: policyStart },
      ],
    },
    {
      customer: c3._id, product: life._id, agent: agent1._id,
      status: 'active',
      coverageDetails: { selectedOptions: ['Term 20-Year', 'Accidental Death'], coverageAmount: 500000, deductible: 0 },
      premium: { amount: 100, frequency: 'monthly' },
      startDate: policyStart, endDate: new Date(policyStart.getFullYear() + 20, policyStart.getMonth()),
      paymentHistory: [
        { amount: 100, method: 'credit_card', status: 'completed', transactionId: 'TXN-SEED-004', date: policyStart },
      ],
    },
    {
      customer: c4._id, product: auto._id, agent: agent2._id,
      status: 'active',
      coverageDetails: { selectedOptions: ['Comprehensive', 'Liability'], coverageAmount: 30000, deductible: 750 },
      premium: { amount: 124, frequency: 'monthly' },
      startDate: policyStart, endDate: policyEnd,
      paymentHistory: [
        { amount: 124, method: 'debit_card', status: 'completed', transactionId: 'TXN-SEED-005', date: policyStart },
      ],
    },
    {
      customer: c5._id, product: renters._id, agent: agent2._id,
      status: 'active',
      coverageDetails: { selectedOptions: ['Personal Property', 'Liability', 'Electronics Rider'], coverageAmount: 30000, deductible: 250 },
      premium: { amount: 32, frequency: 'monthly' },
      startDate: policyStart, endDate: policyEnd,
      paymentHistory: [
        { amount: 32, method: 'credit_card', status: 'completed', transactionId: 'TXN-SEED-006', date: policyStart },
      ],
    },
  ]);

  const [p1, p2, p3, p4, p5, p6] = policies;
  console.log('Created policies');

  // Claims
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const oneWeekAgo  = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const yesterday   = new Date(); yesterday.setDate(yesterday.getDate() - 1);

  await Claim.create([
    {
      customer: c1._id, policy: p1._id, assignedAgent: agent1._id,
      type: 'accident', status: 'under_review', priority: 'high',
      incidentDate: twoWeeksAgo,
      description: 'Rear-ended at a traffic light on Highway 75. Other driver was at fault. Vehicle has significant damage to rear bumper and trunk.',
      claimedAmount: 8500,
      statusHistory: [
        { status: 'submitted', changedBy: c1._id, timestamp: twoWeeksAgo },
        { status: 'acknowledged', changedBy: agent1._id, reason: 'Claim received, assigning investigator', timestamp: oneWeekAgo },
        { status: 'under_review', changedBy: agent1._id, reason: 'Documentation received, reviewing claim', timestamp: threeDaysAgo },
      ],
      notes: [
        { author: agent1._id, content: 'Customer provided photos and police report. Damage appears consistent with description.', isInternal: true },
      ],
    },
    {
      customer: c1._id, policy: p2._id, assignedAgent: agent1._id,
      type: 'natural_disaster', status: 'documentation_requested', priority: 'high',
      incidentDate: oneWeekAgo,
      description: 'Storm damage to roof during recent severe weather. Multiple shingles missing and there is water damage in the attic.',
      claimedAmount: 12000,
      statusHistory: [
        { status: 'submitted', changedBy: c1._id, timestamp: oneWeekAgo },
        { status: 'acknowledged', changedBy: agent1._id, timestamp: threeDaysAgo },
        { status: 'under_review', changedBy: agent1._id, timestamp: threeDaysAgo },
        { status: 'documentation_requested', changedBy: agent1._id, reason: 'Please provide contractor estimates and photos of all damaged areas', timestamp: yesterday },
      ],
    },
    {
      customer: c2._id, policy: p3._id, assignedAgent: agent1._id,
      type: 'medical', status: 'approved', priority: 'medium',
      incidentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      description: 'Emergency appendectomy surgery followed by 3-day hospital stay.',
      claimedAmount: 28000,
      approvedAmount: 25200,
      statusHistory: [
        { status: 'submitted', changedBy: c2._id },
        { status: 'acknowledged', changedBy: agent1._id },
        { status: 'under_review', changedBy: agent1._id },
        { status: 'assessment', changedBy: agent1._id },
        { status: 'approved', changedBy: agent1._id, reason: 'Claim approved. Deductible of $2,800 applied per policy terms.' },
      ],
      resolution: 'Approved for $25,200 after applying the $2,800 deductible.',
    },
    {
      customer: c4._id, policy: p5._id, assignedAgent: agent2._id,
      type: 'theft', status: 'investigation', priority: 'urgent',
      incidentDate: threeDaysAgo,
      description: 'Vehicle was stolen from parking garage downtown. Filed police report immediately.',
      claimedAmount: 22000,
      statusHistory: [
        { status: 'submitted', changedBy: c4._id, timestamp: threeDaysAgo },
        { status: 'acknowledged', changedBy: agent2._id },
        { status: 'under_review', changedBy: agent2._id },
        { status: 'investigation', changedBy: agent2._id, reason: 'Escalated for investigation per theft protocol' },
      ],
    },
    {
      customer: c5._id, policy: p6._id, assignedAgent: agent2._id,
      type: 'theft', status: 'settled', priority: 'low',
      incidentDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      description: 'Laptop and tablet stolen from apartment while on vacation.',
      claimedAmount: 2800,
      approvedAmount: 2550,
      settlementAmount: 2550,
      statusHistory: [
        { status: 'submitted', changedBy: c5._id },
        { status: 'acknowledged', changedBy: agent2._id },
        { status: 'under_review', changedBy: agent2._id },
        { status: 'assessment', changedBy: agent2._id },
        { status: 'approved', changedBy: agent2._id },
        { status: 'settled', changedBy: agent2._id, reason: 'Payment processed via ACH transfer' },
      ],
      resolution: 'Settled for $2,550. Electronics depreciation of $250 applied.',
    },
  ]);
  console.log('Created claims');

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login credentials:');
  console.log('  Admin:    admin@insurance.com     / Admin@123');
  console.log('  Agent 1:  sarah.agent@insurance.com / Agent@123');
  console.log('  Agent 2:  james.agent@insurance.com / Agent@123');
  console.log('  Customer: michael@customer.com    / Customer@123');
  console.log('  Customer: emily@customer.com      / Customer@123');
  console.log('  Customer: robert@customer.com     / Customer@123');
  console.log('  Customer: jennifer@customer.com   / Customer@123');
  console.log('  Customer: david@customer.com      / Customer@123');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
