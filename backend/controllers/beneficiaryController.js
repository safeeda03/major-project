const Beneficiary = require('../models/Beneficiary');

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

    const beneficiary = new Beneficiary({
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

    res.json({ message: 'Beneficiary deleted successfully' });
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