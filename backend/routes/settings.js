const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Merr të gjitha system settings
router.get('/system', verifyToken, requireRole('admin'), settingsController.getSystemSettings);

// Ruaj company info
router.put('/system/company', verifyToken, requireRole('admin'), settingsController.updateCompanyInfo);

// Ruaj work hours rules
router.put('/system/workhours', verifyToken, requireRole('admin'), settingsController.updateWorkHoursRules);

// Ruaj security settings
router.put('/system/security', verifyToken, requireRole('admin'), settingsController.updateSecuritySettings);

// Ruaj backup settings
router.put('/system/backup', verifyToken, requireRole('admin'), settingsController.updateBackupSettings);

// Ruaj performance settings
router.put('/system/performance', verifyToken, requireRole('admin'), settingsController.updatePerformanceSettings);

// Ruaj email settings
router.put('/system/email', verifyToken, requireRole('admin'), settingsController.updateEmailSettings);

// Ruaj maintenance settings
router.put('/system/maintenance', verifyToken, requireRole('admin'), settingsController.updateMaintenanceSettings);

module.exports = router;