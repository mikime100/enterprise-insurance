const mongoose = require('mongoose');

const dependentSchema = new mongoose.Schema({
  firstName:    { type: String, required: true },
  lastName:     { type: String, required: true },
  dateOfBirth:  Date,
  gender:       { type: String, enum: ['male', 'female', 'other'] },
  relationship: { type: String, enum: ['spouse', 'child', 'parent', 'sibling', 'other'], required: true }
});

const insuredPersonSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional portal access
  firstName:   { type: String, required: true, trim: true },
  lastName:    { type: String, required: true, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  phone:       String,
  dateOfBirth: Date,
  gender:      { type: String, enum: ['male', 'female', 'other'] },
  nationalId:  String,
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  group:       { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  dependents:  [dependentSchema],
  isActive:    { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('InsuredPerson', insuredPersonSchema);
