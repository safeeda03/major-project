const Beneficiary = require('../models/Beneficiary');
const Attendance = require('../models/Attendance');
const HealthRecord = require('../models/HealthRecord');
const NutritionRecord = require('../models/NutritionRecord');
const Vaccination = require('../models/Vaccination');

// Get all beneficiaries
exports.getAllBeneficiaries = async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find();
    res.json(beneficiaries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get beneficiary by ID
exports.getBeneficiaryById = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ message: 'Beneficiary not found' });
    }
    res.json(beneficiary);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new beneficiary
exports.createBeneficiary = async (req, res) => {
  try {
    const { name, dob, gender, parent_id, anganwadi_id } = req.body;

    // Continue the human-readable IDs used by the seeded data: BEN001, BEN002, ...
    const existingIds = await Beneficiary.find({ beneficiary_id: /^BEN\d+$/ })
      .select('beneficiary_id -_id')
      .lean();
    const highestNumber = existingIds.reduce((highest, item) => {
      const number = Number.parseInt(item.beneficiary_id.slice(3), 10);
      return Number.isFinite(number) ? Math.max(highest, number) : highest;
    }, 0);
    const beneficiary_id = `BEN${String(highestNumber + 1).padStart(3, '0')}`;

    const beneficiary = new Beneficiary({
      beneficiary_id,
      name,
      dob,
      gender,
      parent_id,
      anganwadi_id
    });

    await beneficiary.save();

    res.status(201).json({
      message: 'Beneficiary created successfully',
      beneficiary
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update beneficiary
exports.updateBeneficiary = async (req, res) => {
  try {
    const { name, dob, gender, parent_id, anganwadi_id } = req.body;

    const beneficiary = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      { name, dob, gender, parent_id, anganwadi_id },
      { new: true, runValidators: true }
    );

    if (!beneficiary) {
      return res.status(404).json({ message: 'Beneficiary not found' });
    }

    res.json({
      message: 'Beneficiary updated successfully',
      beneficiary
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete beneficiary
exports.deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findByIdAndDelete(req.params.id);

    if (!beneficiary) {
      return res.status(404).json({ message: 'Beneficiary not found' });
    }

    await Promise.all([
      Attendance.deleteMany({ beneficiary_id: beneficiary.beneficiary_id }),
      HealthRecord.deleteMany({ beneficiary_id: beneficiary.beneficiary_id }),
      NutritionRecord.deleteMany({ beneficiary_id: beneficiary.beneficiary_id }),
      Vaccination.deleteMany({ beneficiary_id: beneficiary.beneficiary_id })
    ]);

    res.json({ message: 'Beneficiary and related records deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get beneficiaries by anganwadi centre
exports.getBeneficiariesByCentre = async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find({ anganwadi_id: req.params.centreId });
    res.json(beneficiaries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
