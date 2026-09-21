const Vaccination = require('../models/Vaccination');

// Get all vaccination records
exports.getAllVaccinations = async (req, res) => {
  try {
    const vaccinations = await Vaccination.find();
    res.json(vaccinations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get vaccination record by ID
exports.getVaccinationById = async (req, res) => {
  try {
    const vaccination = await Vaccination.findById(req.params.id);
    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination record not found' });
    }
    res.json(vaccination);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new vaccination record
exports.createVaccination = async (req, res) => {
  try {
    const { beneficiary_id, vaccine, date, next_due_date, completed } = req.body;

    const vaccination = new Vaccination({
      beneficiary_id,
      vaccine,
      date,
      next_due_date,
      completed
    });

    await vaccination.save();

    res.status(201).json({
      message: 'Vaccination record created successfully',
      vaccination
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update vaccination record
exports.updateVaccination = async (req, res) => {
  try {
    const { beneficiary_id, vaccine, date, next_due_date, completed } = req.body;

    const vaccination = await Vaccination.findByIdAndUpdate(
      req.params.id,
      { beneficiary_id, vaccine, date, next_due_date, completed },
      { new: true, runValidators: true }
    );

    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination record not found' });
    }

    res.json({
      message: 'Vaccination record updated successfully',
      vaccination
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark a due vaccination as completed. Completed vaccinations are excluded from due alerts.
exports.markVaccinationCompleted = async (req, res) => {
  try {
    const vaccination = await Vaccination.findByIdAndUpdate(
      req.params.id,
      { completed: true },
      { new: true, runValidators: true }
    );

    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination record not found' });
    }

    res.json({ message: 'Vaccination marked as completed', vaccination });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Restore a completed vaccination to due status if it was marked done by mistake.
exports.markVaccinationIncomplete = async (req, res) => {
  try {
    const vaccination = await Vaccination.findByIdAndUpdate(
      req.params.id,
      { completed: false },
      { new: true, runValidators: true }
    );

    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination record not found' });
    }

    res.json({ message: 'Vaccination marked as due', vaccination });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete vaccination record
exports.deleteVaccination = async (req, res) => {
  try {
    const vaccination = await Vaccination.findByIdAndDelete(req.params.id);

    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination record not found' });
    }

    res.json({ message: 'Vaccination record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get vaccinations by beneficiary
exports.getVaccinationsByBeneficiary = async (req, res) => {
  try {
    const vaccinations = await Vaccination.find({ beneficiary_id: req.params.beneficiaryId });
    res.json(vaccinations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get every outstanding vaccination, including upcoming due dates, for the dashboard.
exports.getPendingVaccinations = async (req, res) => {
  try {
    const pendingVaccinations = await Vaccination.find({
      completed: { $ne: true },
      next_due_date: { $exists: true, $ne: null }
    }).sort({ next_due_date: 1 });
    res.json(pendingVaccinations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get due vaccinations
exports.getDueVaccinations = async (req, res) => {
  try {
    const today = new Date();
    const dueVaccinations = await Vaccination.find({
      next_due_date: { $lte: today },
      completed: { $ne: true }
    });
    res.json(dueVaccinations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
