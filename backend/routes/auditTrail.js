const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all audit logs with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, module, user, dateFrom, dateTo } = req.query;
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
        u.email as user_email,
        CONCAT(e.name, ' ', e.surname) as user_name
      FROM audit_logs al
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

    query += ` ORDER BY al.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [logs] = await db.execute(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
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

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      logs: logs.map(log => ({
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

// Create audit log entry (for internal use)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { action, module, description, details } = req.body;
    const userId = req.user.id;

    const query = `
      INSERT INTO audit_logs (action, module, description, user_id, timestamp, details)
      VALUES (?, ?, ?, ?, NOW(), ?)
    `;

    await db.execute(query, [
      action,
      module,
      description,
      userId,
      JSON.stringify(details || {})
    ]);

    res.status(201).json({ message: 'Audit log u krijua me sukses' });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Gabim gjatë krijimit të audit log' });
  }
});

// Get audit log statistics
router.get('/stats', authenticateToken, async (req, res) => {
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

    // Action statistics
    const actionStatsQuery = `
      SELECT action, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY action
      ORDER BY count DESC
    `;
    const [actionStats] = await db.execute(actionStatsQuery, params);

    // Module statistics
    const moduleStatsQuery = `
      SELECT module, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY module
      ORDER BY count DESC
    `;
    const [moduleStats] = await db.execute(moduleStatsQuery, params);

    // User statistics
    const userStatsQuery = `
      SELECT 
        CONCAT(e.name, ' ', e.surname) as user_name,
        COUNT(*) as count
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
      ${whereClause}
      GROUP BY al.user_id, user_name
      ORDER BY count DESC
      LIMIT 10
    `;
    const [userStats] = await db.execute(userStatsQuery, params);

    res.json({
      actionStats,
      moduleStats,
      userStats
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Gabim gjatë marrjes së statistikave' });
  }
});

module.exports = router;