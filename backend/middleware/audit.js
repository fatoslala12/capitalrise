const AuditService = require('../services/auditService');

const auditService = new AuditService();

// Middleware për audit trail automatik
const auditMiddleware = (options = {}) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Ruaj informacionin origjinal të përgjigjes
    let responseData = null;
    let responseStatus = 200;

    // Override send method
    res.send = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalSend.call(this, data);
    };

    // Override json method
    res.json = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalJson.call(this, data);
    };

    // Ekzekuto request-in
    try {
      await next();

      // Log audit event pas përgjigjes
      await logAuditEvent(req, res, responseData, responseStatus, options);

    } catch (error) {
      // Log error në audit trail
      await logErrorEvent(req, error, options);
      throw error;
    }
  };
};

// Log audit event
async function logAuditEvent(req, res, responseData, statusCode, options) {
  try {
    const { user } = req;
    if (!user) return; // Skip nëse nuk ka përdorues

    const {
      entityType,
      action,
      entityIdField = 'id',
      skipSuccess = false,
      skipFailure = false,
      customDescription = null
    } = options;

    // Përcakto action bazuar në HTTP method
    const httpAction = getActionFromMethod(req.method);
    const finalAction = action || httpAction;

    // Përcakto entity ID
    let entityId = null;
    if (entityIdField === 'id' && req.params.id) {
      entityId = req.params.id;
    } else if (req.params[entityIdField]) {
      entityId = req.params[entityIdField];
    } else if (req.body && req.body[entityIdField]) {
      entityId = req.body[entityIdField];
    }

    // Skip nëse duhet
    if (statusCode >= 200 && statusCode < 300 && skipSuccess) return;
    if (statusCode >= 400 && skipFailure) return;

    // Përcakto severity
    let severity = 'info';
    if (statusCode >= 400) severity = 'warning';
    if (statusCode >= 500) severity = 'error';

    // Përcakto description
    let description = customDescription;
    if (!description) {
      description = `${finalAction} në ${entityType}${entityId ? ` (ID: ${entityId})` : ''}`;
    }

    // Merr IP address
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

    // Merr user agent
    const userAgent = req.headers['user-agent'];

    // Përcakto old values dhe new values
    let oldValues = null;
    let newValues = null;
    let changes = null;

    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Për update, ruaj ndryshimet
      newValues = req.body;
      changes = calculateChanges(req.body, req.originalBody);
    } else if (req.method === 'POST') {
      // Për create, ruaj të dhënat e reja
      newValues = req.body;
    } else if (req.method === 'DELETE') {
      // Për delete, ruaj të dhënat e vjetra
      oldValues = req.originalBody || req.body;
    }

    // Log audit event
    await auditService.logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: finalAction,
      entityType,
      entityId: entityId?.toString(),
      oldValues,
      newValues,
      changes,
      ipAddress,
      userAgent,
      severity,
      description,
      metadata: {
        method: req.method,
        url: req.originalUrl,
        statusCode,
        responseSize: responseData ? JSON.stringify(responseData).length : 0
      }
    });

  } catch (error) {
    console.error('[AUDIT MIDDLEWARE] Gabim në logimin e audit event:', error);
    // Mos dështo request-in nëse audit trail dështon
  }
}

// Log error event
async function logErrorEvent(req, error, options) {
  try {
    const { user } = req;
    if (!user) return;

    const { entityType, action } = options;

    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    await auditService.logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: action || 'ERROR',
      entityType: entityType || 'system',
      ipAddress,
      userAgent,
      severity: 'error',
      description: `Gabim: ${error.message}`,
      metadata: {
        method: req.method,
        url: req.originalUrl,
        errorStack: error.stack,
        errorName: error.name
      }
    });

  } catch (auditError) {
    console.error('[AUDIT MIDDLEWARE] Gabim në logimin e error event:', auditError);
  }
}

// Përcakto action bazuar në HTTP method
function getActionFromMethod(method) {
  switch (method.toUpperCase()) {
    case 'GET': return 'READ';
    case 'POST': return 'CREATE';
    case 'PUT': return 'UPDATE';
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'UNKNOWN';
  }
}

// Llogarit ndryshimet midis objekteve
function calculateChanges(newObj, oldObj) {
  if (!oldObj || !newObj) return null;

  const changes = {};
  
  for (const key in newObj) {
    if (oldObj[key] !== newObj[key]) {
      changes[key] = {
        old: oldObj[key],
        new: newObj[key]
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

// Funksion për të marrë IP-në e saktë të klientit
const getClientIP = (req) => {
  // Check for various proxy headers in order of reliability
  const ipSources = [
    req.headers['cf-connecting-ip'],        // Cloudflare
    req.headers['x-forwarded-for'],        // Standard proxy header
    req.headers['x-real-ip'],              // Nginx proxy
    req.headers['x-client-ip'],            // Custom proxy header
    req.headers['x-forwarded'],            // Alternative forward header
    req.headers['forwarded-for'],          // RFC 7239
    req.headers['forwarded'],              // RFC 7239
    req.ip,                                // Express.js trust proxy
    req.connection?.remoteAddress,         // Direct connection
    req.socket?.remoteAddress,             // Socket connection
    req.connection?.socket?.remoteAddress  // Fallback
  ];

  // Find the first valid IP address
  for (const ip of ipSources) {
    if (ip && isValidIP(ip)) {
      // Handle comma-separated IPs (take the first one)
      const cleanIP = ip.split(',')[0].trim();
      return cleanIP;
    }
  }

  // Fallback to localhost if no valid IP found
  return '127.0.0.1';
};

// Funksion për të validuar IP-në
const isValidIP = (ip) => {
  if (!ip || typeof ip !== 'string') return false;
  
  // Remove any port numbers
  const cleanIP = ip.split(':')[0];
  
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(cleanIP) || ipv6Regex.test(cleanIP);
};

// Funksion për të marrë informacion të plotë të klientit
const getClientInfo = (req) => {
  const ipAddress = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  // Additional client information
  const clientInfo = {
    ip: ipAddress,
    userAgent: userAgent,
    referer: req.headers['referer'] || null,
    origin: req.headers['origin'] || null,
    host: req.headers['host'] || null,
    // Check if it's a local connection
    isLocal: isLocalIP(ipAddress),
    // Check if it's a known proxy/cloud service
    isProxy: isProxyIP(ipAddress),
    // User's preferred language
    language: req.headers['accept-language'] || null,
    // Connection type (if available)
    connectionType: req.headers['x-connection-type'] || null
  };

  return clientInfo;
};

// Funksion për të kontrolluar nëse IP është lokale
const isLocalIP = (ip) => {
  if (!ip) return false;
  
  const localRanges = [
    '127.0.0.1',           // localhost
    '10.0.0.0/8',          // private network
    '172.16.0.0/12',       // private network
    '192.168.0.0/16',      // private network
    '::1',                  // IPv6 localhost
    'fe80::/10',            // IPv6 link-local
    'fc00::/7'              // IPv6 unique local
  ];
  
  // Simple check for common local IPs
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
};

// Funksion për të kontrolluar nëse IP është proxy/cloud service
const isProxyIP = (ip) => {
  if (!ip) return false;
  
  // Common cloud service IP ranges (simplified)
  const cloudRanges = [
    '35.184.0.0/13',       // Google Cloud
    '52.0.0.0/8',          // AWS
    '13.0.0.0/8',          // AWS
    '8.8.8.8',             // Google DNS
    '1.1.1.1'              // Cloudflare DNS
  ];
  
  // Simple check for common cloud IPs
  return ip === '8.8.8.8' || ip === '1.1.1.1' || ip.startsWith('52.') || ip.startsWith('35.');
};

// Middleware për të ruajtur body origjinal
const preserveOriginalBody = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    req.originalBody = JSON.parse(JSON.stringify(req.body));
  }
  next();
};

// Middleware për login/logout audit
const authAuditMiddleware = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseData = null;
  let responseStatus = 200;

  res.send = function(data) {
    responseData = data;
    responseStatus = res.statusCode;
    return originalSend.call(this, data);
  };

  res.json = function(data) {
    responseData = data;
    responseStatus = res.statusCode;
    return originalJson.call(this, data);
  };

  next();

  // Log auth events
  res.on('finish', async () => {
    try {
      const clientInfo = getClientInfo(req);
      const ipAddress = clientInfo.ip;
      const userAgent = clientInfo.userAgent;

      if (req.path.includes('/login')) {
        let success = false;
        let userData = null;
        let attemptedEmail = req.body?.email || 'Email i panjohur';

        try {
          if (responseData) {
            const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
            success = parsed.token && parsed.user && responseStatus < 400;
            userData = parsed.user;
          }
        } catch (e) {
          success = false;
        }

        // If status code indicates failure, it's a failed login
        if (responseStatus >= 400) {
          success = false;
        }

        // Enhanced metadata with client information
        const enhancedMetadata = {
          success,
          clientInfo: {
            ip: ipAddress,
            userAgent: userAgent,
            isLocal: clientInfo.isLocal,
            isProxy: clientInfo.isProxy,
            referer: clientInfo.referer,
            origin: clientInfo.origin,
            language: clientInfo.language,
            timestamp: new Date().toISOString()
          }
        };

        await auditService.logLogin(
          userData?.id || null,
          attemptedEmail,
          userData?.role || null,
          ipAddress,
          userAgent,
          success,
          enhancedMetadata
        );
      } else if (req.path.includes('/logout')) {
        const user = req.user;
        if (user) {
          await auditService.logLogout(
            user.id,
            user.email,
            user.role,
            ipAddress,
            userAgent
          );
        }
      }
    } catch (error) {
      console.error('[AUTH AUDIT] Gabim në logimin e auth event:', error);
    }
  });
};

// Middleware për sensitive operations
const sensitiveOperationAudit = (operation, entityType, description) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseData = null;
    let statusCode = 200;

    res.send = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    try {
      await next();

      // Log sensitive operation
      if (statusCode >= 200 && statusCode < 300) {
        const { user } = req;
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const userAgent = req.headers['user-agent'];

        await auditService.logSensitiveOperation(
          user?.id,
          user?.email,
          user?.role,
          operation,
          entityType,
          req.params.id || req.body.id,
          description,
          ipAddress,
          userAgent
        );
      }

    } catch (error) {
      // Log error
      const { user } = req;
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];

      await auditService.logSensitiveOperation(
        user?.id,
        user?.email,
        user?.role,
        `${operation}_ERROR`,
        entityType,
        req.params.id || req.body.id,
        `Gabim në ${description}: ${error.message}`,
        ipAddress,
        userAgent
      );

      throw error;
    }
  };
};

module.exports = {
  auditMiddleware,
  preserveOriginalBody,
  authAuditMiddleware,
  sensitiveOperationAudit
}; 