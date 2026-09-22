const mongoose = require('mongoose');

const anganwadiCentreSchema = new mongoose.Schema({
  centre_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    trim: true
  },
  worker_name: {
    type: String,
    required: true,
    trim: true
  },
  worker_phone: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AnganwadiCentre', anganwadiCentreSchema);
