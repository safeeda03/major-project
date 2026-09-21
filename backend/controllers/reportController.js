const HealthRecord = require('../models/HealthRecord');
const NutritionRecord = require('../models/NutritionRecord');
const Vaccination = require('../models/Vaccination');
const Beneficiary = require('../models/Beneficiary');
const Attendance = require('../models/Attendance');

const latestRecordsByBeneficiary = (records) => {
  const latest = new Map();
  records.forEach((record) => {
    const existing = latest.get(record.beneficiary_id);
    if (!existing || new Date(record.date) > new Date(existing.date)
      || (new Date(record.date).getTime() === new Date(existing.date).getTime()
        && new Date(record.createdAt) > new Date(existing.createdAt))) {
      latest.set(record.beneficiary_id, record);
    }
  });
  return [...latest.values()];
};

// Generate report
exports.generateReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.body;

    let data = [];
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) dateFilter.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    switch (reportType) {
      case 'beneficiary':
        data = await Beneficiary.find();
        break;
      case 'health':
        data = await HealthRecord.find(dateFilter);
        break;
      case 'nutrition':
        data = await NutritionRecord.find(dateFilter);
        break;
      case 'vaccination':
        data = await Vaccination.find(dateFilter);
        break;
      case 'attendance':
        data = await Attendance.find(dateFilter);
        break;
      case 'centre': {
        const beneficiaryFilter = {};
        if (startDate || endDate) {
          beneficiaryFilter.createdAt = {};
          if (startDate) beneficiaryFilter.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
          if (endDate) beneficiaryFilter.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
        }
        const beneficiaries = await Beneficiary.find(beneficiaryFilter);
        const centres = beneficiaries.reduce((summary, beneficiary) => {
          const centreId = beneficiary.anganwadi_id || 'Not assigned';
          summary.set(centreId, (summary.get(centreId) || 0) + 1);
          return summary;
        }, new Map());
        data = [...centres.entries()].map(([centre_id, beneficiaryCount]) => ({ centre_id, beneficiaryCount }));
        break;
      }
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    res.json({
      reportType,
      data,
      count: data.length,
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get alerts
exports.getAlerts = async (req, res) => {
  try {
    const alerts = [];

    // Use only each child's latest health measurement, not historic records.
    const latestHealthRecords = latestRecordsByBeneficiary(await HealthRecord.find());
    const healthRisks = latestHealthRecords.filter((record) => record.health_status !== 'normal');
    if (healthRisks.length > 0) {
      alerts.push({
        type: 'health',
        severity: 'high',
        message: `${healthRisks.length} children showing growth/health risks`,
        count: healthRisks.length
      });
    }

    // Vaccination due alerts
    const today = new Date();
    const dueVaccinations = await Vaccination.find({
      next_due_date: { $lte: today },
      completed: { $ne: true }
    });
    if (dueVaccinations.length > 0) {
      alerts.push({
        type: 'vaccination',
        severity: 'medium',
        message: `${dueVaccinations.length} vaccinations due`,
        count: dueVaccinations.length
      });
    }

    // Use only each child's latest nutrition assessment.
    const latestNutritionRecords = latestRecordsByBeneficiary(await NutritionRecord.find());
    const nutritionRisks = latestNutritionRecords.filter((record) => (
      ['underweight', 'stunted', 'wasted'].includes(record.nutrition_status)
    ));
    if (nutritionRisks.length > 0) {
      alerts.push({
        type: 'nutrition',
        severity: 'high',
        message: `${nutritionRisks.length} children at nutrition risk`,
        count: nutritionRisks.length
      });
    }

    // Calculate the actual attendance rate from records entered in the last 30 days.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAttendance = await Attendance.find({ date: { $gte: thirtyDaysAgo } });
    if (recentAttendance.length > 0) {
      const attendanceUnits = recentAttendance.reduce((total, record) => (
        total + (record.status === 'present' ? 1 : record.status === 'half-day' ? 0.5 : 0)
      ), 0);
      const attendanceRate = Math.round((attendanceUnits / recentAttendance.length) * 100);
      if (attendanceRate < 80) {
        alerts.push({
          type: 'attendance',
          severity: 'medium',
          message: `Attendance is ${attendanceRate}% in the last 30 days`,
          count: recentAttendance.length
        });
      }
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Return the beneficiaries behind one alert so workers can act on it.
exports.getAlertDetails = async (req, res) => {
  try {
    const { type } = req.params;
    let title;
    let records;

    if (type === 'health') {
      const latestRecords = latestRecordsByBeneficiary(await HealthRecord.find());
      records = latestRecords
        .filter((record) => record.health_status !== 'normal')
        .map((record) => ({ beneficiary_id: record.beneficiary_id, status: record.health_status, date: record.date }));
      title = 'Growth and Health Risk';
    } else if (type === 'nutrition') {
      const latestRecords = latestRecordsByBeneficiary(await NutritionRecord.find());
      records = latestRecords
        .filter((record) => ['underweight', 'stunted', 'wasted'].includes(record.nutrition_status))
        .map((record) => ({ beneficiary_id: record.beneficiary_id, status: record.nutrition_status, date: record.date }));
      title = 'Nutrition Risk';
    } else if (type === 'vaccination') {
      const today = new Date();
      const vaccinations = await Vaccination.find({
        next_due_date: { $lte: today },
        completed: { $ne: true }
      });
      records = vaccinations.map((record) => ({
        beneficiary_id: record.beneficiary_id,
        status: `${record.vaccine} due`,
        date: record.next_due_date
      }));
      title = 'Vaccinations Due';
    } else if (type === 'attendance') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const attendance = await Attendance.find({ date: { $gte: thirtyDaysAgo } });
      const byBeneficiary = attendance.reduce((summary, record) => {
        const current = summary.get(record.beneficiary_id) || { total: 0, units: 0, latestDate: record.date };
        current.total += 1;
        current.units += record.status === 'present' ? 1 : record.status === 'half-day' ? 0.5 : 0;
        if (new Date(record.date) > new Date(current.latestDate)) current.latestDate = record.date;
        summary.set(record.beneficiary_id, current);
        return summary;
      }, new Map());
      records = [...byBeneficiary.entries()]
        .map(([beneficiary_id, summary]) => ({
          beneficiary_id,
          status: `Attendance ${Math.round((summary.units / summary.total) * 100)}%`,
          date: summary.latestDate,
          rate: (summary.units / summary.total) * 100
        }))
        .filter((record) => record.rate < 80);
      title = 'Low Attendance';
    } else {
      return res.status(400).json({ message: 'Invalid alert type' });
    }

    const beneficiaryIds = records.map((record) => record.beneficiary_id);
    const beneficiaries = await Beneficiary.find({ beneficiary_id: { $in: beneficiaryIds } });
    const beneficiaryById = new Map(beneficiaries.map((beneficiary) => [beneficiary.beneficiary_id, beneficiary]));
    const details = records.map((record) => ({
      ...record,
      beneficiary: beneficiaryById.get(record.beneficiary_id) || null
    }));

    res.json({ type, title, records: details });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
