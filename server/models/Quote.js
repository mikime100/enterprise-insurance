const mongoose = require('mongoose');

const quoteNoteSchema = new mongoose.Schema({
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const scenarioSchema = new mongoose.Schema({
  name:          { type: String, required: true }, // "Option A", "Option B"
  tier:          { type: mongoose.Schema.Types.ObjectId, ref: 'Tier' },
  annualPremium: { type: Number, required: true },
  notes:         String
});

const quoteDocumentSchema = new mongoose.Schema({
  originalName: String,
  filename:     String,
  url:          String,
  mimeType:     String,
  docType: {
    type: String,
    enum: ['medical_report', 'id_document', 'bank_statement', 'police_report', 'invoice', 'other'],
    default: 'other',
  },
  uploadedAt: { type: Date, default: Date.now },
});

const quoteSchema = new mongoose.Schema({
  quoteNumber: { type: String, unique: true },
  payer:       { type: mongoose.Schema.Types.ObjectId, ref: 'Payer', required: true },
  product:     { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProduct', required: true },
  // One of these will be set depending on quote type
  institution:   { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  insuredPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuredPerson' },
  requestedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedUnderwriter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  memberCount: { type: Number, default: 1 },
  riskFactors: {
    averageAge:    Number,
    claimsHistory: { type: String, enum: ['none', 'low', 'moderate', 'high'], default: 'none' },
    riskScore:     { type: Number, min: 1, max: 10 }
  },
  applicationData: { type: mongoose.Schema.Types.Mixed },
  scenarios:       [scenarioSchema],
  selectedScenario: Number, // index into scenarios array
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired', 'accepted'],
    default: 'draft'
  },
  validUntil:    { type: Date },
  finalPremium:  Number,
  notes:         [quoteNoteSchema],
  documents:     [quoteDocumentSchema],
}, { timestamps: true });

quoteSchema.pre('save', async function (next) {
  if (this.quoteNumber) return next();
  const count = await mongoose.model('Quote').countDocuments();
  this.quoteNumber = `QUO-${String(count + 1).padStart(5, '0')}-${Date.now().toString().slice(-4)}`;
  next();
});

module.exports = mongoose.model('Quote', quoteSchema);
