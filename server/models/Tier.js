const mongoose = require('mongoose');

const tierCoverageSchema = new mongoose.Schema({
  coverage:    { type: mongoose.Schema.Types.ObjectId, ref: 'Coverage', required: true },
  customLimit: Number // overrides Coverage.limits.annual when set
});

const tierSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['Basic', 'Standard', 'Premium', 'Executive', 'Third Party', 'Comprehensive', 'Full Cover'],
    required: true
  },
  product:           { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProduct', required: true },
  coverages:         [tierCoverageSchema],
  annualPremium:     { type: Number, required: true },
  employerSharePct:  { type: Number, default: 100 }, // % employer pays in group plans
  maxDependents:     { type: Number, default: 4 },
  description:       String
}, { timestamps: true });

module.exports = mongoose.model('Tier', tierSchema);
