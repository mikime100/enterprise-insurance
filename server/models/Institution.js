const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name:               { type: String, required: true, trim: true },
  type:               { type: String, enum: ['corporate', 'sme', 'government', 'school', 'ngo'], default: 'corporate' },
  registrationNumber: { type: String, unique: true, sparse: true },
  address: {
    street:  String,
    city:    String,
    state:   String,
    country: { type: String, default: 'Ethiopia' }
  },
  contactEmail:   { type: String, trim: true },
  contactPhone:   { type: String, trim: true },
  assignedBroker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive:       { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Institution', institutionSchema);
