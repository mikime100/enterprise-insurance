const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, unique: true },
  type: {
    type: String,
    enum: ['premium_collection', 'claim_settlement', 'provider_payment', 'reimbursement'],
    required: true
  },
  direction: {
    type: String,
    enum: ['institution_to_payer', 'insured_to_payer', 'payer_to_provider', 'payer_to_insured'],
    required: true
  },
  claim:      { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' },
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyEnrollment' },
  amount:     { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'reversed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'mobile_money', 'cash', 'check'],
    default: 'bank_transfer'
  },
  reference:   String,
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  notes:       String
}, { timestamps: true });

paymentSchema.pre('save', async function (next) {
  if (this.paymentNumber) return next();
  const count = await mongoose.model('Payment').countDocuments();
  this.paymentNumber = `PAY-${String(count + 1).padStart(6, '0')}-${Date.now().toString().slice(-4)}`;
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
