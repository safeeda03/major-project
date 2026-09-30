const Beneficiary = require('../models/Beneficiary');
const Attendance = require('../models/Attendance');
const HealthRecord = require('../models/HealthRecord');
const NutritionRecord = require('../models/NutritionRecord');
const Vaccination = require('../models/Vaccination');
const { canAccessBeneficiary } = require('../middleware/auth');

// Get all beneficiaries
exports.getAllBeneficiaries = async (req, res) => {
  try {
    if (req.user.role === 'parent') return res.status(403).json({ message: 'Parents can only view their linked child.' });
    if (req.user.role === 'worker' && !req.user.centreId) return res.json([]);
    const beneficiaries = await Beneficiary.find(req.user.role === 'worker' ? { anganwadi_id: req.user.centreId } : {});
    res.json(beneficiaries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get the child currently linked to a parent account. The current parent flow
// supports one child per parent; this can be expanded to multiple later.
exports.getBeneficiaryByParent = async (req, res) => {
  try {
    const childId = req.user.role === 'parent' ? req.user.beneficiaryId : null;
    const beneficiary = req.user.role === 'parent'
      ? (childId ? await Beneficiary.findOne({ beneficiary_id: childId, beneficiary_type: 'child' }) : null)
      : await Beneficiary.findOne({ parent_id: req.params.parentId, beneficiary_type: 'child' }).sort({ createdAt: 1 });
    if (beneficiary && !canAccessBeneficiary(req.user, beneficiary)) return res.status(403).json({ message: 'You cannot access a beneficiary outside your account.' });
    res.json(beneficiary ? [beneficiary] : []);
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
    if (!canAccessBeneficiary(req.user, beneficiary)) return res.status(403).json({ message: 'You cannot access a beneficiary outside your account.' });
    res.json(beneficiary);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new beneficiary
exports.createBeneficiary = async (req, res) => {
  try {
    const { name, dob, gender, parent_id, anganwadi_id, beneficiary_type, contact_phone, notes, profile_photo } = req.body;
    const type = beneficiary_type || 'child';

    if (req.user.role !== 'worker') return res.status(403).json({ message: 'Only Anganwadi workers can register beneficiaries.' });

    if (type === 'child' && parent_id && parent_id !== 'PENDING') {
      const linkedChild = await Beneficiary.findOne({ parent_id, beneficiary_type: 'child' });
      if (linkedChild) {
        return res.status(409).json({ message: 'This parent account already has a linked child profile.' });
      }
    }

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
      parent_id: parent_id || 'PENDING',
      anganwadi_id: req.user.centreId,
      beneficiary_type: type,
      contact_phone,
      notes,
      profile_photo
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
    const { name, dob, gender, parent_id, anganwadi_id, beneficiary_type, contact_phone, notes, profile_photo } = req.body;
    const current = await Beneficiary.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Beneficiary not found' });
    if (!canAccessBeneficiary(req.user, current)) return res.status(403).json({ message: 'You cannot update a beneficiary outside your account.' });
    if (req.user.role === 'parent') {
      const beneficiary = await Beneficiary.findByIdAndUpdate(req.params.id,
        { contact_phone, notes, profile_photo }, { new: true, runValidators: true });
      return res.json({ message: 'Beneficiary updated successfully', beneficiary });
    }

    const beneficiary = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      { name, dob, gender, parent_id, anganwadi_id: req.user.centreId, beneficiary_type: beneficiary_type || 'child', contact_phone, notes, profile_photo },
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
    const existing = await Beneficiary.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Beneficiary not found' });
    if (!canAccessBeneficiary(req.user, existing)) return res.status(403).json({ message: 'You cannot delete a beneficiary outside your centre.' });
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
    if (req.user.role === 'worker' && req.params.centreId !== req.user.centreId) return res.status(403).json({ message: 'You cannot access another centre.' });
    if (req.user.role === 'parent') return res.status(403).json({ message: 'Parents cannot browse centre beneficiaries.' });
    const beneficiaries = await Beneficiary.find({ anganwadi_id: req.params.centreId });
    res.json(beneficiaries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
