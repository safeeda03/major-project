const express = require('express');
const router = express.Router();
const {
  getAllVaccinations,
  getVaccinationById,
  createVaccination,
  updateVaccination,
  deleteVaccination,
  getVaccinationsByBeneficiary,
  getDueVaccinations
} = require('../controllers/vaccinationController');

// Get all vaccination records
router.get('/', getAllVaccinations);

// Get vaccination record by ID
router.get('/:id', getVaccinationById);

// Create new vaccination record
router.post('/', createVaccination);

// Update vaccination record
router.put('/:id', updateVaccination);

// Delete vaccination record
router.delete('/:id', deleteVaccination);

// Get vaccinations by beneficiary
router.get('/beneficiary/:beneficiaryId', getVaccinationsByBeneficiary);

// Get due vaccinations
router.get('/due/all', getDueVaccinations);

module.exports = router;