const express = require('express');
const router = express.Router();
const { authenticate, requireRoles, authorizeBeneficiaryParam, authorizeRecord } = require('../middleware/auth');
const HealthRecord = require('../models/HealthRecord');
router.use(authenticate);
const {
  getAllHealthRecords,
  getHealthRecordById,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getHealthRecordsByBeneficiary
} = require('../controllers/healthController');

// Get health records by beneficiary
router.get('/beneficiary/:beneficiaryId', authorizeBeneficiaryParam(), getHealthRecordsByBeneficiary);

// Get health record by ID
router.get('/:id', authorizeRecord(HealthRecord), getHealthRecordById);

// Get all health records
router.get('/', getAllHealthRecords);

// Create new health record
router.post('/', requireRoles('worker'), createHealthRecord);

// Update health record
router.put('/:id', requireRoles('worker', 'supervisor'), authorizeRecord(HealthRecord), updateHealthRecord);

// Delete health record
router.delete('/:id', requireRoles('worker', 'supervisor'), authorizeRecord(HealthRecord), deleteHealthRecord);

module.exports = router;
