const mongoose = require('mongoose');

const activityRecordSchema = new mongoose.Schema({
  activity_type: {
    type: String,
    enum: ['activity', 'home_visit', 'preschool_activity', 'food_stock', 'supplementary_nutrition', 'counselling', 'referral', 'event'],
    default: 'event',
    required: true,
  },
  centre_id: { type: String, required: true, trim: true, uppercase: true },
  beneficiary_id: { type: String, trim: true, uppercase: true },
  date: { type: Date, required: true },
  event_type: { type: String, trim: true },
  service_type: { type: String, trim: true },
  beneficiaries_served: { type: Number, min: 0 },
  details: { type: String, trim: true, default: '' },
  observations: { type: String, trim: true, default: '' },
  follow_up_required: { type: Boolean, default: false },
  follow_up_status: { type: String, enum: ['pending', 'completed', 'closed'], default: 'pending' },
  created_by: { type: String, trim: true },
}, { timestamps: true });

activityRecordSchema.index({ centre_id: 1, date: -1 });
activityRecordSchema.index({ beneficiary_id: 1, date: -1 });

module.exports = mongoose.model('ActivityRecord', activityRecordSchema);
