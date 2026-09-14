const HealthRecord = require('../models/HealthRecord');

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

    // Calculate BMI
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);

    // Determine health status based on BMI and other factors
    let health_status = 'normal';
    if (bmi < 18.5) health_status = 'underweight';
    else if (bmi >= 25) health_status = 'overweight';

    const healthRecord = new HealthRecord({
      beneficiary_id,
      height,
      weight,
      bmi,
      health_status,
      date
    });

    await healthRecord.save();

    res.status(201).json({
      message: 'Health record created successfully',
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
      const heightInMeters = height / 100;
      const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);
      let health_status = 'normal';
      if (bmi < 18.5) health_status = 'underweight';
      else if (bmi >= 25) health_status = 'overweight';
      
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
    const healthRecords = await HealthRecord.find({ beneficiary_id: req.params.beneficiaryId });
    res.json(healthRecords);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};