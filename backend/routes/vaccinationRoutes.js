const express = require('express');
const router = express.Router();
const { authenticate, requireRoles, authorizeBeneficiaryParam, authorizeRecord } = require('../middleware/auth');
const Vaccination = require('../models/Vaccination');
router.use(authenticate);
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
router.get('/beneficiary/:beneficiaryId', authorizeBeneficiaryParam(), getVaccinationsByBeneficiary);

// Mark a vaccination as completed
router.patch('/:id/complete', requireRoles('worker', 'supervisor'), authorizeRecord(Vaccination), markVaccinationCompleted);

// Undo a completed vaccination
router.patch('/:id/undo-complete', requireRoles('worker', 'supervisor'), authorizeRecord(Vaccination), markVaccinationIncomplete);

// Get vaccination record by ID
router.get('/:id', authorizeRecord(Vaccination), getVaccinationById);

// Get all vaccination records
router.get('/', getAllVaccinations);

// Create new vaccination record
router.post('/', requireRoles('worker'), createVaccination);

// Update vaccination record
router.put('/:id', requireRoles('worker', 'supervisor'), authorizeRecord(Vaccination), updateVaccination);

// Delete vaccination record
router.delete('/:id', requireRoles('worker', 'supervisor'), authorizeRecord(Vaccination), deleteVaccination);

module.exports = router;
