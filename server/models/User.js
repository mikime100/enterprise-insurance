const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['customer', 'agent', 'admin'], default: 'customer' },
  phone:     { type: String, trim: true },
  dateOfBirth: Date,
  address: {
    street:  String,
    city:    String,
    state:   String,
    zip:     String,
    country: { type: String, default: 'US' },
  },
  isActive:      { type: Boolean, default: true },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  licenseNumber: String,
  avatar:        String,
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
