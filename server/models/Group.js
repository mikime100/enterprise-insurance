const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  tier:        { type: mongoose.Schema.Types.ObjectId, ref: 'Tier' },
  description: String
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
