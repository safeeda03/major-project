const express = require('express');
const router = express.Router();
const {
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceByBeneficiary,
  getAttendanceByDate
} = require('../controllers/attendanceController');

// Get all attendance records
router.get('/', getAllAttendance);

// Get attendance record by ID
router.get('/:id', getAttendanceById);

// Create new attendance record
router.post('/', createAttendance);

// Update attendance record
router.put('/:id', updateAttendance);

// Delete attendance record
router.delete('/:id', deleteAttendance);

// Get attendance by beneficiary
router.get('/beneficiary/:beneficiaryId', getAttendanceByBeneficiary);

// Get attendance by date
router.get('/date/:date', getAttendanceByDate);

module.exports = router;