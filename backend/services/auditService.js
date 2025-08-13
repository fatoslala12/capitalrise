const { pool } = require('../db'); // Updated to use new structure

class AuditService {
  constructor() {
    console.log('🔧 [AUDIT SERVICE] Initializing AuditService...');
    try {
      this.ensureAuditTable();
      console.log('✅ [AUDIT SERVICE] AuditService initialized successfully');
    } catch (error) {
      console.error('❌ [AUDIT SERVICE] Error initializing AuditService:', error);
      throw error;
    }
  }

  // Krijo tabelën e audit trail nëse nuk ekziston
  async ensureAuditTable() {
    try {
      // Set schema to public
      await pool.query('SET search_path TO public');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_trail (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          user_email VARCHAR(255),
          user_role VARCHAR(50),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(100),
          old_values JSONB,
          new_values JSONB,
          changes JSONB,
          ip_address INET,
          user_agent TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          session_id VARCHAR(255),
          severity VARCHAR(20) DEFAULT 'info',
          description TEXT,
          metadata JSONB
        )
      `);

      // Krijo indekset për performancë
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail(user_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_trail_severity ON audit_trail(severity)
      `);

      console.log('✅ Tabela e audit trail u krijua/verifikua me sukses');
    } catch (error) {
      console.error('❌ Gabim në krijimin e tabelës së audit trail:', error);
    }
  }

  // Krijo një audit log entry
  async logAuditEvent({
    userId = null,
    userEmail = null,
    userRole = null,
    action,
    entityType,
    entityId = null,
    oldValues = null,
    newValues = null,
    changes = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    severity = 'info',
    description = null,
    metadata = null
  }) {
    try {
      const result = await pool.query(`
        INSERT INTO audit_trail (
          user_id, user_email, user_role, action, entity_type, entity_id,
          old_values, new_values, changes, ip_address, user_agent,
          session_id, severity, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, timestamp
      `, [
        userId, userEmail, userRole, action, entityType, entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        changes ? JSON.stringify(changes) : null,
        ipAddress, userAgent, sessionId, severity, description,
        metadata ? JSON.stringify(metadata) : null
      ]);

      const auditEntry = result.rows[0];
      console.log(`[AUDIT] ${action} në ${entityType}${entityId ? ` (ID: ${entityId})` : ''} nga ${userEmail || 'sistemi'}`);

      return auditEntry;
    } catch (error) {
      console.error('❌ Gabim në logimin e audit event:', error);
      // Mos dështo aplikacionin nëse audit trail dështon
      return null;
    }
  }

  // Log login events
  async logLogin(userId, userEmail, userRole, ipAddress, userAgent, success = true, metadata = null) {
    let loginMetadata = metadata || { success };
    
    if (success) {
      // For successful logins, include user details
      loginMetadata = {
        ...loginMetadata,
        success: {
          id: userId,
          role: userRole,
          email: userEmail,
          employee_id: null // This could be enhanced later
        }
      };
    } else {
      // For failed logins, include failure details
      loginMetadata = {
        ...loginMetadata,
        failure: {
          attemptedEmail: userEmail,
          reason: 'Kredencialet e gabuara',
          timestamp: new Date().toISOString(),
          ipAddress: ipAddress
        }
      };
    }

    return this.logAuditEvent({
      userId,
      userEmail,
      userRole,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      entityType: 'auth',
      entityId: userId?.toString(),
      ipAddress,
      userAgent,
      severity: success ? 'info' : 'warning',
      description: success ? 'Përdoruesi u logua me sukses' : 'Tentativë e dështuar e login',
      metadata: loginMetadata
    });
  }

  // Log logout events
  async logLogout(userId, userEmail, userRole, ipAddress, userAgent) {
    return this.logAuditEvent({
      userId,
      userEmail,
      userRole,
      action: 'LOGOUT',
      entityType: 'auth',
      entityId: userId?.toString(),
      ipAddress,
      userAgent,
      severity: 'info',
      description: 'Përdoruesi u çkyç'
    });
  }

  // Log CRUD operations
  async logCreate(userId, userEmail, userRole, entityType, entityId, newValues, ipAddress = null, userAgent = null) {
    return this.logAuditEvent({
      userId,
      userEmail,
      userRole,
      action: 'CREATE',
      entityType,
      entityId: entityId?.toString(),
      newValues,
      ipAddress,
      userAgent,
      severity: 'info',
      description: `Krijuar ${entityType} i ri`,
      metadata: { operation: 'create' }
    });
  }

  async logUpdate(userId, userEmail, userRole, entityType, entityId, oldValues, newValues, changes, ipAddress = null, userAgent = null) {
    return this.logAuditEvent({
      userId,
      userEmail,
      userRole,
      action: 'UPDATE',
      entityType,
      entityId: entityId?.toString(),
      oldValues,
      newValues,
      changes,
      ipAddress,
      userAgent,
      severity: 'info',
      description: `Përditësuar ${entityType}`,
      metadata: { operation: 'update', changedFields: Object.keys(changes || {}) }
    });
  }

  async logDelete(userId, userEmail, userRole, entityType, entityId, oldValues, ipAddress = null, userAgent = null) {
    return this.logAuditEvent({
      userId,
      userEmail,
      userRole,
      action: 'DELETE',
      entityType,
      entityId: entityId?.toString(),
      oldValues,
      ipAddress,
      userAgent,
      severity: 'warning',
      description: `Fshirë ${entityType}`,
      metadata: { operation: 'delete' }
    });
  }

  // Log sensitive operations
  async logSensitiveOperation(userId, userEmail, userRole, action, entityType, entityId, description, ipAddress = null, userAgent = null) {
    return this.logAuditEvent({
      userId,
      userEmail,
      userRole,
      action,
      entityType,
      entityId: entityId?.toString(),
      ipAddress,
      userAgent,
      severity: 'high',
      description,
      metadata: { operation: 'sensitive' }
    });
  }

  // Log system events
  async logSystemEvent(action, description, metadata = null, severity = 'info') {
    return this.logAuditEvent({
      action,
      entityType: 'system',
      severity,
      description,
      metadata
    });
  }

  // Merr audit logs me filtra
  async getAuditLogs({
    userId = null,
    entityType = null,
    entityId = null,
    action = null,
    severity = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0,
    sortBy = 'timestamp',
    sortOrder = 'DESC'
  } = {}) {
    try {
      console.log('🔧 [AUDIT SERVICE] getAuditLogs called with params:', { userId, entityType, entityId, action, severity, startDate, endDate, limit, offset, sortBy, sortOrder });
      
      let query = `
        SELECT *
        FROM audit_trail
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (userId) {
        query += ` AND user_id = $${paramIndex++}`;
        params.push(userId);
      }

      if (entityType) {
        query += ` AND entity_type = $${paramIndex++}`;
        params.push(entityType);
      }

      if (entityId) {
        query += ` AND entity_id = $${paramIndex++}`;
        params.push(entityId);
      }

      if (action) {
        query += ` AND action = $${paramIndex++}`;
        params.push(action);
      }

      if (severity) {
        query += ` AND severity = $${paramIndex++}`;
        params.push(severity);
      }

      if (startDate) {
        query += ` AND timestamp >= $${paramIndex++}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND timestamp <= $${paramIndex++}`;
        params.push(endDate);
      }

      query += ` ORDER BY ${sortBy} ${sortOrder}`;
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      console.log('🔧 [AUDIT SERVICE] Final query:', query);
      console.log('🔧 [AUDIT SERVICE] Params:', params);

      const result = await pool.query(query, params);
      console.log('🔧 [AUDIT SERVICE] Query executed successfully, returned', result.rows.length, 'rows');
      return result.rows;
    } catch (error) {
      console.error('❌ Gabim në marrjen e audit logs:', error);
      throw error;
    }
  }

  // Merr statistika të audit trail
  async getAuditStats({
    startDate = null,
    endDate = null,
    userId = null
  } = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (startDate) {
        whereClause += ` AND timestamp >= $${paramIndex++}`;
        params.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND timestamp <= $${paramIndex++}`;
        params.push(endDate);
      }

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex++}`;
        params.push(userId);
      }

      const statsQuery = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT entity_type) as entity_types,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_events,
          COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_events,
          COUNT(CASE WHEN action = 'LOGIN_SUCCESS' THEN 1 END) as successful_logins,
          COUNT(CASE WHEN action = 'LOGIN_FAILED' THEN 1 END) as failed_logins,
          COUNT(CASE WHEN action = 'CREATE' THEN 1 END) as create_events,
          COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as update_events,
          COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as delete_events
        FROM audit_trail
        ${whereClause}
      `;

      const result = await pool.query(statsQuery, params);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Gabim në marrjen e audit stats:', error);
      throw error;
    }
  }

  // Merr aktivitetin e përdoruesve
  async getUserActivity(userId, days = 30) {
    try {
      const result = await pool.query(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as events,
          COUNT(CASE WHEN action = 'LOGIN_SUCCESS' THEN 1 END) as logins,
          COUNT(CASE WHEN action = 'CREATE' THEN 1 END) as creates,
          COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
          COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes
        FROM audit_trail
        WHERE user_id = $1 
        AND timestamp >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('❌ Gabim në marrjen e aktivitetit të përdoruesit:', error);
      throw error;
    }
  }

  // Merr entitetet më të aktivizuara
  async getMostActiveEntities(days = 30, limit = 10) {
    try {
      const result = await pool.query(`
        SELECT 
          entity_type,
          entity_id,
          COUNT(*) as event_count,
          COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
          COUNT(CASE WHEN action = 'CREATE' THEN 1 END) as creates,
          COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
          MAX(timestamp) as last_activity
        FROM audit_trail
        WHERE timestamp >= NOW() - INTERVAL '${days} days'
        AND entity_id IS NOT NULL
        GROUP BY entity_type, entity_id
        ORDER BY event_count DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      console.error('❌ Gabim në marrjen e entiteteve më aktive:', error);
      throw error;
    }
  }

  // Pastro audit logs të vjetër
  async cleanupOldAuditLogs(daysToKeep = 365) {
    try {
      const result = await pool.query(`
        DELETE FROM audit_trail
        WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
      `);

      console.log(`🧹 U fshinë ${result.rowCount} audit logs të vjetër (më të vjetër se ${daysToKeep} ditë)`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Gabim në pastrimin e audit logs:', error);
      throw error;
    }
  }

  // Eksporto audit logs në CSV
  async exportAuditLogsCSV({
    startDate = null,
    endDate = null,
    entityType = null,
    action = null
  } = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (startDate) {
        whereClause += ` AND timestamp >= $${paramIndex++}`;
        params.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND timestamp <= $${paramIndex++}`;
        params.push(endDate);
      }

      if (entityType) {
        whereClause += ` AND entity_type = $${paramIndex++}`;
        params.push(entityType);
      }

      if (action) {
        whereClause += ` AND action = $${paramIndex++}`;
        params.push(action);
      }

      const result = await pool.query(`
        SELECT 
          at.timestamp,
          at.user_email,
          at.user_role,
          at.action,
          at.entity_type,
          at.entity_id,
          at.severity,
          at.description,
          at.ip_address,
          at.old_values,
          at.new_values,
          at.changes
        FROM audit_trail at
        ${whereClause}
        ORDER BY at.timestamp DESC
      `, params);

      return result.rows;
    } catch (error) {
      console.error('❌ Gabim në eksportimin e audit logs:', error);
      throw error;
    }
  }

  // Kontrollo aktivitet të verdhësishëm
  async detectSuspiciousActivity(hours = 24) {
    try {
      const suspiciousActivities = [];

      // Kontrollo login të dështuar
      const failedLogins = await pool.query(`
        SELECT user_email, COUNT(*) as failed_attempts
        FROM audit_trail
        WHERE action = 'LOGIN_FAILED'
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
        GROUP BY user_email
        HAVING COUNT(*) >= 5
      `);

      failedLogins.rows.forEach(row => {
        suspiciousActivities.push({
          type: 'MULTIPLE_FAILED_LOGINS',
          user: row.user_email,
          count: row.failed_attempts,
          severity: 'high',
          description: `${row.failed_attempts} tentativa të dështuara të login për ${row.user_email}`
        });
      });

      // Kontrollo veprime të shpeshta DELETE
      const frequentDeletes = await pool.query(`
        SELECT user_email, entity_type, COUNT(*) as delete_count
        FROM audit_trail
        WHERE action = 'DELETE'
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
        GROUP BY user_email, entity_type
        HAVING COUNT(*) >= 10
      `);

      frequentDeletes.rows.forEach(row => {
        suspiciousActivities.push({
          type: 'FREQUENT_DELETES',
          user: row.user_email,
          entityType: row.entity_type,
          count: row.delete_count,
          severity: 'warning',
          description: `${row.delete_count} fshirje të ${row.entity_type} nga ${row.user_email}`
        });
      });

      // Kontrollo aktivitet në orët e natës
      const nightActivity = await pool.query(`
        SELECT user_email, COUNT(*) as night_events
        FROM audit_trail
        WHERE EXTRACT(HOUR FROM timestamp) BETWEEN 22 AND 6
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
        GROUP BY user_email
        HAVING COUNT(*) >= 20
      `);

      nightActivity.rows.forEach(row => {
        suspiciousActivities.push({
          type: 'NIGHT_ACTIVITY',
          user: row.user_email,
          count: row.night_events,
          severity: 'medium',
          description: `${row.night_events} veprime gjatë natës nga ${row.user_email}`
        });
      });

      return suspiciousActivities;
    } catch (error) {
      console.error('❌ Gabim në detektimin e aktivitetit të verdhësishëm:', error);
      throw error;
    }
  }
}

module.exports = AuditService; 