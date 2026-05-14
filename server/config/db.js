const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise_insurance');
  console.log('MongoDB connected');
};

module.exports = connectDB;
