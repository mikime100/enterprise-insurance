const mongoose = require('mongoose');

const claimNoteSchema = new mongoose.Schema({
  author:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content:    { type: String, required: true },
  isInternal: { type: Boolean, default: false },
}, { timestamps: true });

const statusHistorySchema = new mongoose.Schema({
  status:    { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason:    String,
  timestamp: { type: Date, default: Date.now },
});

const claimSchema = new mongoose.Schema({
  claimNumber:    { type: String, unique: true },
  customer:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  policy:         { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
  assignedAgent:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['accident', 'theft', 'natural_disaster', 'medical', 'property_damage', 'liability', 'death', 'disability', 'travel', 'other'],
    required: true,
  },
  status: {
    type: String,
    enum: [
      'submitted', 'acknowledged', 'under_review',
      'documentation_requested', 'investigation', 'assessment',
      'approved', 'partially_approved', 'denied',
      'settled', 'closed',
    ],
    default: 'submitted',
  },
  priority:             { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  incidentDate:         { type: Date, required: true },
  description:          { type: String, required: true },
  claimedAmount:        { type: Number, required: true },
  approvedAmount:       Number,
  settlementAmount:     Number,
  estimatedResolutionDate: Date,
  resolution:           String,
  notes:                [claimNoteSchema],
  statusHistory:        [statusHistorySchema],
}, { timestamps: true });

const VALID_TRANSITIONS = {
  submitted:                ['acknowledged'],
  acknowledged:             ['under_review'],
  under_review:             ['documentation_requested', 'investigation', 'assessment'],
  documentation_requested:  ['under_review'],
  investigation:            ['assessment'],
  assessment:               ['approved', 'partially_approved', 'denied'],
  approved:                 ['settled'],
  partially_approved:       ['settled'],
  denied:                   ['closed'],
  settled:                  ['closed'],
  closed:                   [],
};

claimSchema.methods.canTransitionTo = function (newStatus) {
  return (VALID_TRANSITIONS[this.status] || []).includes(newStatus);
};

claimSchema.statics.VALID_TRANSITIONS = VALID_TRANSITIONS;

claimSchema.pre('save', async function (next) {
  if (this.claimNumber) return next();
  const count = await mongoose.model('Claim').countDocuments();
  this.claimNumber = `CLM-${String(count + 1).padStart(6, '0')}-${Date.now().toString().slice(-4)}`;
  next();
});

module.exports = mongoose.model('Claim', claimSchema);
