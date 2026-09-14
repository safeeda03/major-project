const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
  beneficiary_id: {
    type: String,
    required: true,
    unique: true,
    default: () => `BEN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  },
  name: {
    type: String,
    required: true
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  parent_id: {
    type: String,
    required: true
  },
  anganwadi_id: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Beneficiary', beneficiarySchema);
