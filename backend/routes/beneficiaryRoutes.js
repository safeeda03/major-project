const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../middleware/auth');
router.use(authenticate);
const {
  getAllBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  getBeneficiariesByCentre,
  getBeneficiaryByParent
} = require('../controllers/beneficiaryController');

// Get beneficiaries by anganwadi centre
router.get('/centre/:centreId', getBeneficiariesByCentre);

// Get the child linked to a parent account (must be before /:id).
router.get('/parent/:parentId', getBeneficiaryByParent);

// Get beneficiary by ID
router.get('/:id', getBeneficiaryById);

// Get all beneficiaries
router.get('/', getAllBeneficiaries);

// Create new beneficiary
router.post('/', requireRoles('worker'), createBeneficiary);

// Update beneficiary
router.put('/:id', updateBeneficiary);

// Delete beneficiary
router.delete('/:id', requireRoles('worker'), deleteBeneficiary);

module.exports = router;
