const express = require('express');
const router = express.Router();
const { authenticate, requireRoles, authorizeBeneficiaryParam, authorizeRecord } = require('../middleware/auth');
const NutritionRecord = require('../models/NutritionRecord');
router.use(authenticate);
const {
  getAllNutritionRecords,
  getNutritionRecordById,
  createNutritionRecord,
  updateNutritionRecord,
  deleteNutritionRecord,
  getNutritionRecordsByBeneficiary
} = require('../controllers/nutritionController');

// Get nutrition records by beneficiary
router.get('/beneficiary/:beneficiaryId', authorizeBeneficiaryParam(), getNutritionRecordsByBeneficiary);

// Get nutrition record by ID
router.get('/:id', authorizeRecord(NutritionRecord), getNutritionRecordById);

// Get all nutrition records
router.get('/', getAllNutritionRecords);

// Create new nutrition record
router.post('/', requireRoles('worker'), createNutritionRecord);

// Update nutrition record
router.put('/:id', requireRoles('worker', 'supervisor'), authorizeRecord(NutritionRecord), updateNutritionRecord);

// Delete nutrition record
router.delete('/:id', requireRoles('worker', 'supervisor'), authorizeRecord(NutritionRecord), deleteNutritionRecord);

module.exports = router;
