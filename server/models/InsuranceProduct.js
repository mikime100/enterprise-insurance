const mongoose = require('mongoose');

const coverageOptionSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: String,
  basePrice:   { type: Number, required: true },
  maxCoverage: Number,
});

const insuranceProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['auto', 'home', 'life', 'health', 'travel', 'business', 'pet', 'renters', 'disability'],
    required: true,
  },
  description:       { type: String, required: true },
  coverageOptions:   [coverageOptionSchema],
  baseMonthlyPremium: { type: Number, required: true },
  features:          [String],
  terms:             String,
  isActive:          { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('InsuranceProduct', insuranceProductSchema);
