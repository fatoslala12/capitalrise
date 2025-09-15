const { pool } = require('../db');

// Restart system
exports.restartSystem = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[SYSTEM] Përdoruesi ${user.email} po restarton sistemin`);

    // Simulate system restart (in real app, this would trigger actual restart)
    res.json({
      success: true,
      message: 'System restart initiated successfully',
      data: {
        restartTime: new Date().toISOString(),
        initiatedBy: user.email,
        status: 'restarting'
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në restartin e sistemit:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë restartit të sistemit',
      error: error.message
    });
  }
};

// Get system logs (paginated + filters) from audit_trail
exports.getSystemLogs = async (req, res) => {
  try {
    const { user } = req;
    console.log(`[SYSTEM] ${user?.email} po shikon system logs me filtra`, req.query);

    // Filters
    const {
      q = '',
      severity = '', // info | warning | error | high
      action = '',   // LOGIN_SUCCESS, CREATE, UPDATE, DELETE, ERROR_CRITICAL, etc
      entityType = '', // contracts, invoices, system, auth, etc
      userEmail = '',
      startDate = '',
      endDate = '',
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'DESC'
    } = req.query;

    const safeSortBy = ['timestamp','severity','action','entity_type','user_email'].includes(sortBy) ? sortBy : 'timestamp';
    const safeSortOrder = (String(sortOrder).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const offset = (pageNum - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params = [];
    let i = 1;

    if (severity) { where += ` AND severity = $${i++}`; params.push(severity); }
    if (action)   { where += ` AND action = $${i++}`; params.push(action); }
    if (entityType){ where += ` AND entity_type = $${i++}`; params.push(entityType); }
    if (userEmail){ where += ` AND user_email ILIKE $${i++}`; params.push(`%${userEmail}%`); }
    if (startDate){ where += ` AND timestamp >= $${i++}`; params.push(startDate); }
    if (endDate)  { where += ` AND timestamp <= $${i++}`; params.push(endDate); }
    if (q) {
      where += ` AND (
        COALESCE(description,'') ILIKE $${i} OR 
        COALESCE(entity_type,'') ILIKE $${i} OR
        COALESCE(action,'') ILIKE $${i} OR
        COALESCE(user_email,'') ILIKE $${i}
      )`;
      params.push(`%${q}%`); i++;
    }

    // Count
    const countResult = await pool.query(`SELECT COUNT(*)::int as total FROM audit_trail ${where}`, params);
    const total = countResult.rows[0]?.total || 0;

    // Data
    const dataResult = await pool.query(
      `SELECT id, timestamp, user_email, user_role, action, entity_type, entity_id, severity, description, ip_address, user_agent, metadata
       FROM audit_trail
       ${where}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, pageSize, offset]
    );

    res.json({
      success: true,
      data: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        logs: dataResult.rows
      }
    });
  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e system logs:', error);
    res.status(500).json({ success: false, message: 'Gabim gjatë marrjes së system logs', error: error.message });
  }
};

// Toggle maintenance mode
exports.toggleMaintenance = async (req, res) => {
  try {
    const { user } = req;
    const { action } = req.body;
    
    console.log(`[SYSTEM] Përdoruesi ${user.email} po ${action} maintenance mode`);

    // Update maintenance mode in database
    await pool.query(
      'UPDATE system_settings SET maintenance_settings = jsonb_set(maintenance_settings, \'{maintenanceMode}\', $1, true), updated_at = NOW() WHERE id = 1',
      [action === 'enable']
    );

    res.json({
      success: true,
      message: `Maintenance mode ${action}d successfully`,
      data: {
        maintenanceMode: action === 'enable',
        updatedBy: user.email,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në toggle të maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë toggle të maintenance mode',
      error: error.message
    });
  }
};

// Get system status
exports.getSystemStatus = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[SYSTEM] Përdoruesi ${user.email} po shikon system status`);

    // Mock system status (in real app, this would check actual system metrics)
    const systemStatus = {
      uptime: '99.9%',
      responseTime: '45ms',
      memoryUsage: '1.2GB',
      cpuUsage: '23%',
      diskUsage: '45%',
      activeUsers: 12,
      totalRequests: 15420,
      errorRate: '0.1%',
      lastBackup: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      nextBackup: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      databaseStatus: 'healthy',
      cacheStatus: 'healthy',
      emailServiceStatus: 'healthy',
      maintenanceMode: false
    };

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e system status:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së system status',
      error: error.message
    });
  }
};
