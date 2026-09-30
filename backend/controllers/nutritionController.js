const NutritionRecord = require('../models/NutritionRecord');
const { getScopedBeneficiaryIds } = require('../middleware/auth');

// Get all nutrition records
exports.getAllNutritionRecords = async (req, res) => {
  try {
    const ids = await getScopedBeneficiaryIds(req.user);
    const nutritionRecords = await NutritionRecord.find(ids ? { beneficiary_id: { $in: ids } } : {});
    res.json(nutritionRecords);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get nutrition record by ID
exports.getNutritionRecordById = async (req, res) => {
  try {
    const nutritionRecord = await NutritionRecord.findById(req.params.id);
    if (!nutritionRecord) {
      return res.status(404).json({ message: 'Nutrition record not found' });
    }
    res.json(nutritionRecord);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new nutrition record
exports.createNutritionRecord = async (req, res) => {
  try {
    const { beneficiary_id, nutrition_status, meals, recommendations } = req.body;
    const ids = await getScopedBeneficiaryIds(req.user);
    if (!req.user.centreId || !ids.includes(beneficiary_id)) return res.status(403).json({ message: 'This child does not belong to your centre.' });

    const nutritionRecord = new NutritionRecord({
      beneficiary_id,
      nutrition_status,
      meals,
      recommendations
    });

    await nutritionRecord.save();

    res.status(201).json({
      message: 'Nutrition record created successfully',
      nutritionRecord
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update nutrition record
exports.updateNutritionRecord = async (req, res) => {
  try {
    const { beneficiary_id, nutrition_status, meals, recommendations } = req.body;

    const current = await NutritionRecord.findById(req.params.id);
    const ids = await getScopedBeneficiaryIds(req.user);
    if (!current) return res.status(404).json({ message: 'Nutrition record not found' });
    if (req.user.role !== 'supervisor' && !ids.includes(current.beneficiary_id)) return res.status(403).json({ message: 'This record is outside your access.' });
    if (req.user.role === 'worker' && !ids.includes(beneficiary_id)) return res.status(403).json({ message: 'This child does not belong to your centre.' });
    const nutritionRecord = await NutritionRecord.findByIdAndUpdate(
      req.params.id,
      { beneficiary_id, nutrition_status, meals, recommendations },
      { new: true, runValidators: true }
    );

    if (!nutritionRecord) {
      return res.status(404).json({ message: 'Nutrition record not found' });
    }

    res.json({
      message: 'Nutrition record updated successfully',
      nutritionRecord
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete nutrition record
exports.deleteNutritionRecord = async (req, res) => {
  try {
    const current = await NutritionRecord.findById(req.params.id);
    const ids = await getScopedBeneficiaryIds(req.user);
    if (!current) return res.status(404).json({ message: 'Nutrition record not found' });
    if (req.user.role !== 'supervisor' && !ids.includes(current.beneficiary_id)) return res.status(403).json({ message: 'This record is outside your access.' });
    const nutritionRecord = await NutritionRecord.findByIdAndDelete(req.params.id);

    if (!nutritionRecord) {
      return res.status(404).json({ message: 'Nutrition record not found' });
    }

    res.json({ message: 'Nutrition record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get nutrition records by beneficiary
exports.getNutritionRecordsByBeneficiary = async (req, res) => {
  try {
    const ids = await getScopedBeneficiaryIds(req.user);
    if (ids && !ids.includes(req.params.beneficiaryId)) return res.status(403).json({ message: 'You cannot access records for this beneficiary.' });
    const nutritionRecords = await NutritionRecord.find({ beneficiary_id: req.params.beneficiaryId });
    res.json(nutritionRecords);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
