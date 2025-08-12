const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Test endpoint without authentication
router.get('/test', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM audit_trail');
    res.json({ 
      message: 'Audit API is working!', 
      totalLogs: result.rows[0].count 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test logs endpoint without authentication
router.get('/test-logs', async (req, res) => {
  try {
    const { action, user, module, dateFrom, dateTo, severity, limit = 50 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Build WHERE clause based on filters
    if (action) {
      whereConditions.push(`al.action = $${paramIndex++}`);
      queryParams.push(action);
    }
    
    if (user) {
      whereConditions.push(`(al.user_email ILIKE $${paramIndex++} OR al.user_name ILIKE $${paramIndex++})`);
      queryParams.push(`%${user}%`);
      queryParams.push(`%${user}%`);
    }
    
    if (module) {
      whereConditions.push(`al.entity_type = $${paramIndex++}`);
      queryParams.push(module);
    }
    
    if (severity) {
      whereConditions.push(`al.severity = $${paramIndex++}`);
      queryParams.push(severity);
    }
    
    if (dateFrom) {
      whereConditions.push(`al.timestamp >= $${paramIndex++}`);
      queryParams.push(dateFrom);
    }
    
    if (dateTo) {
      whereConditions.push(`al.timestamp <= $${paramIndex++}`);
      queryParams.push(dateTo + ' 23:59:59');
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        al.id,
        al.action,
        al.entity_type as module,
        al.description,
        al.user_id,
        al.timestamp,
        al.metadata as details,
        al.severity,
        al.ip_address,
        al.entity_type,
        al.entity_id,
        al.user_email,
        al.user_email as user_name,
        CASE 
          WHEN al.action = 'LOGIN_FAILED' THEN 
            CASE 
              WHEN al.description ILIKE '%password%' THEN 'Fjalëkalim i gabuar'
              WHEN al.description ILIKE '%email%' THEN 'Email i gabuar'
              WHEN al.description ILIKE '%user%' THEN 'Përdorues nuk ekziston'
              ELSE 'Kredencialet e gabuara'
            END
          ELSE NULL
        END as failure_reason
      FROM audit_trail al
      ${whereClause}
      ORDER BY al.timestamp DESC
      LIMIT $${paramIndex++}
    `;
    
    queryParams.push(parseInt(limit));
    
    const result = await db.query(query, queryParams);
    const logs = result.rows;

    // Enhance the logs with better metadata
    const enhancedLogs = logs.map(log => {
      let enhancedLog = { ...log };
      
      // For failed logins, create better details structure
      if (log.action === 'LOGIN_FAILED') {
        enhancedLog.details = {
          reason: log.failure_reason || 'Kredencialet e gabuara',
          error: log.description || 'Kyçje e dështuar',
          attemptedEmail: log.user_email || 'Email i panjohur',
          timestamp: log.timestamp,
          ipAddress: log.ip_address
        };
      }
      
      // For successful logins
      if (log.action === 'LOGIN_SUCCESS') {
        enhancedLog.details = {
          success: true,
          userEmail: log.user_email,
          timestamp: log.timestamp,
          ipAddress: log.ip_address
        };
      }
      
      // For other actions, preserve existing details
      if (!enhancedLog.details && log.details) {
        try {
          enhancedLog.details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        } catch (e) {
          enhancedLog.details = { raw: log.details };
        }
      }
      
      return enhancedLog;
    });

    res.json({
      data: enhancedLogs,
      pagination: {
        page: 1,
        limit: parseInt(limit),
        total: enhancedLogs.length,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching test logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test stats endpoint without authentication
router.get('/test-stats', async (req, res) => {
  try {
    // Total logs
    const totalResult = await db.query('SELECT COUNT(*) as total FROM audit_trail');
    const totalLogs = totalResult.rows[0].total;

    // Today's logs
    const todayResult = await db.query(`
      SELECT COUNT(*) as today 
      FROM audit_trail 
      WHERE DATE(timestamp) = CURRENT_DATE
    `);
    const todayLogs = todayResult.rows[0].today;

    // Action statistics
    const actionStatsResult = await db.query(`
      SELECT action, COUNT(*) as count
      FROM audit_trail
      GROUP BY action
      ORDER BY count DESC
    `);
    const actionStats = actionStatsResult.rows;

    // Calculate action counts
    const createCount = actionStats.find(s => s.action === 'CREATE')?.count || 0;
    const updateCount = actionStats.find(s => s.action === 'UPDATE')?.count || 0;
    const deleteCount = actionStats.find(s => s.action === 'DELETE')?.count || 0;
    const loginCount = actionStats.find(s => s.action === 'LOGIN')?.count || 0;
    const paymentCount = actionStats.find(s => s.action === 'PAYMENT')?.count || 0;

    // Active users (last 7 days)
    const activeUsersResult = await db.query(`
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM audit_trail
      WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
    `);
    const activeUsers = activeUsersResult.rows[0].active_users;

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
    console.error('Error fetching test stats:', error);
    res.status(500).json({ error: error.message });
  }
});

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
        al.entity_type as module,
        al.description,
        al.user_id,
        al.timestamp,
        al.metadata as details,
        al.severity,
        al.ip_address,
        al.entity_type,
        al.entity_id,
        al.user_email,
        al.user_email as user_name
      FROM audit_trail al
      WHERE 1=1
    `;
    
    const params = [];

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (module) {
      query += ` AND al.entity_type = ?`;
      params.push(module);
    }

    if (user) {
      query += ` AND al.user_email LIKE ?`;
      params.push(`%${user}%`);
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
      query += ` AND al.changes IS NOT NULL AND al.changes != '{}'`;
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

    const result = await db.query(query, params);
    const logs = result.rows;

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_trail al
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (action) {
      countQuery += ` AND al.action = ?`;
      countParams.push(action);
    }

    if (module) {
      countQuery += ` AND al.entity_type = ?`;
      countParams.push(module);
    }

    if (user) {
      countQuery += ` AND al.user_email LIKE ?`;
      countParams.push(`%${user}%`);
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
      countQuery += ` AND al.changes IS NOT NULL AND al.changes != '{}'`;
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

    const countResult = await db.query(countQuery, countParams);
    const total = countResult.rows[0].total;

    res.json({
      data: logs.map(log => ({
        ...log,
        details: log.details || null
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
    const totalResult = await db.query(totalQuery, params);
    const totalLogs = totalResult.rows[0].total;

    // Today's logs
    const todayQuery = `
      SELECT COUNT(*) as today 
      FROM audit_trail 
      WHERE DATE(timestamp) = CURRENT_DATE
    `;
    const todayResult = await db.query(todayQuery);
    const todayLogs = todayResult.rows[0].today;

    // Action statistics
    const actionStatsQuery = `
      SELECT action, COUNT(*) as count
      FROM audit_trail
      ${whereClause}
      GROUP BY action
      ORDER BY count DESC
    `;
    const actionStatsResult = await db.query(actionStatsQuery, params);
    const actionStats = actionStatsResult.rows;

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
      WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
    `;
    const activeUsersResult = await db.query(activeUsersQuery);
    const activeUsers = activeUsersResult.rows[0].active_users;

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
        al.user_email,
        al.user_email as user_name
      FROM audit_trail al
      WHERE al.severity IN ('high', 'warning')
      OR al.action = 'DELETE'
      OR al.action = 'LOGIN'
      ORDER BY al.timestamp DESC
      LIMIT 20
    `;
    
    const suspiciousResult = await db.query(suspiciousQuery);
    const suspiciousActivities = suspiciousResult.rows;
    
    res.json({
      data: suspiciousActivities.map(activity => ({
        ...activity,
        details: activity.metadata || null
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
    
    const entitiesResult = await db.query(entitiesQuery);
    const entities = entitiesResult.rows;
    
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
        al.entity_type as module,
        al.description,
        al.user_id,
        al.timestamp,
        al.metadata as details,
        al.severity,
        al.ip_address,
        al.entity_type,
        al.entity_id,
        al.user_email,
        al.user_email as user_name
      FROM audit_trail al
      WHERE 1=1
    `;
    
    const params = [];

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (module) {
      query += ` AND al.entity_type = ?`;
      params.push(module);
    }

    if (user) {
      query += ` AND al.user_email LIKE ?`;
      params.push(`%${user}%`);
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

    const result = await db.query(query, params);
    const logs = result.rows;

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
        user_name: log.user_name || 'Sistemi',
        timestamp: new Date(log.timestamp).toLocaleString('sq-AL'),
        severity: log.severity || 'info',
        ip_address: log.ip_address || '',
        entity_type: log.entity_type || '',
        entity_id: log.entity_id || '',
        details: log.details ? JSON.stringify(log.details, null, 2) : ''
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
        al.entity_type as module,
        al.description,
        al.user_id,
        al.timestamp,
        al.metadata as details,
        al.severity,
        al.ip_address,
        al.entity_type,
        al.entity_id,
        al.user_email,
        al.user_email as user_name
      FROM audit_trail al
      WHERE 1=1
    `;
    
    const params = [];

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (module) {
      query += ` AND al.entity_type = ?`;
      params.push(module);
    }

    if (user) {
      query += ` AND al.user_email LIKE ?`;
      params.push(`%${user}%`);
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

    const result = await db.query(query, params);
    const logs = result.rows;

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
      doc.fontSize(10).text(`User: ${log.user_name || 'Sistemi'}`);
      doc.fontSize(10).text(`Date: ${new Date(log.timestamp).toLocaleString('sq-AL')}`);
      if (log.ip_address) {
        doc.fontSize(10).text(`IP: ${log.ip_address}`);
      }
      if (log.details) {
        doc.fontSize(10).text(`Details: ${JSON.stringify(log.details, null, 2)}`);
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
    
    const result = await db.query(deleteQuery, [daysToKeep]);
    
    res.json({
      success: true,
      data: {
        deletedCount: result.rowCount,
        message: `U fshinë ${result.rowCount} audit logs të vjetër`
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
      INSERT INTO audit_trail (action, entity_type, description, user_id, timestamp, metadata, severity, ip_address, entity_type, entity_id)
      VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
    `;

    await db.query(query, [
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