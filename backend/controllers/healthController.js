const HealthRecord = require('../models/HealthRecord');

const getDayRange = (date) => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const calculateHealthValues = (height, weight) => {
  const heightInMeters = height / 100;
  const bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(2));
  let health_status = 'normal';
  if (bmi < 18.5) health_status = 'underweight';
  else if (bmi >= 25) health_status = 'overweight';
  return { bmi, health_status };
};

// Get all health records
exports.getAllHealthRecords = async (req, res) => {
  try {
    const healthRecords = await HealthRecord.find();
    res.json(healthRecords);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get health record by ID
exports.getHealthRecordById = async (req, res) => {
  try {
    const healthRecord = await HealthRecord.findById(req.params.id);
    if (!healthRecord) {
      return res.status(404).json({ message: 'Health record not found' });
    }
    res.json(healthRecord);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new health record
exports.createHealthRecord = async (req, res) => {
  try {
    const { beneficiary_id, height, weight, date } = req.body;

    const { start, end } = getDayRange(date);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ message: 'A valid measurement date is required' });
    }

    const { bmi, health_status } = calculateHealthValues(height, weight);
    const matchingRecords = await HealthRecord.find({
      beneficiary_id,
      date: { $gte: start, $lt: end }
    }).sort({ createdAt: 1 });

    const recordData = { beneficiary_id, height, weight, bmi, health_status, date };
    let healthRecord;
    let updated = false;

    if (matchingRecords.length) {
      healthRecord = await HealthRecord.findByIdAndUpdate(
        matchingRecords[0]._id,
        recordData,
        { new: true, runValidators: true }
      );
      updated = true;

      // Remove duplicates left by older saves for the same child and date.
      const duplicateIds = matchingRecords.slice(1).map((record) => record._id);
      if (duplicateIds.length) await HealthRecord.deleteMany({ _id: { $in: duplicateIds } });
    } else {
      healthRecord = await HealthRecord.create(recordData);
    }

    res.status(updated ? 200 : 201).json({
      message: updated ? 'Health record updated successfully' : 'Health record created successfully',
      healthRecord
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update health record
exports.updateHealthRecord = async (req, res) => {
  try {
    const { beneficiary_id, height, weight, date } = req.body;

    // Recalculate BMI if height or weight is updated
    let updateData = { beneficiary_id, date };
    if (height && weight) {
      const { bmi, health_status } = calculateHealthValues(height, weight);
      updateData = { ...updateData, height, weight, bmi, health_status };
    }

    const healthRecord = await HealthRecord.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!healthRecord) {
      return res.status(404).json({ message: 'Health record not found' });
    }

    res.json({
      message: 'Health record updated successfully',
      healthRecord
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete health record
exports.deleteHealthRecord = async (req, res) => {
  try {
    const healthRecord = await HealthRecord.findByIdAndDelete(req.params.id);

    if (!healthRecord) {
      return res.status(404).json({ message: 'Health record not found' });
    }

    res.json({ message: 'Health record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get health records by beneficiary
exports.getHealthRecordsByBeneficiary = async (req, res) => {
  try {
    const records = await HealthRecord.find({ beneficiary_id: req.params.beneficiaryId })
      .sort({ date: -1, createdAt: -1 });
    // For historic duplicate rows, show only the newest value for each date.
    const dateKeys = new Set();
    const healthRecords = records.filter((record) => {
      const dateKey = record.date.toISOString().slice(0, 10);
      if (dateKeys.has(dateKey)) return false;
      dateKeys.add(dateKey);
      return true;
    });
    res.json(healthRecords);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
