const AuditService = require('./auditService');
const NotificationService = require('./notificationService');
const pool = require('../db');

class RealTimeAlertService {
  constructor() {
    this.auditService = new AuditService();
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.alertThresholds = {
      failedLogins: { count: 5, window: 60 * 60 * 1000 }, // 5 login të dështuar në 1 orë
      frequentDeletes: { count: 10, window: 24 * 60 * 60 * 1000 }, // 10 fshirje në 24 orë
      nightActivity: { count: 20, window: 24 * 60 * 60 * 1000 }, // 20 veprime në natë në 24 orë
      suspiciousIP: { enabled: true },
      highSeverityEvents: { count: 3, window: 60 * 60 * 1000 }, // 3 veprime kritike në 1 orë
      rapidChanges: { count: 50, window: 60 * 60 * 1000 }, // 50 ndryshime në 1 orë
      unauthorizedAccess: { enabled: true },
      dataExport: { enabled: true },
      backupOperations: { enabled: true },
      userPrivilegeChanges: { enabled: true }
    };
    
    this.alertHistory = new Map(); // Ruaj historikun e alerts për të shmangur spam
    this.suspiciousIPs = new Set(); // IP-të e verdhësishme
    this.userSessions = new Map(); // Sesionet aktive të përdoruesve
  }

  // Fillo monitorimin e real-time
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Real-time monitoring është tashmë aktiv');
      return;
    }

    console.log('🚀 Duke filluar real-time monitoring...');
    this.isMonitoring = true;

    // Kontrollo çdo 30 sekonda
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForSuspiciousActivity();
        await this.checkForAnomalies();
        await this.checkForSecurityEvents();
      } catch (error) {
        console.error('❌ Gabim në real-time monitoring:', error);
      }
    }, 30000); // 30 sekonda

    console.log('✅ Real-time monitoring u aktivizua');
  }

  // Ndalo monitorimin
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('⏹️ Real-time monitoring u ndal');
  }

  // Kontrollo aktivitet të verdhësishëm
  async checkForSuspiciousActivity() {
    try {
      const suspiciousActivities = await this.auditService.detectSuspiciousActivity(1); // Kontrollo 1 orën e fundit
      
      for (const activity of suspiciousActivities) {
        await this.processSuspiciousActivity(activity);
      }
    } catch (error) {
      console.error('❌ Gabim në kontrollin e aktivitetit të verdhësishëm:', error);
    }
  }

  // Proceso aktivitet të verdhësishëm
  async processSuspiciousActivity(activity) {
    const alertKey = `${activity.type}_${activity.user}`;
    const now = Date.now();
    
    // Kontrollo nëse kemi dërguar alert tashmë për këtë aktivitet
    if (this.alertHistory.has(alertKey)) {
      const lastAlert = this.alertHistory.get(alertKey);
      if (now - lastAlert < 60 * 60 * 1000) { // Mos dërgo alert për 1 orë
        return;
      }
    }

    // Dërgo alert
    await this.sendAlert({
      type: 'SUSPICIOUS_ACTIVITY',
      title: '⚠️ Aktivitet i Verdësishëm u Detektua',
      message: activity.description,
      severity: activity.severity,
      user: activity.user,
      metadata: {
        activityType: activity.type,
        count: activity.count,
        entityType: activity.entityType,
        timestamp: new Date().toISOString()
      }
    });

    // Ruaj në historik
    this.alertHistory.set(alertKey, now);
  }

  // Kontrollo anomalitete
  async checkForAnomalies() {
    try {
      // Kontrollo login të dështuar
      await this.checkFailedLogins();
      
      // Kontrollo veprime të shpeshta
      await this.checkFrequentOperations();
      
      // Kontrollo aktivitet në natë
      await this.checkNightActivity();
      
      // Kontrollo veprime kritike
      await this.checkHighSeverityEvents();
      
      // Kontrollo ndryshime të shpejta
      await this.checkRapidChanges();
      
    } catch (error) {
      console.error('❌ Gabim në kontrollin e anomaliteteve:', error);
    }
  }

  // Kontrollo login të dështuar
  async checkFailedLogins() {
    const threshold = this.alertThresholds.failedLogins;
    const windowStart = new Date(Date.now() - threshold.window);
    
    const result = await pool.query(`
      SELECT user_email, COUNT(*) as failed_count
      FROM audit_trail
      WHERE action = 'LOGIN_FAILED'
      AND timestamp >= $1
      GROUP BY user_email
      HAVING COUNT(*) >= $2
    `, [windowStart, threshold.count]);

    for (const row of result.rows) {
      await this.sendAlert({
        type: 'FAILED_LOGINS',
        title: '🔒 Tentativa të Shpeshta të Login të Dështuar',
        message: `${row.failed_count} tentativa të dështuara të login për ${row.user_email}`,
        severity: 'high',
        user: row.user_email,
        metadata: {
          failedCount: row.failed_count,
          timeWindow: threshold.window,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Kontrollo veprime të shpeshta
  async checkFrequentOperations() {
    const threshold = this.alertThresholds.frequentDeletes;
    const windowStart = new Date(Date.now() - threshold.window);
    
    const result = await pool.query(`
      SELECT user_email, entity_type, COUNT(*) as operation_count
      FROM audit_trail
      WHERE action = 'DELETE'
      AND timestamp >= $1
      GROUP BY user_email, entity_type
      HAVING COUNT(*) >= $2
    `, [windowStart, threshold.count]);

    for (const row of result.rows) {
      await this.sendAlert({
        type: 'FREQUENT_DELETES',
        title: '🗑️ Veprime të Shpeshta të Fshirjes',
        message: `${row.operation_count} fshirje të ${row.entity_type} nga ${row.user_email}`,
        severity: 'warning',
        user: row.user_email,
        metadata: {
          operationCount: row.operation_count,
          entityType: row.entity_type,
          timeWindow: threshold.window,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Kontrollo aktivitet në natë
  async checkNightActivity() {
    const threshold = this.alertThresholds.nightActivity;
    const windowStart = new Date(Date.now() - threshold.window);
    
    const result = await pool.query(`
      SELECT user_email, COUNT(*) as night_events
      FROM audit_trail
      WHERE EXTRACT(HOUR FROM timestamp) BETWEEN 22 AND 6
      AND timestamp >= $1
      GROUP BY user_email
      HAVING COUNT(*) >= $2
    `, [windowStart, threshold.count]);

    for (const row of result.rows) {
      await this.sendAlert({
        type: 'NIGHT_ACTIVITY',
        title: '🌙 Aktivitet i Pazakontë Gjatë Natës',
        message: `${row.night_events} veprime gjatë natës nga ${row.user_email}`,
        severity: 'medium',
        user: row.user_email,
        metadata: {
          nightEvents: row.night_events,
          timeWindow: threshold.window,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Kontrollo veprime kritike
  async checkHighSeverityEvents() {
    const threshold = this.alertThresholds.highSeverityEvents;
    const windowStart = new Date(Date.now() - threshold.window);
    
    const result = await pool.query(`
      SELECT user_email, action, entity_type, COUNT(*) as event_count
      FROM audit_trail
      WHERE severity = 'high'
      AND timestamp >= $1
      GROUP BY user_email, action, entity_type
      HAVING COUNT(*) >= $2
    `, [windowStart, threshold.count]);

    for (const row of result.rows) {
      await this.sendAlert({
        type: 'HIGH_SEVERITY_EVENTS',
        title: '🚨 Veprime Kritike të Shpeshta',
        message: `${row.event_count} veprime kritike (${row.action}) në ${row.entity_type} nga ${row.user_email}`,
        severity: 'high',
        user: row.user_email,
        metadata: {
          eventCount: row.event_count,
          action: row.action,
          entityType: row.entity_type,
          timeWindow: threshold.window,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Kontrollo ndryshime të shpejta
  async checkRapidChanges() {
    const threshold = this.alertThresholds.rapidChanges;
    const windowStart = new Date(Date.now() - threshold.window);
    
    const result = await pool.query(`
      SELECT user_email, COUNT(*) as change_count
      FROM audit_trail
      WHERE action IN ('UPDATE', 'CREATE', 'DELETE')
      AND timestamp >= $1
      GROUP BY user_email
      HAVING COUNT(*) >= $2
    `, [windowStart, threshold.count]);

    for (const row of result.rows) {
      await this.sendAlert({
        type: 'RAPID_CHANGES',
        title: '⚡ Ndryshime të Shpejta në Sistem',
        message: `${row.change_count} ndryshime në ${threshold.window / (60 * 60 * 1000)} orë nga ${row.user_email}`,
        severity: 'warning',
        user: row.user_email,
        metadata: {
          changeCount: row.change_count,
          timeWindow: threshold.window,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Kontrollo ngjarje sigurie
  async checkForSecurityEvents() {
    try {
      // Kontrollo akses të paautorizuar
      await this.checkUnauthorizedAccess();
      
      // Kontrollo eksportim të të dhënave
      await this.checkDataExport();
      
      // Kontrollo operacione backup
      await this.checkBackupOperations();
      
      // Kontrollo ndryshime privilegjesh
      await this.checkUserPrivilegeChanges();
      
    } catch (error) {
      console.error('❌ Gabim në kontrollin e ngjarjeve të sigurisë:', error);
    }
  }

  // Kontrollo akses të paautorizuar
  async checkUnauthorizedAccess() {
    if (!this.alertThresholds.unauthorizedAccess.enabled) return;

    const result = await pool.query(`
      SELECT ip_address, COUNT(*) as access_count
      FROM audit_trail
      WHERE action = 'LOGIN_FAILED'
      AND timestamp >= NOW() - INTERVAL '1 hour'
      GROUP BY ip_address
      HAVING COUNT(*) >= 10
    `);

    for (const row of result.rows) {
      if (!this.suspiciousIPs.has(row.ip_address)) {
        this.suspiciousIPs.add(row.ip_address);
        
        await this.sendAlert({
          type: 'UNAUTHORIZED_ACCESS',
          title: '🚫 Akses i Paautorizuar nga IP i Verdësishëm',
          message: `${row.access_count} tentativa të dështuara nga IP: ${row.ip_address}`,
          severity: 'high',
          metadata: {
            ipAddress: row.ip_address,
            accessCount: row.access_count,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  // Kontrollo eksportim të të dhënave
  async checkDataExport() {
    if (!this.alertThresholds.dataExport.enabled) return;

    const result = await pool.query(`
      SELECT user_email, action, COUNT(*) as export_count
      FROM audit_trail
      WHERE action LIKE '%EXPORT%' OR action LIKE '%DOWNLOAD%'
      AND timestamp >= NOW() - INTERVAL '1 hour'
      GROUP BY user_email, action
      HAVING COUNT(*) >= 5
    `);

    for (const row of result.rows) {
      await this.sendAlert({
        type: 'DATA_EXPORT',
        title: '📊 Eksportim i Shpeshtë i Të Dhënave',
        message: `${row.export_count} eksportime të ${row.action} nga ${row.user_email}`,
        severity: 'medium',
        user: row.user_email,
        metadata: {
          exportCount: row.export_count,
          action: row.action,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Kontrollo operacione backup
  async checkBackupOperations() {
    if (!this.alertThresholds.backupOperations.enabled) return;

    const result = await pool.query(`
      SELECT user_email, action, COUNT(*) as backup_count
      FROM audit_trail
      WHERE entity_type = 'backup'
      AND timestamp >= NOW() - INTERVAL '1 hour'
      GROUP BY user_email, action
      HAVING COUNT(*) >= 3
    `);

    for (const row of result.rows) {
      await this.sendAlert({
        type: 'BACKUP_OPERATIONS',
        title: '💾 Operacione të Shpeshta të Backup',
        message: `${row.backup_count} operacione backup (${row.action}) nga ${row.user_email}`,
        severity: 'info',
        user: row.user_email,
        metadata: {
          backupCount: row.backup_count,
          action: row.action,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Kontrollo ndryshime privilegjesh
  async checkUserPrivilegeChanges() {
    if (!this.alertThresholds.userPrivilegeChanges.enabled) return;

    const result = await pool.query(`
      SELECT user_email, action, entity_type, COUNT(*) as change_count
      FROM audit_trail
      WHERE (entity_type = 'users' AND action IN ('UPDATE', 'CREATE'))
      OR (action LIKE '%ROLE%' OR action LIKE '%PRIVILEGE%')
      AND timestamp >= NOW() - INTERVAL '1 hour'
      GROUP BY user_email, action, entity_type
      HAVING COUNT(*) >= 2
    `);

    for (const row of result.rows) {
      await this.sendAlert({
        type: 'USER_PRIVILEGE_CHANGES',
        title: '👤 Ndryshime të Privilegjesh të Përdoruesve',
        message: `${row.change_count} ndryshime privilegjesh (${row.action}) nga ${row.user_email}`,
        severity: 'high',
        user: row.user_email,
        metadata: {
          changeCount: row.change_count,
          action: row.action,
          entityType: row.entity_type,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Dërgo alert
  async sendAlert(alertData) {
    try {
      console.log(`🚨 [REAL-TIME ALERT] ${alertData.title}: ${alertData.message}`);

      // Merr adminët dhe menaxherët
      const result = await pool.query(`
        SELECT id, email, role
        FROM users
        WHERE role IN ('admin', 'manager')
        AND status = 'active'
      `);

      // Dërgo notification për çdo admin/manager
      for (const user of result.rows) {
        await NotificationService.createNotification(
          user.id,
          alertData.title,
          alertData.message,
          alertData.severity,
          'security',
          null,
          'real-time-alert',
          5, // Prioritet i lartë
          alertData.metadata
        );
      }

      // Ruaj alert në databazë
      await this.saveAlertToDatabase(alertData);

    } catch (error) {
      console.error('❌ Gabim në dërgimin e alert:', error);
    }
  }

  // Ruaj alert në databazë
  async saveAlertToDatabase(alertData) {
    try {
      await pool.query(`
        INSERT INTO audit_trail (
          action, entity_type, severity, description, metadata
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        `ALERT_${alertData.type}`,
        'security',
        alertData.severity,
        alertData.message,
        JSON.stringify(alertData.metadata)
      ]);
    } catch (error) {
      console.error('❌ Gabim në ruajtjen e alert në databazë:', error);
    }
  }

  // Përditëso thresholds
  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    console.log('✅ Thresholds u përditësuan:', this.alertThresholds);
  }

  // Merr statusin e monitoring
  getMonitoringStatus() {
    return {
      isActive: this.isMonitoring,
      thresholds: this.alertThresholds,
      suspiciousIPs: Array.from(this.suspiciousIPs),
      alertHistorySize: this.alertHistory.size,
      activeSessions: this.userSessions.size
    };
  }

  // Pastro historikun e vjetër
  cleanupOldHistory() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const [key, timestamp] of this.alertHistory.entries()) {
      if (timestamp < oneHourAgo) {
        this.alertHistory.delete(key);
      }
    }
    
    console.log('🧹 Historiku i vjetër i alerts u pastrua');
  }

  // Shto sesion përdoruesi
  addUserSession(userId, sessionData) {
    this.userSessions.set(userId, {
      ...sessionData,
      lastActivity: Date.now()
    });
  }

  // Hiq sesion përdoruesi
  removeUserSession(userId) {
    this.userSessions.delete(userId);
  }

  // Përditëso aktivitetin e sesionit
  updateSessionActivity(userId) {
    const session = this.userSessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
      this.userSessions.set(userId, session);
    }
  }
}

module.exports = RealTimeAlertService; 