const mongoose = require('mongoose');

const coverageSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'Payer', required: true },
  productType: {
    type: String,
    enum: ['auto', 'home', 'life', 'health', 'travel', 'business', 'pet', 'renters', 'disability'],
    required: true
  },
  description: String,
  limits: {
    annual:      Number,
    perClaim:    Number,
    perIncident: Number,
    lifetime:    Number
  },
  deductible:    { type: Number, default: 0 },
  copaymentPct:  { type: Number, default: 0 }, // percentage patient pays
  isActive:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coverage', coverageSchema);
