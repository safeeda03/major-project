const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../middleware/auth');
router.use(authenticate, requireRoles('worker', 'supervisor'));
const { generateReport, getAlerts, getAlertDetails, getCentreStatistics } = require('../controllers/reportController');
const ReportAssistantService = require('../services/reportAssistantService');

router.post('/assistant/preview', requireRoles('worker'), async (req, res) => {
  try {
    const { message, language, draft, reportType } = req.body;
    if (!String(message || '').trim()) return res.status(400).json({ message: 'Extracted report text is required.' });
    const preview = await ReportAssistantService.buildPreview(message, language, draft, req.user, reportType);
    if (!preview.isReportRequest) return res.status(400).json({ message: 'Choose a report type before preparing a preview.' });
    res.json(preview);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Could not prepare the report preview.' });
  }
});

router.post('/assistant/confirm', requireRoles('worker'), async (req, res) => {
  try {
    const saved = await ReportAssistantService.savePreview(req.body.draft, req.user);
    res.status(201).json({ response: 'Report saved successfully.', saved });
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message || 'Could not save the report.' });
  }
});

// Generate report
router.post('/generate', generateReport);

// Per-Anganwadi operational statistics
router.get('/statistics/centres', getCentreStatistics);

// Get alerts
router.get('/alerts', getAlerts);

// Get the beneficiaries included in an alert
router.get('/alerts/:type', getAlertDetails);

module.exports = router;
