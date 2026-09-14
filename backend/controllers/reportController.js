const HealthRecord = require('../models/HealthRecord');
const NutritionRecord = require('../models/NutritionRecord');
const Vaccination = require('../models/Vaccination');
const Beneficiary = require('../models/Beneficiary');

// Generate report
exports.generateReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.body;

    let data = [];
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
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

    // Growth/health risk alerts
    const healthRisks = await HealthRecord.find({ health_status: { $in: ['underweight', 'overweight'] } });
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
      next_due_date: { $lte: today }
    });
    if (dueVaccinations.length > 0) {
      alerts.push({
        type: 'vaccination',
        severity: 'medium',
        message: `${dueVaccinations.length} vaccinations due`,
        count: dueVaccinations.length
      });
    }

    // Nutrition status alerts
    const nutritionRisks = await NutritionRecord.find({
      nutrition_status: { $in: ['underweight', 'stunted', 'wasted'] }
    });
    if (nutritionRisks.length > 0) {
      alerts.push({
        type: 'nutrition',
        severity: 'high',
        message: `${nutritionRisks.length} children at nutrition risk`,
        count: nutritionRisks.length
      });
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};