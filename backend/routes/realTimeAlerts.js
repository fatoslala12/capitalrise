const express = require('express');
const router = express.Router();
const realTimeAlertController = require('../controllers/realTimeAlertController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Test endpoint without authentication
router.get('/test', async (req, res) => {
  try {
    res.json({ 
      message: 'Real-time alerts API is working!',
      endpoints: {
        status: '/api/real-time-alerts/status',
        recent: '/api/real-time-alerts/recent',
        stats: '/api/real-time-alerts/stats',
        rules: '/api/real-time-alerts/rules'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test status endpoint without authentication
router.get('/test-status', async (req, res) => {
  try {
    const RealTimeAlertService = require('../services/realTimeAlertService');
    const realTimeAlertService = new RealTimeAlertService();
    
    const status = realTimeAlertService.getMonitoringStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        isActive: realTimeAlertService.isMonitoring,
        monitoringInterval: realTimeAlertService.monitoringInterval ? 'Active' : 'Inactive'
      }
    });
  } catch (error) {
    console.error('Error getting test status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test recent alerts endpoint without authentication
router.get('/test-recent', async (req, res) => {
  try {
    // Simulate recent alerts for testing
    const mockAlerts = [
      {
        id: 1,
        type: 'SUSPICIOUS_LOGIN',
        title: 'Login i verdhësishëm',
        message: 'Përdoruesi u logua nga IP e panjohur',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        user: 'test@example.com',
        ipAddress: '192.168.1.100'
      },
      {
        id: 2,
        type: 'FREQUENT_DELETES',
        title: 'Fshirje të shpeshta',
        message: 'U zbuluan fshirje të shpeshta të të dhënave',
        severity: 'high',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        user: 'admin@example.com',
        ipAddress: '192.168.1.101'
      },
      {
        id: 3,
        type: 'NIGHT_ACTIVITY',
        title: 'Aktivitet në natë',
        message: 'Aktivitet i verdhësishëm në orët e natës',
        severity: 'medium',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        user: 'user@example.com',
        ipAddress: '192.168.1.102'
      }
    ];
    
    res.json({
      success: true,
      data: mockAlerts
    });
  } catch (error) {
    console.error('Error getting test recent alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test stats endpoint without authentication
router.get('/test-stats', async (req, res) => {
  try {
    // Simulate alert statistics for testing
    const mockStats = {
      totalAlerts: 15,
      todayAlerts: 3,
      criticalAlerts: 2,
      warningAlerts: 8,
      infoAlerts: 5,
      alertTypes: {
        'SUSPICIOUS_LOGIN': 5,
        'FREQUENT_DELETES': 3,
        'NIGHT_ACTIVITY': 4,
        'UNAUTHORIZED_ACCESS': 2,
        'DATA_EXPORT': 1
      },
      recentActivity: {
        lastHour: 2,
        last24Hours: 8,
        lastWeek: 15
      }
    };
    
    res.json({
      success: true,
      data: mockStats
    });
  } catch (error) {
    console.error('Error getting test stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test rules endpoint without authentication
router.get('/test-rules', async (req, res) => {
  try {
    const RealTimeAlertService = require('../services/realTimeAlertService');
    const realTimeAlertService = new RealTimeAlertService();
    
    res.json({
      success: true,
      data: {
        rules: realTimeAlertService.alertThresholds,
        suspiciousIPs: Array.from(realTimeAlertService.suspiciousIPs)
      }
    });
  } catch (error) {
    console.error('Error getting test rules:', error);
    res.status(500).json({ error: error.message });
  }
});

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