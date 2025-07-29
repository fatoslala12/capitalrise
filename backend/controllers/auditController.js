const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');

const auditService = new AuditService();

// Merr audit logs me filtra
exports.getAuditLogs = async (req, res) => {
  try {
    const { user } = req;
    const {
      userId,
      entityType,
      entityId,
      action,
      severity,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      sortBy = 'timestamp',
      sortOrder = 'DESC'
    } = req.query;

    console.log(`[AUDIT] Përdoruesi ${user.email} po shikon audit logs`);

    const auditLogs = await auditService.getAuditLogs({
      userId: userId ? parseInt(userId) : null,
      entityType,
      entityId,
      action,
      severity,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: auditLogs,
      count: auditLogs.length
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së audit logs',
      error: error.message
    });
  }
};

// Merr statistika të audit trail
exports.getAuditStats = async (req, res) => {
  try {
    const { user } = req;
    const { startDate, endDate, userId } = req.query;

    console.log(`[AUDIT] Përdoruesi ${user.email} po shikon audit stats`);

    const stats = await auditService.getAuditStats({
      startDate,
      endDate,
      userId: userId ? parseInt(userId) : null
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së audit stats',
      error: error.message
    });
  }
};

// Merr aktivitetin e përdoruesit
exports.getUserActivity = async (req, res) => {
  try {
    const { user } = req;
    const { userId, days = 30 } = req.query;

    console.log(`[AUDIT] Përdoruesi ${user.email} po shikon aktivitetin e përdoruesit ${userId}`);

    const activity = await auditService.getUserActivity(
      parseInt(userId || user.id),
      parseInt(days)
    );

    res.json({
      success: true,
      data: activity
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e aktivitetit të përdoruesit:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së aktivitetit të përdoruesit',
      error: error.message
    });
  }
};

// Merr entitetet më të aktivizuara
exports.getMostActiveEntities = async (req, res) => {
  try {
    const { user } = req;
    const { days = 30, limit = 10 } = req.query;

    console.log(`[AUDIT] Përdoruesi ${user.email} po shikon entitetet më aktive`);

    const entities = await auditService.getMostActiveEntities(
      parseInt(days),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: entities
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e entiteteve më aktive:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së entiteteve më aktive',
      error: error.message
    });
  }
};

// Eksporto audit logs në CSV
exports.exportAuditLogsCSV = async (req, res) => {
  try {
    const { user } = req;
    const { startDate, endDate, entityType, action } = req.query;

    console.log(`[AUDIT] Përdoruesi ${user.email} po eksporton audit logs në CSV`);

    const auditLogs = await auditService.exportAuditLogsCSV({
      startDate,
      endDate,
      entityType,
      action
    });

    // Konverto në CSV format
    const csvHeaders = [
      'Timestamp',
      'User Email',
      'User Role',
      'Action',
      'Entity Type',
      'Entity ID',
      'Severity',
      'Description',
      'IP Address',
      'Old Values',
      'New Values',
      'Changes'
    ];

    const csvRows = auditLogs.map(log => [
      log.timestamp,
      log.user_email,
      log.user_role,
      log.action,
      log.entity_type,
      log.entity_id,
      log.severity,
      log.description,
      log.ip_address,
      log.old_values ? JSON.stringify(log.old_values) : '',
      log.new_values ? JSON.stringify(log.new_values) : '',
      log.changes ? JSON.stringify(log.changes) : ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('[ERROR] Gabim në eksportimin e audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë eksportimit të audit logs',
      error: error.message
    });
  }
};

// Detekto aktivitet të verdhësishëm
exports.detectSuspiciousActivity = async (req, res) => {
  try {
    const { user } = req;
    const { hours = 24 } = req.query;

    console.log(`[AUDIT] Përdoruesi ${user.email} po kontrollon aktivitet të verdhësishëm`);

    const suspiciousActivities = await auditService.detectSuspiciousActivity(parseInt(hours));

    // Dërgo notification për aktivitet të verdhësishëm
    if (suspiciousActivities.length > 0) {
      try {
        await NotificationService.createNotification(
          user.id,
          '⚠️ Aktivitet i Verdësishëm u Detektua',
          `${suspiciousActivities.length} aktivitete të verdhësishëm u gjetën në ${hours} orët e fundit`,
          'warning',
          'security',
          null,
          'audit',
          3
        );
      } catch (notificationError) {
        console.error('[ERROR] Failed to send suspicious activity notification:', notificationError);
      }
    }

    res.json({
      success: true,
      data: suspiciousActivities,
      count: suspiciousActivities.length
    });

  } catch (error) {
    console.error('[ERROR] Gabim në detektimin e aktivitetit të verdhësishëm:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë detektimit të aktivitetit të verdhësishëm',
      error: error.message
    });
  }
};

// Pastro audit logs të vjetër
exports.cleanupOldAuditLogs = async (req, res) => {
  try {
    const { user } = req;
    const { daysToKeep = 365 } = req.body;

    // Vetëm adminët mund të pastrojnë audit logs
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vetëm adminët mund të pastrojnë audit logs'
      });
    }

    console.log(`[AUDIT] Përdoruesi ${user.email} po pastron audit logs të vjetër (${daysToKeep} ditë)`);

    const deletedCount = await auditService.cleanupOldAuditLogs(parseInt(daysToKeep));

    // Dërgo notification
    try {
      await NotificationService.createNotification(
        user.id,
        '🧹 Audit Logs të Vjetër u Pastrën',
        `${deletedCount} audit logs të vjetër u fshinë automatikisht`,
        'info',
        'system',
        null,
        'audit',
        1
      );
    } catch (notificationError) {
      console.error('[ERROR] Failed to send cleanup notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Audit logs të vjetër u pastrën me sukses',
      data: { deletedCount }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në pastrimin e audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë pastrimit të audit logs',
      error: error.message
    });
  }
};

// Merr audit trail për një entitet specifik
exports.getEntityAuditTrail = async (req, res) => {
  try {
    const { user } = req;
    const { entityType, entityId } = req.params;
    const { limit = 50 } = req.query;

    console.log(`[AUDIT] Përdoruesi ${user.email} po shikon audit trail për ${entityType} ${entityId}`);

    const auditLogs = await auditService.getAuditLogs({
      entityType,
      entityId,
      limit: parseInt(limit),
      sortBy: 'timestamp',
      sortOrder: 'DESC'
    });

    res.json({
      success: true,
      data: auditLogs,
      entityType,
      entityId
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e audit trail për entitet:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së audit trail për entitet',
      error: error.message
    });
  }
};

// Merr audit trail për një përdorues specifik
exports.getUserAuditTrail = async (req, res) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    const { days = 30, limit = 100 } = req.query;

    console.log(`[AUDIT] Përdoruesi ${user.email} po shikon audit trail për përdoruesin ${userId}`);

    const auditLogs = await auditService.getAuditLogs({
      userId: parseInt(userId),
      limit: parseInt(limit),
      sortBy: 'timestamp',
      sortOrder: 'DESC'
    });

    // Filtro sipas ditëve nëse specifikohet
    let filteredLogs = auditLogs;
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
      filteredLogs = auditLogs.filter(log => new Date(log.timestamp) >= cutoffDate);
    }

    res.json({
      success: true,
      data: filteredLogs,
      userId,
      days: parseInt(days)
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e audit trail për përdorues:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së audit trail për përdorues',
      error: error.message
    });
  }
};

// Merr raportin e audit trail
exports.getAuditReport = async (req, res) => {
  try {
    const { user } = req;
    const { startDate, endDate, entityType } = req.query;

    console.log(`[AUDIT] Përdoruesi ${user.email} po gjeneron raportin e audit trail`);

    // Merr të gjitha të dhënat e nevojshme
    const [stats, mostActiveEntities, suspiciousActivities] = await Promise.all([
      auditService.getAuditStats({ startDate, endDate }),
      auditService.getMostActiveEntities(30, 10),
      auditService.detectSuspiciousActivity(24)
    ]);

    const report = {
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      stats,
      mostActiveEntities,
      suspiciousActivities,
      summary: {
        totalEvents: stats.total_events,
        uniqueUsers: stats.unique_users,
        entityTypes: stats.entity_types,
        highSeverityEvents: stats.high_severity_events,
        suspiciousActivitiesCount: suspiciousActivities.length
      }
    };

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('[ERROR] Gabim në gjenerimin e raportit të audit trail:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë gjenerimit të raportit të audit trail',
      error: error.message
    });
  }
}; 