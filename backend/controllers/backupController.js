const BackupService = require('../services/backupService');
const NotificationService = require('../services/notificationService');

const backupService = new BackupService();

// Krijo backup të plotë
exports.createFullBackup = async (req, res) => {
  try {
    const { description } = req.body;
    const { user } = req;
    
    console.log(`[BACKUP] Përdoruesi ${user.email} po krijon backup të plotë`);
    
    const result = await backupService.createFullBackup(description);
    
    // Dërgo notification për admin
    try {
      await NotificationService.createNotification(
        user.id,
        '🔄 Backup i Plotë u Krijoa',
        `Backup i plotë u krijua me sukses. File: ${result.filename}, Madhësia: ${backupService.formatFileSize(result.metadata.size)}`,
        'success',
        'system',
        null,
        'backup',
        2
      );
    } catch (notificationError) {
      console.error('[ERROR] Failed to send backup notification:', notificationError);
    }
    
    res.json({
      success: true,
      message: 'Backup i plotë u krijua me sukses',
      data: result
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në krijimin e backup:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë krijimit të backup',
      error: error.message
    });
  }
};

// Krijo backup të pjesshëm
exports.createPartialBackup = async (req, res) => {
  try {
    const { tables, description } = req.body;
    const { user } = req;
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Duhet të specifikohen tabelat për backup'
      });
    }
    
    console.log(`[BACKUP] Përdoruesi ${user.email} po krijon backup të pjesshëm për tabelat:`, tables);
    
    const result = await backupService.createPartialBackup(tables, description);
    
    // Dërgo notification
    try {
      await NotificationService.createNotification(
        user.id,
        '🔄 Backup i Pjesshëm u Krijoa',
        `Backup i pjesshëm u krijua për tabelat: ${tables.join(', ')}. File: ${result.filename}`,
        'success',
        'system',
        null,
        'backup',
        2
      );
    } catch (notificationError) {
      console.error('[ERROR] Failed to send backup notification:', notificationError);
    }
    
    res.json({
      success: true,
      message: 'Backup i pjesshëm u krijua me sukses',
      data: result
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në krijimin e backup të pjesshëm:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë krijimit të backup të pjesshëm',
      error: error.message
    });
  }
};

// Restore backup
exports.restoreBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const { user } = req;
    
    console.log(`[BACKUP] Përdoruesi ${user.email} po restauron backup: ${filename}`);
    
    // Kontrollo nëse përdoruesi është admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vetëm admini mund të restauron backup'
      });
    }
    
    const result = await backupService.restoreBackup(filename);
    
    // Dërgo notification për të gjithë adminët
    try {
      const adminUsers = await require('../db').pool.query("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of adminUsers.rows) {
        await NotificationService.createNotification(
          admin.id,
          '🔄 Backup u Restaurua',
          `Backup u restaurua me sukses nga ${user.email}. File: ${filename}`,
          'warning',
          'system',
          null,
          'backup',
          3
        );
      }
    } catch (notificationError) {
      console.error('[ERROR] Failed to send restore notification:', notificationError);
    }
    
    res.json({
      success: true,
      message: 'Backup u restaurua me sukses',
      data: result
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në restaurimin e backup:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë restaurimit të backup',
      error: error.message
    });
  }
};

// Listo të gjitha backup-ve
exports.listBackups = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[BACKUP] Përdoruesi ${user.email} po liston backup-ve`);
    
    const backups = await backupService.listBackups();
    
    res.json({
      success: true,
      data: backups,
      count: backups.length
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në listimin e backup-ve:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë listimit të backup-ve',
      error: error.message
    });
  }
};

// Fshi backup
exports.deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const { user } = req;
    
    console.log(`[BACKUP] Përdoruesi ${user.email} po fshin backup: ${filename}`);
    
    // Kontrollo nëse përdoruesi është admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vetëm admini mund të fshijë backup'
      });
    }
    
    const result = await backupService.deleteBackup(filename);
    
    // Dërgo notification
    try {
      await NotificationService.createNotification(
        user.id,
        '🗑️ Backup u Fshi',
        `Backup u fshi me sukses. File: ${filename}`,
        'info',
        'system',
        null,
        'backup',
        1
      );
    } catch (notificationError) {
      console.error('[ERROR] Failed to send delete notification:', notificationError);
    }
    
    res.json({
      success: true,
      message: 'Backup u fshi me sukses',
      data: result
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në fshirjen e backup:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë fshirjes së backup',
      error: error.message
    });
  }
};

// Pastro backup të vjetër
exports.cleanupOldBackups = async (req, res) => {
  try {
    const { retentionDays = 30 } = req.body;
    const { user } = req;
    
    console.log(`[BACKUP] Përdoruesi ${user.email} po pastron backup të vjetër (${retentionDays} ditë)`);
    
    // Kontrollo nëse përdoruesi është admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vetëm admini mund të pastrojë backup'
      });
    }
    
    const result = await backupService.cleanupOldBackups(retentionDays);
    
    // Dërgo notification
    try {
      await NotificationService.createNotification(
        user.id,
        '🧹 Backup të Vjetër u Pastrën',
        `${result.deletedCount} backup të vjetër u fshinë automatikisht`,
        'info',
        'system',
        null,
        'backup',
        1
      );
    } catch (notificationError) {
      console.error('[ERROR] Failed to send cleanup notification:', notificationError);
    }
    
    res.json({
      success: true,
      message: 'Pastrimi i backup-ve të vjetër u krye me sukses',
      data: result
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në pastrimin e backup-ve:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë pastrimit të backup-ve',
      error: error.message
    });
  }
};

// Merr statusin e databazës
exports.getDatabaseStatus = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[BACKUP] Përdoruesi ${user.email} po kontrollon statusin e databazës`);
    
    const status = await backupService.getDatabaseStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e statusit të databazës:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së statusit të databazës',
      error: error.message
    });
  }
};

// Merr informacion për tabelat
exports.getTableInfo = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[BACKUP] Përdoruesi ${user.email} po merr informacion për tabelat`);
    
    const tableInfo = await backupService.getTableInfo();
    
    res.json({
      success: true,
      data: tableInfo
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e informacionit të tabelave:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së informacionit të tabelave',
      error: error.message
    });
  }
};

// Download backup file
exports.downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const { user } = req;
    
    console.log(`[BACKUP] Përdoruesi ${user.email} po shkarkon backup: ${filename}`);
    
    const filepath = require('path').join(backupService.backupDir, filename);
    
    // Kontrollo nëse file ekziston
    try {
      await require('fs').promises.access(filepath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'File i backup nuk u gjet'
      });
    }
    
    // Dërgo file-in
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('[ERROR] Gabim në shkarkimin e backup:', err);
        res.status(500).json({
          success: false,
          message: 'Gabim gjatë shkarkimit të backup'
        });
      }
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në shkarkimin e backup:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë shkarkimit të backup',
      error: error.message
    });
  }
};

// Backup automatik (për cron job)
exports.createScheduledBackup = async (req, res) => {
  try {
    console.log('[BACKUP] Backup automatik duke filluar...');
    
    const result = await backupService.createScheduledBackup();
    
    res.json({
      success: true,
      message: 'Backup automatik u krye me sukses',
      data: result
    });
    
  } catch (error) {
    console.error('[ERROR] Gabim në backup automatik:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në backup automatik',
      error: error.message
    });
  }
}; 