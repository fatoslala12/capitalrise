const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Të gjitha routes kërkojnë autentikim
router.use(verifyToken);

// Backup i plotë - vetëm admin
router.post('/full', requireRole('admin'), backupController.createFullBackup);

// Backup i pjesshëm - vetëm admin
router.post('/partial', requireRole('admin'), backupController.createPartialBackup);

// Restore backup - vetëm admin
router.post('/restore/:filename', requireRole('admin'), backupController.restoreBackup);

// Listo backup-ve - admin dhe manager
router.get('/list', requireRole(['admin', 'manager']), backupController.listBackups);

// Fshi backup - vetëm admin
router.delete('/:filename', requireRole('admin'), backupController.deleteBackup);

// Pastro backup të vjetër - vetëm admin
router.post('/cleanup', requireRole('admin'), backupController.cleanupOldBackups);

// Statusi i databazës - admin dhe manager
router.get('/status', requireRole(['admin', 'manager']), backupController.getDatabaseStatus);

// Informacion për tabelat - admin dhe manager
router.get('/tables', requireRole(['admin', 'manager']), backupController.getTableInfo);

// Download backup file - admin dhe manager
router.get('/download/:filename', requireRole(['admin', 'manager']), backupController.downloadBackup);

// Backup automatik (për cron job) - vetëm admin
router.post('/scheduled', requireRole('admin'), backupController.createScheduledBackup);

module.exports = router; 