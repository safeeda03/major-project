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

// Get health records by beneficiary
router.get('/beneficiary/:beneficiaryId', getHealthRecordsByBeneficiary);

// Get health record by ID
router.get('/:id', getHealthRecordById);

// Get all health records
router.get('/', getAllHealthRecords);

// Create new health record
router.post('/', createHealthRecord);

// Update health record
router.put('/:id', updateHealthRecord);

// Delete health record
router.delete('/:id', deleteHealthRecord);

module.exports = router;
