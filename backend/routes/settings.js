const express = require('express');
const router = express.Router();
const {
  getSystemSettings,
  updateCompanyInfo,
  updateWorkHoursRules,
  updateSecuritySettings,
  updateBackupSettings
} = require('../controllers/settingsController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get system settings
router.get('/system', getSystemSettings);

// Update company information
router.put('/system/company', updateCompanyInfo);

// Update work hours rules
router.put('/system/workhours', updateWorkHoursRules);

// Update security settings
router.put('/system/security', updateSecuritySettings);

// Update backup settings
router.put('/system/backup', updateBackupSettings);

module.exports = router;
