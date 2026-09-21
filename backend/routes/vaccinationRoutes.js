const express = require('express');
const router = express.Router();
const {
  getAllVaccinations,
  getVaccinationById,
  createVaccination,
  updateVaccination,
  markVaccinationCompleted,
  markVaccinationIncomplete,
  deleteVaccination,
  getVaccinationsByBeneficiary,
  getPendingVaccinations,
  getDueVaccinations
} = require('../controllers/vaccinationController');

// Get due vaccinations
router.get('/due/all', getDueVaccinations);

// Get all outstanding vaccinations, including upcoming ones
router.get('/pending/all', getPendingVaccinations);

// Get vaccinations by beneficiary
router.get('/beneficiary/:beneficiaryId', getVaccinationsByBeneficiary);

// Mark a vaccination as completed
router.patch('/:id/complete', markVaccinationCompleted);

// Undo a completed vaccination
router.patch('/:id/undo-complete', markVaccinationIncomplete);

// Get vaccination record by ID
router.get('/:id', getVaccinationById);

// Get all vaccination records
router.get('/', getAllVaccinations);

// Create new vaccination record
router.post('/', createVaccination);

// Update vaccination record
router.put('/:id', updateVaccination);

// Delete vaccination record
router.delete('/:id', deleteVaccination);

module.exports = router;
