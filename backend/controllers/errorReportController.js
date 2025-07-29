const { createError } = require('../middleware/errorHandler');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');

const auditService = new AuditService();

// Merr error report nga frontend
exports.reportError = async (req, res) => {
  try {
    const { errorId, message, stack, componentStack, context, url, userAgent, timestamp } = req.body;
    
    console.error('\x1b[31m%s\x1b[0m', '🚨 FRONTEND ERROR REPORT:');
    console.error('\x1b[33m%s\x1b[0m', `Error ID: ${errorId}`);
    console.error('\x1b[33m%s\x1b[0m', `Message: ${message}`);
    console.error('\x1b[33m%s\x1b[0m', `URL: ${url}`);
    console.error('\x1b[33m%s\x1b[0m', `Context: ${context || 'N/A'}`);
    console.error('\x1b[33m%s\x1b[0m', `User Agent: ${userAgent}`);
    console.error('\x1b[33m%s\x1b[0m', `Timestamp: ${timestamp}`);
    
    if (stack) {
      console.error('\x1b[31m%s\x1b[0m', 'Stack Trace:');
      console.error('\x1b[31m%s\x1b[0m', stack);
    }
    
    if (componentStack) {
      console.error('\x1b[31m%s\x1b[0m', 'Component Stack:');
      console.error('\x1b[31m%s\x1b[0m', componentStack);
    }

    // Ruaj në audit trail
    await auditService.logSystemEvent(
      'FRONTEND_ERROR',
      `Frontend error: ${message}`,
      {
        errorId,
        message,
        stack: stack?.substring(0, 1000), // Limit stack size
        componentStack: componentStack?.substring(0, 1000),
        context,
        url,
        userAgent,
        timestamp
      },
      'error'
    );

    // Dërgo notification për adminët për errors kritike
    if (message.includes('Critical') || message.includes('Fatal') || stack?.includes('TypeError')) {
      try {
        const pool = require('../db');
        const result = await pool.query(`
          SELECT id, email FROM users WHERE role = 'admin' AND status = 'active'
        `);

        for (const admin of result.rows) {
          await NotificationService.createNotification(
            admin.id,
            '🚨 Gabim Kritik në Frontend',
            `Error ID: ${errorId}\nMesazhi: ${message}\nURL: ${url}`,
            'high',
            'system',
            null,
            'error',
            5
          );
        }
      } catch (notificationError) {
        console.error('Failed to send error notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: 'Error report u pranua me sukses',
      data: {
        errorId,
        reportedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in error report controller:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në procesimin e error report',
      error: error.message
    });
  }
};

// Merr statistika të errors
exports.getErrorStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        DATE(timestamp) as date,
        action,
        COUNT(*) as error_count
      FROM audit_trail
      WHERE action IN ('FRONTEND_ERROR', 'ERROR_CRITICAL')
      AND timestamp >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(timestamp), action
      ORDER BY date DESC
    `);

    // Gruppo sipas datës
    const statsByDate = {};
    result.rows.forEach(row => {
      if (!statsByDate[row.date]) {
        statsByDate[row.date] = {
          date: row.date,
          frontendErrors: 0,
          backendErrors: 0,
          total: 0
        };
      }
      
      if (row.action === 'FRONTEND_ERROR') {
        statsByDate[row.date].frontendErrors = parseInt(row.error_count);
      } else if (row.action === 'ERROR_CRITICAL') {
        statsByDate[row.date].backendErrors = parseInt(row.error_count);
      }
      
      statsByDate[row.date].total += parseInt(row.error_count);
    });

    res.json({
      success: true,
      data: {
        statsByDate: Object.values(statsByDate),
        totalErrors: result.rows.reduce((sum, row) => sum + parseInt(row.error_count), 0),
        period: `${days} ditë`
      }
    });

  } catch (error) {
    console.error('Error getting error stats:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në marrjen e statistika të errors',
      error: error.message
    });
  }
};

// Merr errors të fundit
exports.getRecentErrors = async (req, res) => {
  try {
    const { limit = 50, hours = 24 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        at.*,
        u.first_name,
        u.last_name,
        u.email as user_email_display
      FROM audit_trail at
      LEFT JOIN users u ON at.user_id = u.id
      WHERE at.action IN ('FRONTEND_ERROR', 'ERROR_CRITICAL')
      AND at.timestamp >= NOW() - INTERVAL '${hours} hours'
      ORDER BY at.timestamp DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error getting recent errors:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në marrjen e errors të fundit',
      error: error.message
    });
  }
};

// Pastro errors të vjetër
exports.cleanupOldErrors = async (req, res) => {
  try {
    const { days = 30 } = req.body;
    
    const result = await pool.query(`
      DELETE FROM audit_trail
      WHERE action IN ('FRONTEND_ERROR', 'ERROR_CRITICAL')
      AND timestamp < NOW() - INTERVAL '${days} days'
    `);

    res.json({
      success: true,
      message: `U fshinë ${result.rowCount} errors të vjetër`,
      data: {
        deletedCount: result.rowCount,
        retentionDays: days,
        cleanedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error cleaning up old errors:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në pastrimin e errors të vjetër',
      error: error.message
    });
  }
};

// Merr error details
exports.getErrorDetails = async (req, res) => {
  try {
    const { errorId } = req.params;
    
    const result = await pool.query(`
      SELECT *
      FROM audit_trail
      WHERE metadata::text LIKE $1
      AND action IN ('FRONTEND_ERROR', 'ERROR_CRITICAL')
      ORDER BY timestamp DESC
      LIMIT 1
    `, [`%${errorId}%`]);

    if (result.rows.length === 0) {
      throw createError('RESOURCE_NOT_FOUND', null, 'Error nuk u gjet');
    }

    const error = result.rows[0];
    
    res.json({
      success: true,
      data: {
        ...error,
        metadata: error.metadata ? JSON.parse(error.metadata) : null
      }
    });

  } catch (error) {
    console.error('Error getting error details:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në marrjen e detajeve të error',
      error: error.message
    });
  }
};

// Merr error trends
exports.getErrorTrends = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        DATE(timestamp) as date,
        HOUR(timestamp) as hour,
        action,
        COUNT(*) as error_count
      FROM audit_trail
      WHERE action IN ('FRONTEND_ERROR', 'ERROR_CRITICAL')
      AND timestamp >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(timestamp), HOUR(timestamp), action
      ORDER BY date DESC, hour DESC
    `);

    // Gruppo sipas orës
    const trendsByHour = {};
    result.rows.forEach(row => {
      const hourKey = `${row.date} ${row.hour}:00`;
      if (!trendsByHour[hourKey]) {
        trendsByHour[hourKey] = {
          date: row.date,
          hour: row.hour,
          frontendErrors: 0,
          backendErrors: 0,
          total: 0
        };
      }
      
      if (row.action === 'FRONTEND_ERROR') {
        trendsByHour[hourKey].frontendErrors = parseInt(row.error_count);
      } else if (row.action === 'ERROR_CRITICAL') {
        trendsByHour[hourKey].backendErrors = parseInt(row.error_count);
      }
      
      trendsByHour[hourKey].total += parseInt(row.error_count);
    });

    res.json({
      success: true,
      data: {
        trendsByHour: Object.values(trendsByHour),
        period: `${days} ditë`
      }
    });

  } catch (error) {
    console.error('Error getting error trends:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në marrjen e trends të errors',
      error: error.message
    });
  }
}; 