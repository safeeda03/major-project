const express = require('express');
const router = express.Router();
const {
  getAllHealthRecords,
  getHealthRecordById,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getHealthRecordsByBeneficiary
} = require('../controllers/healthController');

// Get all health records
router.get('/', getAllHealthRecords);

// Get health record by ID
router.get('/:id', getHealthRecordById);

// Create new health record
router.post('/', createHealthRecord);

// Update health record
router.put('/:id', updateHealthRecord);

// Delete health record
router.delete('/:id', deleteHealthRecord);

// Get health records by beneficiary
router.get('/beneficiary/:beneficiaryId', getHealthRecordsByBeneficiary);

module.exports = router;