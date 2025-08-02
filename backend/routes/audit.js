const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Get audit logs with advanced filtering
router.get('/logs', verifyToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      module, 
      user, 
      dateFrom, 
      dateTo,
      severity,
      ipAddress,
      entityType,
      entityId,
      hasChanges,
      timeRange
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        al.id,
        al.action,
        al.module,
        al.description,
        al.user_id,
        al.timestamp,
        al.details,
        al.severity,
        al.ip_address,
        al.entity_type,
        al.entity_id,
        u.email as user_email,
        CONCAT(e.name, ' ', e.surname) as user_name
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (module) {
      query += ` AND al.module = ?`;
      params.push(module);
    }

    if (user) {
      query += ` AND (u.email LIKE ? OR CONCAT(e.name, ' ', e.surname) LIKE ?)`;
      params.push(`%${user}%`, `%${user}%`);
    }

    if (dateFrom) {
      query += ` AND al.timestamp >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND al.timestamp <= ?`;
      params.push(dateTo + ' 23:59:59');
    }

    if (severity) {
      query += ` AND al.severity = ?`;
      params.push(severity);
    }

    if (ipAddress) {
      query += ` AND al.ip_address LIKE ?`;
      params.push(`%${ipAddress}%`);
    }

    if (entityType) {
      query += ` AND al.entity_type = ?`;
      params.push(entityType);
    }

    if (entityId) {
      query += ` AND al.entity_id = ?`;
      params.push(entityId);
    }

    if (hasChanges === 'true') {
      query += ` AND al.details IS NOT NULL AND al.details != '{}'`;
    }

    // Handle time range shortcuts
    if (timeRange && timeRange !== 'custom') {
      const now = new Date();
      let startDate;
      switch (timeRange) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }
      if (startDate) {
        query += ` AND al.timestamp >= ?`;
        params.push(startDate.toISOString().split('T')[0]);
      }
    }

    query += ` ORDER BY al.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [logs] = await db.execute(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (action) {
      countQuery += ` AND al.action = ?`;
      countParams.push(action);
    }

    if (module) {
      countQuery += ` AND al.module = ?`;
      countParams.push(module);
    }

    if (user) {
      countQuery += ` AND (u.email LIKE ? OR CONCAT(e.name, ' ', e.surname) LIKE ?)`;
      countParams.push(`%${user}%`, `%${user}%`);
    }

    if (dateFrom) {
      countQuery += ` AND al.timestamp >= ?`;
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countQuery += ` AND al.timestamp <= ?`;
      countParams.push(dateTo + ' 23:59:59');
    }

    if (severity) {
      countQuery += ` AND al.severity = ?`;
      countParams.push(severity);
    }

    if (ipAddress) {
      countQuery += ` AND al.ip_address LIKE ?`;
      countParams.push(`%${ipAddress}%`);
    }

    if (entityType) {
      countQuery += ` AND al.entity_type = ?`;
      countParams.push(entityType);
    }

    if (entityId) {
      countQuery += ` AND al.entity_id = ?`;
      countParams.push(entityId);
    }

    if (hasChanges === 'true') {
      countQuery += ` AND al.details IS NOT NULL AND al.details != '{}'`;
    }

    if (timeRange && timeRange !== 'custom') {
      const now = new Date();
      let startDate;
      switch (timeRange) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }
      if (startDate) {
        countQuery += ` AND al.timestamp >= ?`;
        countParams.push(startDate.toISOString().split('T')[0]);
      }
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      data: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Gabim gjatë marrjes së audit logs' });
  }
});

// Get audit statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    let whereClause = '';
    const params = [];

    if (dateFrom || dateTo) {
      whereClause = 'WHERE ';
      if (dateFrom) {
        whereClause += 'timestamp >= ?';
        params.push(dateFrom);
      }
      if (dateTo) {
        whereClause += dateFrom ? ' AND ' : '';
        whereClause += 'timestamp <= ?';
        params.push(dateTo + ' 23:59:59');
      }
    }

    // Total logs
    const totalQuery = `SELECT COUNT(*) as total FROM audit_trail ${whereClause}`;
    const [totalResult] = await db.execute(totalQuery, params);
    const totalLogs = totalResult[0].total;

    // Today's logs
    const todayQuery = `
      SELECT COUNT(*) as today 
      FROM audit_trail 
      WHERE DATE(timestamp) = CURDATE()
    `;
    const [todayResult] = await db.execute(todayQuery);
    const todayLogs = todayResult[0].today;

    // Action statistics
    const actionStatsQuery = `
      SELECT action, COUNT(*) as count
      FROM audit_trail
      ${whereClause}
      GROUP BY action
      ORDER BY count DESC
    `;
    const [actionStats] = await db.execute(actionStatsQuery, params);

    // Calculate action counts
    const createCount = actionStats.find(s => s.action === 'CREATE')?.count || 0;
    const updateCount = actionStats.find(s => s.action === 'UPDATE')?.count || 0;
    const deleteCount = actionStats.find(s => s.action === 'DELETE')?.count || 0;
    const loginCount = actionStats.find(s => s.action === 'LOGIN')?.count || 0;
    const paymentCount = actionStats.find(s => s.action === 'PAYMENT')?.count || 0;

    // Active users (last 7 days)
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM audit_trail
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    const [activeUsersResult] = await db.execute(activeUsersQuery);
    const activeUsers = activeUsersResult[0].active_users;

    res.json({
      data: {
        totalLogs,
        todayLogs,
        activeUsers,
        createCount,
        updateCount,
        deleteCount,
        loginCount,
        paymentCount,
        actionStats
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Gabim gjatë marrjes së statistikave' });
  }
});

// Get suspicious activities
router.get('/suspicious-activity', verifyToken, async (req, res) => {
  try {
    const suspiciousQuery = `
      SELECT 
        al.*,
        u.email as user_email,
        CONCAT(e.name, ' ', e.surname) as user_name
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE al.severity IN ('high', 'warning')
      OR al.action = 'DELETE'
      OR al.action = 'LOGIN'
      ORDER BY al.timestamp DESC
      LIMIT 20
    `;
    
    const [suspiciousActivities] = await db.execute(suspiciousQuery);
    
    res.json({
      data: suspiciousActivities.map(activity => ({
        ...activity,
        details: activity.details ? JSON.parse(activity.details) : null
      }))
    });
  } catch (error) {
    console.error('Error fetching suspicious activities:', error);
    res.status(500).json({ error: 'Gabim gjatë marrjes së aktiviteteve të dyshimta' });
  }
});

// Get most active entities
router.get('/most-active-entities', verifyToken, async (req, res) => {
  try {
    const entitiesQuery = `
      SELECT 
        entity_type,
        entity_id,
        COUNT(*) as activity_count,
        MAX(timestamp) as last_activity
      FROM audit_trail
      WHERE entity_type IS NOT NULL
      GROUP BY entity_type, entity_id
      ORDER BY activity_count DESC
      LIMIT 10
    `;
    
    const [entities] = await db.execute(entitiesQuery);
    
    res.json({
      data: entities
    });
  } catch (error) {
    console.error('Error fetching most active entities:', error);
    res.status(500).json({ error: 'Gabim gjatë marrjes së entiteteve më aktive' });
  }
});

// Export to Excel
router.get('/export-excel', verifyToken, async (req, res) => {
  try {
    const { action, module, user, dateFrom, dateTo, severity, limit = 1000 } = req.query;
    
    let query = `
      SELECT 
        al.id,
        al.action,
        al.module,
        al.description,
        al.user_id,
        al.timestamp,
        al.details,
        al.severity,
        al.ip_address,
        al.entity_type,
        al.entity_id,
        u.email as user_email,
        CONCAT(e.name, ' ', e.surname) as user_name
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (module) {
      query += ` AND al.module = ?`;
      params.push(module);
    }

    if (user) {
      query += ` AND (u.email LIKE ? OR CONCAT(e.name, ' ', e.surname) LIKE ?)`;
      params.push(`%${user}%`, `%${user}%`);
    }

    if (dateFrom) {
      query += ` AND al.timestamp >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND al.timestamp <= ?`;
      params.push(dateTo + ' 23:59:59');
    }

    if (severity) {
      query += ` AND al.severity = ?`;
      params.push(severity);
    }

    query += ` ORDER BY al.timestamp DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [logs] = await db.execute(query, params);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Veprimi', key: 'action', width: 15 },
      { header: 'Moduli', key: 'module', width: 15 },
      { header: 'Përshkrimi', key: 'description', width: 40 },
      { header: 'Përdoruesi', key: 'user_name', width: 25 },
      { header: 'Data', key: 'timestamp', width: 20 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'IP Adresa', key: 'ip_address', width: 15 },
      { header: 'Entity Type', key: 'entity_type', width: 15 },
      { header: 'Entity ID', key: 'entity_id', width: 12 },
      { header: 'Detaje', key: 'details', width: 50 }
    ];

    // Add data
    logs.forEach(log => {
      worksheet.addRow({
        id: log.id,
        action: log.action,
        module: log.module,
        description: log.description,
        user_name: log.user_name || log.user_email || 'Sistemi',
        timestamp: new Date(log.timestamp).toLocaleString('sq-AL'),
        severity: log.severity || 'info',
        ip_address: log.ip_address || '',
        entity_type: log.entity_type || '',
        entity_id: log.entity_id || '',
        details: log.details ? JSON.stringify(JSON.parse(log.details), null, 2) : ''
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Gabim gjatë eksportimit në Excel' });
  }
});

// Export to PDF
router.get('/export-pdf', verifyToken, async (req, res) => {
  try {
    const { action, module, user, dateFrom, dateTo, severity, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        al.id,
        al.action,
        al.module,
        al.description,
        al.user_id,
        al.timestamp,
        al.details,
        al.severity,
        al.ip_address,
        al.entity_type,
        al.entity_id,
        u.email as user_email,
        CONCAT(e.name, ' ', e.surname) as user_name
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (module) {
      query += ` AND al.module = ?`;
      params.push(module);
    }

    if (user) {
      query += ` AND (u.email LIKE ? OR CONCAT(e.name, ' ', e.surname) LIKE ?)`;
      params.push(`%${user}%`, `%${user}%`);
    }

    if (dateFrom) {
      query += ` AND al.timestamp >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND al.timestamp <= ?`;
      params.push(dateTo + ' 23:59:59');
    }

    if (severity) {
      query += ` AND al.severity = ?`;
      params.push(severity);
    }

    query += ` ORDER BY al.timestamp DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [logs] = await db.execute(query, params);

    // Create PDF document
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=audit-report-${new Date().toISOString().split('T')[0]}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Audit Trail Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString('sq-AL')}`, { align: 'center' });
    doc.moveDown();

    // Add summary
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(10).text(`Total records: ${logs.length}`);
    doc.moveDown();

    // Add logs
    logs.forEach((log, index) => {
      doc.fontSize(12).text(`${index + 1}. ${log.action} - ${log.module}`, { underline: true });
      doc.fontSize(10).text(`Description: ${log.description}`);
      doc.fontSize(10).text(`User: ${log.user_name || log.user_email || 'Sistemi'}`);
      doc.fontSize(10).text(`Date: ${new Date(log.timestamp).toLocaleString('sq-AL')}`);
      if (log.ip_address) {
        doc.fontSize(10).text(`IP: ${log.ip_address}`);
      }
      if (log.details) {
        doc.fontSize(10).text(`Details: ${JSON.stringify(JSON.parse(log.details), null, 2)}`);
      }
      doc.moveDown();
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).json({ error: 'Gabim gjatë eksportimit në PDF' });
  }
});

// Cleanup old logs
router.post('/cleanup', verifyToken, async (req, res) => {
  try {
    const { daysToKeep = 365 } = req.body;
    
    const deleteQuery = `
      DELETE FROM audit_trail 
      WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    
    const [result] = await db.execute(deleteQuery, [daysToKeep]);
    
    res.json({
      success: true,
      data: {
        deletedCount: result.affectedRows,
        message: `U fshinë ${result.affectedRows} audit logs të vjetër`
      }
    });
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({ error: 'Gabim gjatë pastrimit të audit logs' });
  }
});

// Create audit log entry
router.post('/', verifyToken, async (req, res) => {
  try {
    const { action, module, description, details, severity = 'info', ipAddress, entityType, entityId } = req.body;
    const userId = req.user.id;

    const query = `
      INSERT INTO audit_trail (action, module, description, user_id, timestamp, details, severity, ip_address, entity_type, entity_id)
      VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [
      action,
      module,
      description,
      userId,
      JSON.stringify(details || {}),
      severity,
      ipAddress,
      entityType,
      entityId
    ]);

    res.status(201).json({ message: 'Audit log u krijua me sukses' });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Gabim gjatë krijimit të audit log' });
  }
});

module.exports = router; 