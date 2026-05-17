const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  role: {
    type: String,
    enum: [
      'superadmin',
      'payer_admin',
      'underwriter',
      'claims_officer',
      'finance_officer',
      'provider_admin',
      'institution_admin',
      'sales_broker',
      'insured_person',
      'customer_support'
    ],
    default: 'insured_person'
  },
  phone:    { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  isEmailVerified:        { type: Boolean, default: false },
  emailVerificationOTP:   { type: String },
  emailVerificationExpiry:{ type: Date },
  mustChangePassword:     { type: Boolean, default: false },
  passwordResetToken:     { type: String },
  passwordResetExpiry:    { type: Date },
  brokerStatus:       { type: String, enum: ['pending', 'approved', 'rejected'], default: undefined },
  registeredByBroker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  institutionId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  linkedEntity: {
    entityType: { type: String, enum: ['Payer', 'Provider', 'Institution', 'InsuredPerson'] },
    entityId:   { type: mongoose.Schema.Types.ObjectId }
  }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
