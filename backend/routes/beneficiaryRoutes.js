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

// Get all beneficiaries
router.get('/', getAllBeneficiaries);

// Get beneficiary by ID
router.get('/:id', getBeneficiaryById);

// Create new beneficiary
router.post('/', createBeneficiary);

// Update beneficiary
router.put('/:id', updateBeneficiary);

// Delete beneficiary
router.delete('/:id', deleteBeneficiary);

// Get beneficiaries by centre
router.get('/centre/:centreId', getBeneficiariesByCentre);

module.exports = router;