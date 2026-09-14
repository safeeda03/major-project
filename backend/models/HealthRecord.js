const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  beneficiary_id: {
    type: String,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  bmi: {
    type: Number
  },
  health_status: {
    type: String,
    enum: ['normal', 'underweight', 'overweight', 'stunted', 'wasted'],
    default: 'normal'
  },
  date: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);