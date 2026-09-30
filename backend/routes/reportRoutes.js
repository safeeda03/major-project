const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../middleware/auth');
router.use(authenticate, requireRoles('worker', 'supervisor'));
const { generateReport, getAlerts, getAlertDetails, getCentreStatistics } = require('../controllers/reportController');

// Generate report
router.post('/generate', generateReport);

// Per-Anganwadi operational statistics
router.get('/statistics/centres', getCentreStatistics);

// Get alerts
router.get('/alerts', getAlerts);

// Get the beneficiaries included in an alert
router.get('/alerts/:type', getAlertDetails);

module.exports = router;
