const express = require('express');
const router = express.Router();
const {
  getAllNutritionRecords,
  getNutritionRecordById,
  createNutritionRecord,
  updateNutritionRecord,
  deleteNutritionRecord,
  getNutritionRecordsByBeneficiary
} = require('../controllers/nutritionController');

// Get nutrition records by beneficiary
router.get('/beneficiary/:beneficiaryId', getNutritionRecordsByBeneficiary);

// Get nutrition record by ID
router.get('/:id', getNutritionRecordById);

// Get all nutrition records
router.get('/', getAllNutritionRecords);

// Create new nutrition record
router.post('/', createNutritionRecord);

// Update nutrition record
router.put('/:id', updateNutritionRecord);

// Delete nutrition record
router.delete('/:id', deleteNutritionRecord);

module.exports = router;
