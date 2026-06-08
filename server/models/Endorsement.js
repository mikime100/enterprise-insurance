const mongoose = require('mongoose');

const endorsementSchema = new mongoose.Schema({
  enrollment:   { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyEnrollment', required: true },
  requestedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:   Date,

  type: {
    type: String,
    enum: ['tier_change', 'add_dependent', 'remove_dependent', 'contact_update', 'suspension', 'cancellation'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending',
  },

  // Flexible payload — shape depends on type
  details: { type: mongoose.Schema.Types.Mixed, required: true },

  // Payer's review note
  reviewNote: String,

  effectiveDate: Date,
}, { timestamps: true });

module.exports = mongoose.model('Endorsement', endorsementSchema);
