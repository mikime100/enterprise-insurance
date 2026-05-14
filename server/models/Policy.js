const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount:        { type: Number, required: true },
  date:          { type: Date, default: Date.now },
  method:        { type: String, enum: ['credit_card', 'debit_card', 'bank_transfer', 'check'] },
  status:        { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' },
  transactionId: String,
}, { timestamps: true });

const policySchema = new mongoose.Schema({
  policyNumber: { type: String, unique: true },
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProduct', required: true },
  agent:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quote:        { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'cancelled', 'expired', 'pending_renewal'],
    default: 'pending',
  },
  coverageDetails: {
    selectedOptions: [String],
    coverageAmount:  { type: Number, required: true },
    deductible:      Number,
    additionalInfo:  mongoose.Schema.Types.Mixed,
  },
  premium: {
    amount:    { type: Number, required: true },
    frequency: { type: String, enum: ['monthly', 'quarterly', 'semi-annual', 'annual'], default: 'monthly' },
  },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  renewalDate:    Date,
  paymentHistory: [paymentSchema],
  notes:          String,
}, { timestamps: true });

policySchema.pre('save', async function (next) {
  if (this.policyNumber) return next();
  const count = await mongoose.model('Policy').countDocuments();
  this.policyNumber = `POL-${String(count + 1).padStart(6, '0')}-${Date.now().toString().slice(-4)}`;
  next();
});

module.exports = mongoose.model('Policy', policySchema);
