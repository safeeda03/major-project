const Attendance = require('../models/Attendance');
const Beneficiary = require('../models/Beneficiary');
const { getScopedBeneficiaryIds, canAccessBeneficiary } = require('../middleware/auth');

const parseAttendanceDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
};

const getDayRange = (date) => ({ $gte: date, $lt: new Date(date.getTime() + 86400000) });

exports.getDailyAttendance = async (req, res) => {
  try {
    const date = parseAttendanceDate(req.params.date);
    if (!date) return res.status(400).json({ message: 'Date must be a valid YYYY-MM-DD date.' });
    if (req.user.role === 'worker' && !req.user.centreId) return res.status(403).json({ message: 'Your account is not assigned to a centre.' });
    const [children, records] = await Promise.all([
      Beneficiary.find({ beneficiary_type: 'child', ...(req.user.role === 'worker' ? { anganwadi_id: req.user.centreId } : req.user.role === 'parent' ? { beneficiary_id: req.user.beneficiaryId } : {}) }).sort({ name: 1 }).lean(),
      Attendance.find({ date: getDayRange(date) }).lean()
    ]);
    const byBeneficiary = new Map(records.map((record) => [record.beneficiary_id, record]));
    res.json(children.map((child) => ({
      ...child,
      attendance: byBeneficiary.get(child.beneficiary_id) || null
    })));
  } catch (error) {
    res.status(500).json({ message: 'Could not load daily attendance.', error: error.message });
  }
};

exports.saveDailyAttendance = async (req, res) => {
  try {
    const date = parseAttendanceDate(req.body.date);
    const rows = req.body.attendance;
    const reasons = ['', 'Sick', 'Family reason', 'Holiday', 'Other'];
    if (!date) return res.status(400).json({ message: 'Date must be a valid YYYY-MM-DD date.' });
    if (!Array.isArray(rows)) return res.status(400).json({ message: 'Attendance must be a list.' });

    const childIds = [...new Set(rows.map((row) => row?.beneficiary_id))];
    if (childIds.length !== rows.length || rows.some((row) => !row?.beneficiary_id || !['present', 'absent'].includes(row.status) || !reasons.includes(row.absence_reason || ''))) {
      return res.status(400).json({ message: 'Each child needs a valid, unique attendance status and absence reason.' });
    }
    if (req.user.role !== 'worker' || !req.user.centreId) return res.status(403).json({ message: 'Only an assigned Anganwadi worker can save attendance.' });
    const children = await Beneficiary.find({ beneficiary_id: { $in: childIds }, beneficiary_type: 'child', anganwadi_id: req.user.centreId }).select('beneficiary_id').lean();
    if (children.length !== childIds.length) return res.status(400).json({ message: 'Attendance can only be saved for registered children.' });

    const existing = await Attendance.find({ beneficiary_id: { $in: childIds }, date: getDayRange(date) }).select('_id beneficiary_id').lean();
    const existingIds = new Map();
    existing.forEach((record) => {
      if (!existingIds.has(record.beneficiary_id)) existingIds.set(record.beneficiary_id, []);
      existingIds.get(record.beneficiary_id).push(record._id);
    });
    await Promise.all(rows.map(async (row) => {
      const ids = existingIds.get(row.beneficiary_id) || [];
      const existingId = ids.shift();
      if (ids.length) await Attendance.deleteMany({ _id: { $in: ids } });
      const filter = existingId ? { _id: existingId } : { beneficiary_id: row.beneficiary_id, date };
      return Attendance.findOneAndUpdate(filter, {
        $set: { beneficiary_id: row.beneficiary_id, date, status: row.status, absence_reason: row.status === 'absent' ? (row.absence_reason || '') : '' }
      }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    }));
    res.json({ message: 'Attendance saved successfully.' });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'Attendance was updated elsewhere. Reload the date and try again.' : 'Could not save attendance.', error: error.message });
  }
};

// Get all attendance records
exports.getAllAttendance = async (req, res) => {
  try {
    const ids = await getScopedBeneficiaryIds(req.user);
    const attendance = await Attendance.find(ids ? { beneficiary_id: { $in: ids } } : {});
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get attendance record by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    const child = await Beneficiary.findOne({ beneficiary_id: attendance.beneficiary_id });
    if (!canAccessBeneficiary(req.user, child)) return res.status(403).json({ message: 'You cannot access this attendance record.' });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new attendance record
exports.createAttendance = async (req, res) => {
  try {
    const { beneficiary_id, date, status } = req.body;
    const parsedDate = date ? new Date(date) : null;
    if (!beneficiary_id || !parsedDate || Number.isNaN(parsedDate.getTime()) || !['present', 'absent', 'half-day'].includes(status)) {
      return res.status(400).json({ message: 'A registered beneficiary, valid date, and valid attendance status are required.' });
    }
    const child = await Beneficiary.findOne({ beneficiary_id, beneficiary_type: 'child' });
    if (!child) return res.status(400).json({ message: 'Attendance can only be recorded for a registered child.' });
    if (req.user.role !== 'worker' || !canAccessBeneficiary(req.user, child)) return res.status(403).json({ message: 'This child does not belong to your centre.' });
    parsedDate.setUTCHours(0, 0, 0, 0);
    const attendance = await Attendance.findOneAndUpdate(
      { beneficiary_id, date: getDayRange(parsedDate) },
      { $set: { beneficiary_id, date: parsedDate, status, absence_reason: status === 'absent' ? (req.body.absence_reason || '') : '' } },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json({ message: 'Attendance record saved successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update attendance record
exports.updateAttendance = async (req, res) => {
  try {
    const { beneficiary_id, date, status } = req.body;
    const current = await Attendance.findById(req.params.id);
    const child = current && await Beneficiary.findOne({ beneficiary_id: current.beneficiary_id });
    if (!current) return res.status(404).json({ message: 'Attendance record not found' });
    if (req.user.role !== 'worker' || !canAccessBeneficiary(req.user, child)) return res.status(403).json({ message: 'This attendance record is outside your centre.' });

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { beneficiary_id, date, status },
      { new: true, runValidators: true }
    );

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json({
      message: 'Attendance record updated successfully',
      attendance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete attendance record
exports.deleteAttendance = async (req, res) => {
  try {
    const current = await Attendance.findById(req.params.id);
    const child = current && await Beneficiary.findOne({ beneficiary_id: current.beneficiary_id });
    if (!current) return res.status(404).json({ message: 'Attendance record not found' });
    if (req.user.role !== 'worker' || !canAccessBeneficiary(req.user, child)) return res.status(403).json({ message: 'This attendance record is outside your centre.' });
    const attendance = await Attendance.findByIdAndDelete(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get attendance by beneficiary
exports.getAttendanceByBeneficiary = async (req, res) => {
  try {
    const ids = await getScopedBeneficiaryIds(req.user);
    if (ids && !ids.includes(req.params.beneficiaryId)) return res.status(403).json({ message: 'You cannot access records for this beneficiary.' });
    const attendance = await Attendance.find({ beneficiary_id: req.params.beneficiaryId });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get attendance by date
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const ids = await getScopedBeneficiaryIds(req.user);
    const attendance = await Attendance.find({ date: new Date(date), ...(ids ? { beneficiary_id: { $in: ids } } : {}) });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
