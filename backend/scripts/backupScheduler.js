const BackupService = require('../services/backupService');
const NotificationService = require('../services/notificationService');
require('dotenv').config();

const backupService = new BackupService();

// Funksioni kryesor për backup automatik
async function runScheduledBackup() {
  console.log('🤖 Backup automatik duke filluar...');
  console.log('⏰ Ora:', new Date().toLocaleString('sq-AL'));
  
  try {
    // Krijo backup të plotë
    const backupResult = await backupService.createScheduledBackup();
    
    console.log('✅ Backup automatik u krye me sukses!');
    console.log('📁 File:', backupResult.filename);
    console.log('📊 Madhësia:', backupService.formatFileSize(backupResult.metadata.size));
    
    // Dërgo notification për të gjithë adminët
    try {
      const { pool } = require('../db');
      const adminUsers = await pool.query("SELECT id FROM users WHERE role = 'admin'");
      
      for (const admin of adminUsers.rows) {
        await NotificationService.createNotification(
          admin.id,
          '🤖 Backup Automatik u Krye',
          `Backup automatik u krijua me sukses. File: ${backupResult.filename}, Madhësia: ${backupService.formatFileSize(backupResult.metadata.size)}`,
          'success',
          'system',
          null,
          'backup',
          1
        );
      }
      
      console.log(`📧 Njoftimet u dërguan për ${adminUsers.rows.length} admin`);
    } catch (notificationError) {
      console.error('❌ Gabim në dërgimin e njoftimeve:', notificationError);
    }
    
    // Pastro backup të vjetër
    try {
      const cleanupResult = await backupService.cleanupOldBackups(30);
      console.log(`🧹 Pastrimi u krye: ${cleanupResult.deletedCount} backup të vjetër u fshinë`);
    } catch (cleanupError) {
      console.error('❌ Gabim në pastrimin e backup-ve:', cleanupError);
    }
    
    console.log('🎉 Backup automatik u përfundua me sukses!');
    
  } catch (error) {
    console.error('❌ Gabim në backup automatik:', error);
    
    // Dërgo notification për gabimin
    try {
      const { pool } = require('../db');
      const adminUsers = await pool.query("SELECT id FROM users WHERE role = 'admin'");
      
      for (const admin of adminUsers.rows) {
        await NotificationService.createNotification(
          admin.id,
          '❌ Gabim në Backup Automatik',
          `Backup automatik dështoi: ${error.message}`,
          'error',
          'system',
          null,
          'backup',
          3
        );
      }
    } catch (notificationError) {
      console.error('❌ Gabim në dërgimin e njoftimeve të gabimit:', notificationError);
    }
  }
}

// Funksioni për backup të pjesshëm të tabelave kritike
async function runCriticalTablesBackup() {
  console.log('🔐 Backup i tabelave kritike duke filluar...');
  
  try {
    const criticalTables = ['users', 'employees', 'contracts', 'payments'];
    const result = await backupService.createPartialBackup(
      criticalTables, 
      'Backup automatik i tabelave kritike'
    );
    
    console.log('✅ Backup i tabelave kritike u krye:', result.filename);
    
  } catch (error) {
    console.error('❌ Gabim në backup të tabelave kritike:', error);
  }
}

// Funksioni për verifikimin e backup-ve
async function verifyBackups() {
  console.log('🔍 Duke verifikuar backup-ve...');
  
  try {
    const backups = await backupService.listBackups();
    const recentBackups = backups.filter(backup => {
      const backupDate = new Date(backup.timestamp);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      return backupDate > oneDayAgo;
    });
    
    console.log(`📊 Gjetën ${recentBackups.length} backup të fundit (24 orët e fundit)`);
    
    if (recentBackups.length === 0) {
      console.warn('⚠️ Nuk ka backup të fundit!');
      
      // Dërgo alert për adminët
      try {
        const { pool } = require('../db');
        const adminUsers = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        
        for (const admin of adminUsers.rows) {
          await NotificationService.createNotification(
            admin.id,
            '⚠️ Backup i Fundit Mungon',
            'Nuk ka backup të krijuar në 24 orët e fundit. Kontrolloni sistemin!',
            'warning',
            'system',
            null,
            'backup',
            3
          );
        }
      } catch (notificationError) {
        console.error('❌ Gabim në dërgimin e alertit:', notificationError);
      }
    }
    
  } catch (error) {
    console.error('❌ Gabim në verifikimin e backup-ve:', error);
  }
}

// Funksioni për raportin e statusit
async function generateBackupReport() {
  console.log('📋 Duke gjeneruar raportin e backup-ve...');
  
  try {
    const backups = await backupService.listBackups();
    const status = await backupService.getDatabaseStatus();
    
    const report = {
      timestamp: new Date().toISOString(),
      totalBackups: backups.length,
      recentBackups: backups.filter(b => {
        const backupDate = new Date(b.timestamp);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return backupDate > oneWeekAgo;
      }).length,
      databaseStats: status.stats,
      totalSize: backups.reduce((sum, b) => sum + (b.size || 0), 0)
    };
    
    console.log('📊 Raporti i backup-ve:');
    console.log(`   - Total backup: ${report.totalBackups}`);
    console.log(`   - Backup të fundit (javë): ${report.recentBackups}`);
    console.log(`   - Madhësia totale: ${backupService.formatFileSize(report.totalSize)}`);
    console.log(`   - Përdorues: ${report.databaseStats.users_count}`);
    console.log(`   - Punonjës: ${report.databaseStats.employees_count}`);
    console.log(`   - Kontrata: ${report.databaseStats.contracts_count}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Gabim në gjenerimin e raportit:', error);
    return null;
  }
}

// Ekzekuto nëse script-i thirret direkt
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'full':
      runScheduledBackup();
      break;
    case 'critical':
      runCriticalTablesBackup();
      break;
    case 'verify':
      verifyBackups();
      break;
    case 'report':
      generateBackupReport();
      break;
    default:
      console.log('📖 Përdorimi:');
      console.log('   node backupScheduler.js full     - Backup i plotë');
      console.log('   node backupScheduler.js critical - Backup i tabelave kritike');
      console.log('   node backupScheduler.js verify   - Verifiko backup-ve');
      console.log('   node backupScheduler.js report   - Gjenero raport');
      break;
  }
}

module.exports = {
  runScheduledBackup,
  runCriticalTablesBackup,
  verifyBackups,
  generateBackupReport
}; 