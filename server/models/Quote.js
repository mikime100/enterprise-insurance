const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProduct', required: true },
  agent:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'accepted', 'rejected', 'expired'],
    default: 'pending',
  },
  coverageDetails: {
    selectedOptions: [String],
    coverageAmount:  Number,
    deductible:      Number,
    additionalInfo:  mongoose.Schema.Types.Mixed,
  },
  calculatedPremium: { type: Number, required: true },
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi-annual', 'annual'],
    default: 'monthly',
  },
  validUntil:   { type: Date, required: true },
  notes:        String,
  customerData: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('Quote', quoteSchema);
