const mongoose = require('mongoose');

const nutritionRecordSchema = new mongoose.Schema({
  beneficiary_id: {
    type: String,
    required: true
  },
  nutrition_status: {
    type: String,
    enum: ['normal', 'underweight', 'overweight', 'stunted', 'wasted'],
    required: true
  },
  meals: {
    type: String
  },
  recommendations: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NutritionRecord', nutritionRecordSchema);