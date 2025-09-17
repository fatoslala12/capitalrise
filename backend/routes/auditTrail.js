const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Updated to use new structure
const { verifyToken } = require('../middleware/auth');

// Get all audit logs with pagination and filtering
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, module, user, dateFrom, dateTo, since } = req.query;
    const offset = (page - 1) * limit;

    let paramIndex = 1;
    const nextParam = () => `$${paramIndex++}`;

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
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];

    if (action) {
      query += ` AND al.action = ${nextParam()}`;
      params.push(action);
    }

    if (module) {
      query += ` AND al.module = ${nextParam()}`;
      params.push(module);
    }

    if (user) {
      const p1 = nextParam();
      const p2 = nextParam();
      query += ` AND (u.email ILIKE ${p1} OR CONCAT(e.name, ' ', e.surname) ILIKE ${p2})`;
      params.push(`%${user}%`, `%${user}%`);
    }

    if (dateFrom) {
      query += ` AND al.timestamp >= ${nextParam()}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND al.timestamp <= ${nextParam()}`;
      params.push(dateTo + ' 23:59:59');
    }

    // since parameter: fetch logs newer than a timestamp or id
    if (since) {
      // Try to parse as date; if invalid, treat as numeric id
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query += ` AND al.timestamp > ${nextParam()}`;
        params.push(since);
      } else if (!isNaN(Number(since))) {
        query += ` AND al.id > ${nextParam()}`;
        params.push(Number(since));
      }
    }

    query += ` ORDER BY al.timestamp DESC, al.id DESC LIMIT ${nextParam()} OFFSET ${nextParam()}`;
    params.push(parseInt(limit), offset);

    const [logs] = await pool.query(query, params);

    // Get total count for pagination
    paramIndex = 1;
    const nextParam2 = () => `$${paramIndex++}`;
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (action) {
      countQuery += ` AND al.action = ${nextParam2()}`;
      countParams.push(action);
    }

    if (module) {
      countQuery += ` AND al.module = ${nextParam2()}`;
      countParams.push(module);
    }

    if (user) {
      const p1 = nextParam2();
      const p2 = nextParam2();
      countQuery += ` AND (u.email ILIKE ${p1} OR CONCAT(e.name, ' ', e.surname) ILIKE ${p2})`;
      countParams.push(`%${user}%`, `%${user}%`);
    }

    if (dateFrom) {
      countQuery += ` AND al.timestamp >= ${nextParam2()}`;
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countQuery += ` AND al.timestamp <= ${nextParam2()}`;
      countParams.push(dateTo + ' 23:59:59');
    }

    const [countResult] = await pool.query(countQuery, countParams);
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
router.post('/', verifyToken, async (req, res) => {
  try {
    const { action, module, description, details } = req.body;
    const userId = req.user.id;

    const query = `
      INSERT INTO audit_trail (action, module, description, user_id, timestamp, details)
      VALUES (?, ?, ?, ?, NOW(), ?)
    `;

    await pool.query(query, [
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

    // Action statistics
    const actionStatsQuery = `
      SELECT action, COUNT(*) as count
      FROM audit_trail
      ${whereClause}
      GROUP BY action
      ORDER BY count DESC
    `;
    const [actionStats] = await pool.query(actionStatsQuery, params);

    // Module statistics
    const moduleStatsQuery = `
      SELECT module, COUNT(*) as count
      FROM audit_trail
      ${whereClause}
      GROUP BY module
      ORDER BY count DESC
    `;
    const [moduleStats] = await pool.query(moduleStatsQuery, params);

    // User statistics
    const userStatsQuery = `
      SELECT 
        CONCAT(e.name, ' ', e.surname) as user_name,
        COUNT(*) as count
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
      ${whereClause}
      GROUP BY al.user_id, user_name
      ORDER BY count DESC
      LIMIT 10
    `;
    const [userStats] = await pool.query(userStatsQuery, params);

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