const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['hospital', 'clinic', 'pharmacy', 'lab', 'auto_repair', 'property_assessor', 'specialist'],
    required: true
  },
  licenseNumber:   { type: String, unique: true, sparse: true },
  specializations: [String],
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

module.exports = mongoose.model('Provider', providerSchema);
