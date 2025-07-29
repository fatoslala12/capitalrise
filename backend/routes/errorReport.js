const express = require('express');
const router = express.Router();
const errorReportController = require('../controllers/errorReportController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Error report nga frontend (nuk kërkon autentikim)
router.post('/report', errorReportController.reportError);

// Routes që kërkojnë autentikim
router.use(verifyToken);

// Merr statistika të errors - vetëm admin
router.get('/stats', requireRole('admin'), errorReportController.getErrorStats);

// Merr errors të fundit - admin dhe manager
router.get('/recent', requireRole(['admin', 'manager']), errorReportController.getRecentErrors);

// Merr error details - admin dhe manager
router.get('/details/:errorId', requireRole(['admin', 'manager']), errorReportController.getErrorDetails);

// Merr error trends - vetëm admin
router.get('/trends', requireRole('admin'), errorReportController.getErrorTrends);

// Pastro errors të vjetër - vetëm admin
router.post('/cleanup', requireRole('admin'), errorReportController.cleanupOldErrors);

module.exports = router; 