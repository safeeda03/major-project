const express = require('express');
const router = express.Router();
const { generateReport, getAlerts } = require('../controllers/reportController');

// Generate report
router.post('/generate', generateReport);

// Get alerts
router.get('/alerts', getAlerts);

module.exports = router;