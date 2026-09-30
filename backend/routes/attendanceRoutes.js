const express = require('express');
const router = express.Router();
const { authenticate, requireRoles, authorizeBeneficiaryParam, authorizeRecord } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
router.use(authenticate);
const {
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceByBeneficiary,
  getAttendanceByDate,
  getDailyAttendance,
  saveDailyAttendance
} = require('../controllers/attendanceController');

router.get('/daily/:date', getDailyAttendance);
router.put('/daily', requireRoles('worker'), saveDailyAttendance);

// Get attendance by beneficiary
router.get('/beneficiary/:beneficiaryId', authorizeBeneficiaryParam(), getAttendanceByBeneficiary);

// Get attendance by date
router.get('/date/:date', getAttendanceByDate);

// Get attendance record by ID
router.get('/:id', authorizeRecord(Attendance), getAttendanceById);

// Get all attendance records
router.get('/', getAllAttendance);

// Create new attendance record
router.post('/', requireRoles('worker'), createAttendance);

// Update attendance record
router.put('/:id', requireRoles('worker'), authorizeRecord(Attendance), updateAttendance);

// Delete attendance record
router.delete('/:id', requireRoles('worker'), authorizeRecord(Attendance), deleteAttendance);

module.exports = router;
