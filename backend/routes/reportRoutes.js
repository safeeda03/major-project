const express = require('express');
const router = express.Router();
const { generateReport, getAlerts, getAlertDetails } = require('../controllers/reportController');

// Generate report
router.post('/generate', generateReport);

// Get alerts
router.get('/alerts', getAlerts);

// Get the beneficiaries included in an alert
router.get('/alerts/:type', getAlertDetails);

module.exports = router;
