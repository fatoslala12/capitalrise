const express = require('express');
const router = express.Router();
const realTimeAlertController = require('../controllers/realTimeAlertController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Të gjitha routes kërkojnë autentikim
router.use(verifyToken);

// Kontrolli i monitoring - vetëm admin
router.post('/start', requireRole('admin'), realTimeAlertController.startMonitoring);
router.post('/stop', requireRole('admin'), realTimeAlertController.stopMonitoring);
router.get('/status', requireRole(['admin', 'manager']), realTimeAlertController.getMonitoringStatus);

// Menaxhimi i thresholds - vetëm admin
router.put('/thresholds', requireRole('admin'), realTimeAlertController.updateThresholds);
router.get('/thresholds', requireRole(['admin', 'manager']), realTimeAlertController.getAlertRules);

// Test alert - vetëm admin
router.post('/test', requireRole('admin'), realTimeAlertController.testAlert);

// Shikimi i alerts - admin dhe manager
router.get('/recent', requireRole(['admin', 'manager']), realTimeAlertController.getRecentAlerts);
router.get('/stats', requireRole(['admin', 'manager']), realTimeAlertController.getAlertStats);

// Pastrimi i alerts - vetëm admin
router.post('/cleanup', requireRole('admin'), realTimeAlertController.cleanupOldAlerts);

// Konfigurimi i rules - vetëm admin
router.post('/rules', requireRole('admin'), realTimeAlertController.configureAlertRules);
router.get('/rules', requireRole(['admin', 'manager']), realTimeAlertController.getAlertRules);

// Menaxhimi i IP-ve të verdhësishëm - vetëm admin
router.post('/suspicious-ip', requireRole('admin'), realTimeAlertController.addSuspiciousIP);
router.delete('/suspicious-ip/:ipAddress', requireRole('admin'), realTimeAlertController.removeSuspiciousIP);

module.exports = router; 