const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Test endpoint without authentication
router.get('/test', async (req, res) => {
  try {
    res.json({ 
      message: 'Backup API is working!',
      endpoints: {
        status: '/api/backup/status',
        list: '/api/backup/list',
        full: '/api/backup/full',
        partial: '/api/backup/partial',
        restore: '/api/backup/restore/:filename',
        cleanup: '/api/backup/cleanup'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test status endpoint without authentication
router.get('/test-status', async (req, res) => {
  try {
    const BackupService = require('../services/backupService');
    const backupService = new BackupService();
    
    // Test database connection
    const db = require('../db');
    const result = await db.query('SELECT version() as version, current_database() as database');
    
    res.json({
      success: true,
      data: {
        database: {
          version: result.rows[0].version,
          name: result.rows[0].database,
          status: 'Connected'
        },
        backup: {
          directory: backupService.backupDir,
          exists: await backupService.checkBackupDirectory()
        }
      }
    });
  } catch (error) {
    console.error('Error getting test status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test backup creation without authentication
router.post('/test-backup', async (req, res) => {
  try {
    const { description = 'Test backup' } = req.body;
    const BackupService = require('../services/backupService');
    const backupService = new BackupService();
    
    console.log('🔄 Creating test backup...');
    const result = await backupService.createFullBackup(description);
    
    res.json({
      success: true,
      message: 'Test backup created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating test backup:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating test backup',
      error: error.message 
    });
  }
});

// Test list backups without authentication
router.get('/test-list', async (req, res) => {
  try {
    const BackupService = require('../services/backupService');
    const backupService = new BackupService();
    
    const backups = await backupService.listBackups();
    
    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Error listing test backups:', error);
    res.status(500).json({ error: error.message });
  }
});

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