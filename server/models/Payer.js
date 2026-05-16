const mongoose = require('mongoose');

const payerSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  licenseNumber: { type: String, required: true, unique: true },
  type:          { type: String, enum: ['life', 'general', 'composite'], default: 'general' },
  address: {
    street:  String,
    city:    String,
    state:   String,
    country: { type: String, default: 'Ethiopia' }
  },
  contactEmail: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  isActive:     { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Payer', payerSchema);
