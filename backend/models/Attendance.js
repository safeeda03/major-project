const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  beneficiary_id: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day'],
    required: true
  },
  absence_reason: {
    type: String,
    enum: ['', 'Sick', 'Family reason', 'Holiday', 'Other'],
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

attendanceSchema.index({ beneficiary_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
