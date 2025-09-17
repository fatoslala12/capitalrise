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
        al.entity_type AS module,
        al.description,
        al.user_id,
        al.timestamp,
        al.metadata AS details,
        al.ip_address,
        al.user_agent,
        al.device_type,
        al.device_brand,
        al.device_model,
        al.os,
        al.browser,
        u.email as user_email
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (action) {
      query += ` AND al.action = ${nextParam()}`;
      params.push(action);
    }

    if (module) {
      query += ` AND al.entity_type = ${nextParam()}`;
      params.push(module);
    }

    if (user) {
      const p1 = nextParam();
      query += ` AND (u.email ILIKE ${p1})`;
      params.push(`%${user}%`);
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

    const { rows: logs } = await pool.query(query, params);

    // Get total count for pagination
    paramIndex = 1;
    const nextParam2 = () => `$${paramIndex++}`;
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_trail al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (action) {
      countQuery += ` AND al.action = ${nextParam2()}`;
      countParams.push(action);
    }

    if (module) {
      countQuery += ` AND al.entity_type = ${nextParam2()}`;
      countParams.push(module);
    }

    if (user) {
      const p1 = nextParam2();
      countQuery += ` AND (u.email ILIKE ${p1})`;
      countParams.push(`%${user}%`);
    }

    if (dateFrom) {
      countQuery += ` AND al.timestamp >= ${nextParam2()}`;
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countQuery += ` AND al.timestamp <= ${nextParam2()}`;
      countParams.push(dateTo + ' 23:59:59');
    }

    const { rows: countRows } = await pool.query(countQuery, countParams);
    const total = Number(countRows[0]?.total || 0);

    res.json({
      logs: logs.map(log => ({
        ...log,
        details: (typeof log.details === 'string') ? (JSON.parse(log.details || 'null')) : (log.details || null)
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

    let paramIndex = 1;
    const nextParam = () => `$${paramIndex++}`;
    let where = 'WHERE 1=1';
    const params = [];
    if (dateFrom) { where += ` AND timestamp >= ${nextParam()}`; params.push(dateFrom); }
    if (dateTo)   { where += ` AND timestamp <= ${nextParam()}`; params.push(`${dateTo} 23:59:59`); }

    const totalQuery = `SELECT COUNT(*) AS total FROM audit_trail ${where}`;
    const todayQuery = `SELECT COUNT(*) AS total FROM audit_trail WHERE date(timestamp) = CURRENT_DATE`;
    const failedThisWeekQuery = `
      SELECT COUNT(*) AS total
      FROM audit_trail
      WHERE action = 'LOGIN_FAILED' AND timestamp >= date_trunc('week', now())
    `;
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) AS total
      FROM audit_trail
      WHERE timestamp >= now() - interval '7 days'
    `;
    const actionStatsQuery = `SELECT action, COUNT(*)::int AS count FROM audit_trail ${where} GROUP BY action ORDER BY count DESC`;
    const moduleStatsQuery = `SELECT entity_type AS module, COUNT(*)::int AS count FROM audit_trail ${where} GROUP BY entity_type ORDER BY count DESC`;

    const [{ rows: totalRows }] = await Promise.all([
      pool.query(totalQuery, params)
    ]);
    const { rows: todayRows } = await pool.query(todayQuery);
    const { rows: failedRows } = await pool.query(failedThisWeekQuery);
    const { rows: activeRows } = await pool.query(activeUsersQuery);
    const { rows: actionRows } = await pool.query(actionStatsQuery, params);
    const { rows: moduleRows } = await pool.query(moduleStatsQuery, params);

    res.json({
      data: {
        totalLogs: Number(totalRows[0]?.total || 0),
        todayLogs: Number(todayRows[0]?.total || 0),
        failedThisWeek: Number(failedRows[0]?.total || 0),
        activeUsers: Number(activeRows[0]?.total || 0),
        actionStats: actionRows,
        moduleStats: moduleRows
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Gabim gjatë marrjes së statistikave' });
  }
});

module.exports = router;