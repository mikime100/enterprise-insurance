const mongoose = require('mongoose');

const claimNoteSchema = new mongoose.Schema({
  author:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content:    { type: String, required: true },
  isInternal: { type: Boolean, default: false }
}, { timestamps: true });

const statusHistorySchema = new mongoose.Schema({
  status:    { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason:    String,
  timestamp: { type: Date, default: Date.now }
});

const claimServiceSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  quantity:    { type: Number, default: 1 },
  unitPrice:   Number,
  totalAmount: Number
});

const documentSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['photo', 'receipt', 'police_report', 'medical_report', 'invoice', 'other'] },
  url:  String // mocked URL for demo
});

const claimSchema = new mongoose.Schema({
  claimNumber:  { type: String, unique: true },
  insuredPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuredPerson', required: true },
  enrollment:   { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyEnrollment', required: true },
  provider:     { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' }, // set for direct billing
  submittedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submissionType: {
    type: String,
    enum: ['insured_reimbursement', 'provider_direct', 'provider_batch'],
    default: 'insured_reimbursement'
  },
  assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'Payer' },
  claimType: {
    type: String,
    enum: [
      'inpatient', 'outpatient', 'dental', 'optical', 'maternity',
      'pharmacy', 'emergency', 'auto_accident', 'property_damage',
      'liability', 'death', 'disability', 'travel', 'other'
    ],
    required: true
  },
  status: {
    type: String,
    enum: [
      'submitted', 'acknowledged', 'under_review',
      'documentation_requested', 'investigation', 'assessment',
      'pending_finance_approval',
      'approved', 'partially_approved', 'denied',
      'payment_initiated', 'settled', 'closed'
    ],
    default: 'submitted'
  },
  priority:     { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  incidentDate:     { type: Date, required: true },
  incidentLocation: String,
  policeReportRef:  String,
  thirdParty: {
    name:        String,
    contact:     String,
    vehicle:     String,
    insurerName: String,
  },
  description:  { type: String, required: true },
  diagnosis:    String,
  documentationRequested: [String],
  appealStatus: { type: String, enum: ['none', 'submitted', 'reviewed'], default: 'none' },
  appealNote:   String,
  services:     [claimServiceSchema],
  documents:    [documentSchema],
  claimedAmount:   { type: Number, required: true },
  approvedAmount:  Number,
  settlementAmount: Number,
  financeApproval: {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    notes:      String
  },
  estimatedResolutionDate: Date,
  resolution:    String,
  notes:         [claimNoteSchema],
  statusHistory: [statusHistorySchema]
}, { timestamps: true });

const VALID_TRANSITIONS = {
  submitted:                  ['acknowledged'],
  acknowledged:               ['under_review'],
  under_review:               ['documentation_requested', 'investigation', 'assessment'],
  documentation_requested:    ['under_review'],
  investigation:              ['assessment'],
  assessment:                 ['pending_finance_approval', 'denied'],
  pending_finance_approval:   ['approved', 'partially_approved', 'denied'],
  approved:                   ['payment_initiated'],
  partially_approved:         ['payment_initiated'],
  denied:                     ['closed'],
  payment_initiated:          ['settled'],
  settled:                    ['closed'],
  closed:                     []
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
