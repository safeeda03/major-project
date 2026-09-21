const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema({
  beneficiary_id: {
    type: String,
    required: true
  },
  vaccine: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  next_due_date: {
    type: Date
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Vaccination', vaccinationSchema);
