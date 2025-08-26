const { pool } = require('../db'); // Updated to use new structure
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDirectory();
  }

  // Krijo direktorinë e backup-ve nëse nuk ekziston
  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log('✅ Direktoria e backup-ve u krijua:', this.backupDir);
    }
  }

  // Kontrollo nëse direktoria e backup-ve ekziston
  async checkBackupDirectory() {
    try {
      await fs.access(this.backupDir);
      return true;
    } catch {
      return false;
    }
  }

  // Krijo backup të plotë të databazës
  async createFullBackup(description = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-full-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    try {
      console.log('🔄 Duke krijuar backup të plotë...');
      
      // Merr connection string nga environment
      const connectionString = process.env.DATABASE_URL;
      
      // Krijo backup me pg_dump
      const pgDumpCommand = `pg_dump "${connectionString}" --no-owner --no-privileges --clean --if-exists > "${filepath}"`;
      
      await execAsync(pgDumpCommand);
      
      // Krijo metadata për backup-in
      const metadata = {
        filename,
        timestamp: new Date().toISOString(),
        description,
        type: 'full',
        size: (await fs.stat(filepath)).size,
        tables: await this.getTableInfo(),
        created_by: 'system'
      };
      
      // Ruaj metadata
      const metadataPath = filepath.replace('.sql', '.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log('✅ Backup i plotë u krijua me sukses:', filename);
      console.log('📊 Madhësia e file:', this.formatFileSize(metadata.size));
      
      return {
        success: true,
        filename,
        filepath,
        metadata
      };
      
    } catch (error) {
      console.error('❌ Gabim gjatë krijimit të backup:', error);
      throw new Error(`Gabim në backup: ${error.message}`);
    }
  }

  // Krijo backup të pjesshëm (vetëm tabela specifike)
  async createPartialBackup(tables, description = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-partial-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    try {
      console.log('🔄 Duke krijuar backup të pjesshëm...');
      
      const connectionString = process.env.DATABASE_URL;
      
      // Krijo backup vetëm për tabelat e specifikuara
      const tableList = tables.join(' ');
      const pgDumpCommand = `pg_dump "${connectionString}" --no-owner --no-privileges --clean --if-exists --table=${tableList} > "${filepath}"`;
      
      await execAsync(pgDumpCommand);
      
      const metadata = {
        filename,
        timestamp: new Date().toISOString(),
        description,
        type: 'partial',
        tables,
        size: (await fs.stat(filepath)).size,
        created_by: 'system'
      };
      
      const metadataPath = filepath.replace('.sql', '.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log('✅ Backup i pjesshëm u krijua me sukses:', filename);
      console.log('📋 Tabelat e backup-uara:', tables.join(', '));
      
      return {
        success: true,
        filename,
        filepath,
        metadata
      };
      
    } catch (error) {
      console.error('❌ Gabim gjatë krijimit të backup të pjesshëm:', error);
      throw new Error(`Gabim në backup të pjesshëm: ${error.message}`);
    }
  }

  // Restore backup nga file
  async restoreBackup(filename) {
    const filepath = path.join(this.backupDir, filename);
    
    try {
      console.log('🔄 Duke restauruar backup...');
      
      // Kontrollo nëse file ekziston
      await fs.access(filepath);
      
      const connectionString = process.env.DATABASE_URL;
      
      // Restore me psql
      const psqlCommand = `psql "${connectionString}" < "${filepath}"`;
      
      await execAsync(psqlCommand);
      
      console.log('✅ Backup u restaurua me sukses:', filename);
      
      return {
        success: true,
        filename,
        message: 'Backup u restaurua me sukses'
      };
      
    } catch (error) {
      console.error('❌ Gabim gjatë restaurimit:', error);
      throw new Error(`Gabim në restore: ${error.message}`);
    }
  }

  // Merr listën e të gjitha backup-ve
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filepath = path.join(this.backupDir, file);
          const metadataPath = filepath.replace('.sql', '.json');
          
          let metadata = null;
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            metadata = JSON.parse(metadataContent);
          } catch {
            // Nëse nuk ka metadata, krijo një të thjeshtë
            const stats = await fs.stat(filepath);
            metadata = {
              filename: file,
              timestamp: stats.mtime.toISOString(),
              type: 'unknown',
              size: stats.size
            };
          }
          
          backups.push(metadata);
        }
      }
      
      // Sorto sipas datës (më i ri më parë)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return backups;
      
    } catch (error) {
      console.error('❌ Gabim gjatë listimit të backup-ve:', error);
      throw new Error(`Gabim në listimin e backup-ve: ${error.message}`);
    }
  }

  // Fshi backup të vjetër
  async deleteBackup(filename) {
    const filepath = path.join(this.backupDir, filename);
    const metadataPath = filepath.replace('.sql', '.json');
    
    try {
      // Fshi file-in kryesor
      await fs.unlink(filepath);
      
      // Fshi metadata nëse ekziston
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata mund të mos ekzistojë
      }
      
      console.log('✅ Backup u fshi me sukses:', filename);
      
      return {
        success: true,
        filename,
        message: 'Backup u fshi me sukses'
      };
      
    } catch (error) {
      console.error('❌ Gabim gjatë fshirjes së backup:', error);
      throw new Error(`Gabim në fshirjen e backup: ${error.message}`);
    }
  }

  // Fshi backup të vjetër automatikisht (retention policy)
  async cleanupOldBackups(retentionDays = 30) {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const oldBackups = backups.filter(backup => 
        new Date(backup.timestamp) < cutoffDate
      );
      
      console.log(`🧹 Duke fshirë ${oldBackups.length} backup të vjetër...`);
      
      for (const backup of oldBackups) {
        await this.deleteBackup(backup.filename);
      }
      
      console.log('✅ Pastrimi i backup-ve të vjetër u krye me sukses');
      
      return {
        success: true,
        deletedCount: oldBackups.length,
        message: `${oldBackups.length} backup të vjetër u fshinë`
      };
      
    } catch (error) {
      console.error('❌ Gabim gjatë pastrimit të backup-ve:', error);
      throw new Error(`Gabim në pastrimin e backup-ve: ${error.message}`);
    }
  }

  // Merr informacion për tabelat
  async getTableInfo() {
    try {
      const result = await pool.query(`
        SELECT 
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
          (SELECT COUNT(*) FROM ${t.table_name}) as row_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      return result.rows;
    } catch (error) {
      console.error('❌ Gabim gjatë marrjes së informacionit të tabelave:', error);
      return [];
    }
  }

  // Formato madhësinë e file
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Kontrollo statusin e databazës
  async getDatabaseStatus() {
    try {
      const result = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM employees) as employees_count,
          (SELECT COUNT(*) FROM contracts) as contracts_count,
          (SELECT COUNT(*) FROM work_hours) as work_hours_count,
          (SELECT COUNT(*) FROM payments) as payments_count,
          (SELECT COUNT(*) FROM tasks) as tasks_count,
          (SELECT COUNT(*) FROM expenses_invoices) as expenses_count,
          (SELECT COUNT(*) FROM invoices) as invoices_count,
          (SELECT COUNT(*) FROM notifications) as notifications_count
      `);
      
      return {
        success: true,
        stats: result.rows[0],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Gabim gjatë marrjes së statusit të databazës:', error);
      throw new Error(`Gabim në statusin e databazës: ${error.message}`);
    }
  }

  // Krijo backup automatik (për cron job)
  async createScheduledBackup() {
    try {
      console.log('🤖 Backup automatik duke filluar...');
      
      const result = await this.createFullBackup('Backup automatik i ditës');
      
      // Pastro backup të vjetër
      await this.cleanupOldBackups(30);
      
      console.log('✅ Backup automatik u krye me sukses');
      
      return result;
    } catch (error) {
      console.error('❌ Gabim në backup automatik:', error);
      throw error;
    }
  }
}

module.exports = BackupService; 