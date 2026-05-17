const mongoose = require('mongoose');

const insuranceProductSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'Payer', required: true },
  productType: {
    type: String,
    enum: ['auto', 'home', 'life', 'health', 'travel', 'business', 'pet', 'renters', 'disability'],
    required: true
  },
  description: { type: String, required: true },
  targetMarkets: [{
    type: String,
    enum: ['Corporate', 'SME', 'Individual', 'Students', 'Seniors', 'Government']
  }],
  ageRange: {
    min: { type: Number, default: 18 },
    max: { type: Number, default: 65 }
  },
  baseAnnualPremium:   { type: Number, required: true },
  waitingPeriodMonths: { type: Number, default: 0 },
  features:            [String],
  terms:               String,
  isActive:              { type: Boolean, default: true },
  availableForIndividual:{ type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('InsuranceProduct', insuranceProductSchema);
