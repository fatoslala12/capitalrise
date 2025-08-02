const RealTimeAlertService = require('../services/realTimeAlertService');
const NotificationService = require('../services/notificationService');

const realTimeAlertService = new RealTimeAlertService();

// Fillo real-time monitoring
exports.startMonitoring = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po fillon real-time monitoring`);

    // Kontrollo nëse service është i disponueshëm
    if (!realTimeAlertService) {
      throw new Error('Real-time alert service nuk është i disponueshëm');
    }

    await realTimeAlertService.startMonitoring();

    res.json({
      success: true,
      message: 'Real-time monitoring u aktivizua me sukses',
      data: {
        isActive: true,
        startedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në fillimin e real-time monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë fillimit të real-time monitoring',
      error: error.message
    });
  }
};

// Ndalo real-time monitoring
exports.stopMonitoring = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po ndalon real-time monitoring`);

    realTimeAlertService.stopMonitoring();

    res.json({
      success: true,
      message: 'Real-time monitoring u ndal me sukses',
      data: {
        isActive: false,
        stoppedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në ndalimin e real-time monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë ndalimit të real-time monitoring',
      error: error.message
    });
  }
};

// Merr statusin e monitoring
exports.getMonitoringStatus = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po shikon statusin e monitoring`);

    const status = realTimeAlertService.getMonitoringStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e statusit të monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së statusit të monitoring',
      error: error.message
    });
  }
};

// Përditëso thresholds
exports.updateThresholds = async (req, res) => {
  try {
    const { user } = req;
    const { thresholds } = req.body;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po përditëson thresholds`);

    realTimeAlertService.updateThresholds(thresholds);

    res.json({
      success: true,
      message: 'Thresholds u përditësuan me sukses',
      data: {
        updatedAt: new Date().toISOString(),
        thresholds: realTimeAlertService.alertThresholds
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në përditësimin e thresholds:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë përditësimit të thresholds',
      error: error.message
    });
  }
};

// Test alert
exports.testAlert = async (req, res) => {
  try {
    const { user } = req;
    const { alertType = 'TEST' } = req.body;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po teston alert: ${alertType}`);

    await realTimeAlertService.sendAlert({
      type: alertType,
      title: '🧪 Test Alert',
      message: 'Ky është një test alert për të verifikuar funksionalitetin e sistemit',
      severity: 'info',
      user: user.email,
      metadata: {
        testType: alertType,
        triggeredBy: user.email,
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Test alert u dërgua me sukses',
      data: {
        alertType,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në dërgimin e test alert:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë dërgimit të test alert',
      error: error.message
    });
  }
};

// Merr alerts të fundit
exports.getRecentAlerts = async (req, res) => {
  try {
    const { user } = req;
    const { limit = 50, hours = 24 } = req.query;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po shikon alerts e fundit`);

    const result = await pool.query(`
      SELECT *
      FROM audit_trail
      WHERE action LIKE 'ALERT_%'
      AND timestamp >= NOW() - INTERVAL '${hours} hours'
      ORDER BY timestamp DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e alerts të fundit:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së alerts të fundit',
      error: error.message
    });
  }
};

// Merr statistika të alerts
exports.getAlertStats = async (req, res) => {
  try {
    const { user } = req;
    const { days = 7 } = req.query;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po shikon statistika të alerts`);

    const result = await pool.query(`
      SELECT 
        DATE(timestamp) as date,
        action,
        severity,
        COUNT(*) as alert_count
      FROM audit_trail
      WHERE action LIKE 'ALERT_%'
      AND timestamp >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(timestamp), action, severity
      ORDER BY date DESC, alert_count DESC
    `);

    // Gruppo sipas datës
    const statsByDate = {};
    result.rows.forEach(row => {
      if (!statsByDate[row.date]) {
        statsByDate[row.date] = {
          date: row.date,
          total: 0,
          bySeverity: { high: 0, medium: 0, low: 0, info: 0 },
          byType: {}
        };
      }
      
      statsByDate[row.date].total += parseInt(row.alert_count);
      statsByDate[row.date].bySeverity[row.severity] += parseInt(row.alert_count);
      
      const alertType = row.action.replace('ALERT_', '');
      if (!statsByDate[row.date].byType[alertType]) {
        statsByDate[row.date].byType[alertType] = 0;
      }
      statsByDate[row.date].byType[alertType] += parseInt(row.alert_count);
    });

    res.json({
      success: true,
      data: {
        statsByDate: Object.values(statsByDate),
        totalAlerts: result.rows.reduce((sum, row) => sum + parseInt(row.alert_count), 0),
        period: `${days} ditë`
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e statistika të alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së statistika të alerts',
      error: error.message
    });
  }
};

// Pastro alerts të vjetër
exports.cleanupOldAlerts = async (req, res) => {
  try {
    const { user } = req;
    const { days = 30 } = req.body;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po pastron alerts të vjetër (${days} ditë)`);

    const result = await pool.query(`
      DELETE FROM audit_trail
      WHERE action LIKE 'ALERT_%'
      AND timestamp < NOW() - INTERVAL '${days} days'
    `);

    // Pastro edhe historikun e vjetër
    realTimeAlertService.cleanupOldHistory();

    res.json({
      success: true,
      message: `U fshinë ${result.rowCount} alerts të vjetër`,
      data: {
        deletedCount: result.rowCount,
        retentionDays: days,
        cleanedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në pastrimin e alerts të vjetër:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë pastrimit të alerts të vjetër',
      error: error.message
    });
  }
};

// Konfiguro alert rules
exports.configureAlertRules = async (req, res) => {
  try {
    const { user } = req;
    const { rules } = req.body;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po konfiguron alert rules`);

    // Validizo rules
    const validRules = {};
    for (const [ruleName, ruleConfig] of Object.entries(rules)) {
      if (ruleConfig.enabled !== undefined) {
        validRules[ruleName] = { enabled: ruleConfig.enabled };
      }
      if (ruleConfig.count !== undefined && ruleConfig.window !== undefined) {
        validRules[ruleName] = { 
          count: parseInt(ruleConfig.count), 
          window: parseInt(ruleConfig.window) 
        };
      }
    }

    realTimeAlertService.updateThresholds(validRules);

    res.json({
      success: true,
      message: 'Alert rules u konfiguruan me sukses',
      data: {
        configuredRules: validRules,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në konfigurimin e alert rules:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë konfigurimit të alert rules',
      error: error.message
    });
  }
};

// Merr alert rules aktuale
exports.getAlertRules = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po shikon alert rules`);

    const currentRules = realTimeAlertService.alertThresholds;

    res.json({
      success: true,
      data: {
        rules: currentRules,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e alert rules:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së alert rules',
      error: error.message
    });
  }
};

// Shto IP të verdhësishëm
exports.addSuspiciousIP = async (req, res) => {
  try {
    const { user } = req;
    const { ipAddress, reason } = req.body;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po shton IP të verdhësishëm: ${ipAddress}`);

    realTimeAlertService.suspiciousIPs.add(ipAddress);

    // Ruaj në databazë
    await pool.query(`
      INSERT INTO audit_trail (
        action, entity_type, severity, description, metadata
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      'ALERT_SUSPICIOUS_IP_ADDED',
      'security',
      'high',
      `IP i verdhësishëm u shtua: ${ipAddress}`,
      JSON.stringify({ ipAddress, reason, addedBy: user.email })
    ]);

    res.json({
      success: true,
      message: 'IP i verdhësishëm u shtua me sukses',
      data: {
        ipAddress,
        reason,
        addedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në shtimin e IP të verdhësishëm:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë shtimit të IP të verdhësishëm',
      error: error.message
    });
  }
};

// Hiq IP të verdhësishëm
exports.removeSuspiciousIP = async (req, res) => {
  try {
    const { user } = req;
    const { ipAddress } = req.params;
    
    console.log(`[REAL-TIME] Përdoruesi ${user.email} po heq IP të verdhësishëm: ${ipAddress}`);

    realTimeAlertService.suspiciousIPs.delete(ipAddress);

    // Ruaj në databazë
    await pool.query(`
      INSERT INTO audit_trail (
        action, entity_type, severity, description, metadata
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      'ALERT_SUSPICIOUS_IP_REMOVED',
      'security',
      'info',
      `IP i verdhësishëm u hoq: ${ipAddress}`,
      JSON.stringify({ ipAddress, removedBy: user.email })
    ]);

    res.json({
      success: true,
      message: 'IP i verdhësishëm u hoq me sukses',
      data: {
        ipAddress,
        removedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në heqjen e IP të verdhësishëm:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë heqjes së IP të verdhësishëm',
      error: error.message
    });
  }
}; 