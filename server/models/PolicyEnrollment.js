const mongoose = require('mongoose');

const enrollmentPaymentSchema = new mongoose.Schema({
  amount:    { type: Number, required: true },
  date:      { type: Date, default: Date.now },
  method:    { type: String, enum: ['bank_transfer', 'mobile_money', 'cash', 'check'], default: 'bank_transfer' },
  status:    { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' },
  paidBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reference: String
});

const policyEnrollmentSchema = new mongoose.Schema({
  enrollmentNumber: { type: String, unique: true },
  quote:      { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
  product:    { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProduct', required: true },
  tier:       { type: mongoose.Schema.Types.ObjectId, ref: 'Tier' },
  payer:      { type: mongoose.Schema.Types.ObjectId, ref: 'Payer', required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' }, // null for individual
  insuredPersons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InsuredPerson' }],
  coverages:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coverage' }],
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'cancelled', 'expired', 'pending_renewal'],
    default: 'pending'
  },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  renewalDate: Date,
  premium: {
    amount:        { type: Number, required: true },
    frequency:     { type: String, enum: ['monthly', 'quarterly', 'semi-annual', 'annual'], default: 'annual' },
    employerShare: Number,
    employeeShare: Number
  },
  paymentHistory: [enrollmentPaymentSchema],
  notes: String
}, { timestamps: true });

policyEnrollmentSchema.pre('save', async function (next) {
  if (this.enrollmentNumber) return next();
  const count = await mongoose.model('PolicyEnrollment').countDocuments();
  this.enrollmentNumber = `ENR-${String(count + 1).padStart(5, '0')}-${Date.now().toString().slice(-4)}`;
  next();
});

module.exports = mongoose.model('PolicyEnrollment', policyEnrollmentSchema);
