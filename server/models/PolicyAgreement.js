const mongoose = require('mongoose');

const policyAgreementSchema = new mongoose.Schema({
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product:          { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProduct', required: true },
  tier:             { type: mongoose.Schema.Types.ObjectId, ref: 'Tier', required: true },
  signatureData:    { type: String, required: true },   // typed full name
  agreementVersion: { type: String, default: 'v1.0' },
  agreed:           { type: Boolean, required: true },
  signedAt:         { type: Date, default: Date.now },
}, { timestamps: true });

// One record per user+tier — upsert on re-sign
policyAgreementSchema.index({ user: 1, tier: 1 }, { unique: true });

module.exports = mongoose.model('PolicyAgreement', policyAgreementSchema);
