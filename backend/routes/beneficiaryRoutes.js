const express = require('express');
const router = express.Router();
const {
  getAllBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  getBeneficiariesByCentre
} = require('../controllers/beneficiaryController');

// Get beneficiaries by anganwadi centre
router.get('/centre/:centreId', getBeneficiariesByCentre);

// Get beneficiary by ID
router.get('/:id', getBeneficiaryById);

// Get all beneficiaries
router.get('/', getAllBeneficiaries);

// Create new beneficiary
router.post('/', createBeneficiary);

// Update beneficiary
router.put('/:id', updateBeneficiary);

// Delete beneficiary
router.delete('/:id', deleteBeneficiary);

module.exports = router;
