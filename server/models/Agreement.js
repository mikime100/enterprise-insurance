const mongoose = require('mongoose');

const agreementServiceSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  description:  String,
  agreedPrice:  { type: Number, required: true }
});

const agreementSchema = new mongoose.Schema({
  payer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Payer', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'terminated'],
    default: 'pending'
  },
  effectiveDate: Date,
  expiryDate:    Date,
  paymentCycle: {
    type: String,
    enum: ['daily', 'weekly', 'bi_weekly', 'monthly'],
    default: 'monthly'
  },
  services:  [agreementServiceSchema],
  coverages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coverage' }],
  notes:     String
}, { timestamps: true });

module.exports = mongoose.model('Agreement', agreementSchema);
