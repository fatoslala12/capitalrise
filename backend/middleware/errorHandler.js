const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');

const auditService = new AuditService();

// Klasa për custom errors
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Për të dalluar nga programmatic errors
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error codes dhe messages
const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_INVALID_TOKEN: { code: 'AUTH_INVALID_TOKEN', message: 'Token i pavlefshëm', status: 401 },
  AUTH_EXPIRED_TOKEN: { code: 'AUTH_EXPIRED_TOKEN', message: 'Token ka skaduar', status: 401 },
  AUTH_INSUFFICIENT_PERMISSIONS: { code: 'AUTH_INSUFFICIENT_PERMISSIONS', message: 'Nuk keni leje për këtë veprim', status: 403 },
  AUTH_USER_NOT_FOUND: { code: 'AUTH_USER_NOT_FOUND', message: 'Përdoruesi nuk u gjet', status: 404 },
  
  // Database
  DB_CONNECTION_ERROR: { code: 'DB_CONNECTION_ERROR', message: 'Gabim në lidhjen me databazën', status: 503 },
  DB_QUERY_ERROR: { code: 'DB_QUERY_ERROR', message: 'Gabim në ekzekutimin e query', status: 500 },
  DB_RECORD_NOT_FOUND: { code: 'DB_RECORD_NOT_FOUND', message: 'Regjistri nuk u gjet', status: 404 },
  DB_DUPLICATE_ENTRY: { code: 'DB_DUPLICATE_ENTRY', message: 'Regjistri ekziston tashmë', status: 409 },
  DB_FOREIGN_KEY_VIOLATION: { code: 'DB_FOREIGN_KEY_VIOLATION', message: 'Gabim në lidhjen e të dhënave', status: 400 },
  
  // Validation
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Të dhënat nuk janë të vlefshme', status: 400 },
  VALIDATION_REQUIRED_FIELD: { code: 'VALIDATION_REQUIRED_FIELD', message: 'Fusha është e detyrueshme', status: 400 },
  VALIDATION_INVALID_FORMAT: { code: 'VALIDATION_INVALID_FORMAT', message: 'Formati nuk është i vlefshëm', status: 400 },
  VALIDATION_INVALID_EMAIL: { code: 'VALIDATION_INVALID_EMAIL', message: 'Email-i nuk është i vlefshëm', status: 400 },
  VALIDATION_INVALID_PHONE: { code: 'VALIDATION_INVALID_PHONE', message: 'Numri i telefonit nuk është i vlefshëm', status: 400 },
  
  // File Operations
  FILE_UPLOAD_ERROR: { code: 'FILE_UPLOAD_ERROR', message: 'Gabim në ngarkimin e file', status: 500 },
  FILE_NOT_FOUND: { code: 'FILE_NOT_FOUND', message: 'File nuk u gjet', status: 404 },
  FILE_TOO_LARGE: { code: 'FILE_TOO_LARGE', message: 'File është shumë i madh', status: 413 },
  FILE_INVALID_TYPE: { code: 'FILE_INVALID_TYPE', message: 'Tipi i file nuk është i lejuar', status: 400 },
  
  // Business Logic
  BUSINESS_RULE_VIOLATION: { code: 'BUSINESS_RULE_VIOLATION', message: 'Shkelohet rregulla e biznesit', status: 400 },
  INSUFFICIENT_BALANCE: { code: 'INSUFFICIENT_BALANCE', message: 'Bilanci i pamjaftueshëm', status: 400 },
  CONTRACT_EXPIRED: { code: 'CONTRACT_EXPIRED', message: 'Kontrata ka skaduar', status: 400 },
  EMPLOYEE_ALREADY_ASSIGNED: { code: 'EMPLOYEE_ALREADY_ASSIGNED', message: 'Punonjësi është caktuar tashmë', status: 409 },
  
  // External Services
  EXTERNAL_SERVICE_ERROR: { code: 'EXTERNAL_SERVICE_ERROR', message: 'Gabim në shërbimin e jashtëm', status: 502 },
  EMAIL_SERVICE_ERROR: { code: 'EMAIL_SERVICE_ERROR', message: 'Gabim në dërgimin e email', status: 500 },
  SMS_SERVICE_ERROR: { code: 'SMS_SERVICE_ERROR', message: 'Gabim në dërgimin e SMS', status: 500 },
  PAYMENT_SERVICE_ERROR: { code: 'PAYMENT_SERVICE_ERROR', message: 'Gabim në procesimin e pagesës', status: 500 },
  
  // System
  INTERNAL_SERVER_ERROR: { code: 'INTERNAL_SERVER_ERROR', message: 'Gabim i brendshëm i serverit', status: 500 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', message: 'Shërbimi nuk është i disponueshëm', status: 503 },
  RATE_LIMIT_EXCEEDED: { code: 'RATE_LIMIT_EXCEEDED', message: 'Keni tejkaluar limitin e kërkesave', status: 429 },
  MAINTENANCE_MODE: { code: 'MAINTENANCE_MODE', message: 'Sistemi është në mirëmbajtje', status: 503 },
  
  // Network
  NETWORK_TIMEOUT: { code: 'NETWORK_TIMEOUT', message: 'Kërkesa ka skaduar', status: 408 },
  NETWORK_CONNECTION_ERROR: { code: 'NETWORK_CONNECTION_ERROR', message: 'Gabim në lidhjen e rrjetit', status: 503 },
  
  // Security
  SECURITY_VIOLATION: { code: 'SECURITY_VIOLATION', message: 'Shkelohet siguria', status: 403 },
  SUSPICIOUS_ACTIVITY: { code: 'SUSPICIOUS_ACTIVITY', message: 'Aktivitet i verdhësishëm u detektua', status: 403 },
  CSRF_TOKEN_INVALID: { code: 'CSRF_TOKEN_INVALID', message: 'Token CSRF i pavlefshëm', status: 403 },
  
  // Resource
  RESOURCE_NOT_FOUND: { code: 'RESOURCE_NOT_FOUND', message: 'Burimi nuk u gjet', status: 404 },
  RESOURCE_ALREADY_EXISTS: { code: 'RESOURCE_ALREADY_EXISTS', message: 'Burimi ekziston tashmë', status: 409 },
  RESOURCE_IN_USE: { code: 'RESOURCE_IN_USE', message: 'Burimi është në përdorim', status: 409 },
  
  // Configuration
  CONFIG_ERROR: { code: 'CONFIG_ERROR', message: 'Gabim në konfigurimin e sistemit', status: 500 },
  ENV_VAR_MISSING: { code: 'ENV_VAR_MISSING', message: 'Variabla e mjedisit mungon', status: 500 }
};

// Krijimi i error nga code
function createError(errorCode, details = null, customMessage = null) {
  const errorInfo = ERROR_CODES[errorCode];
  if (!errorInfo) {
    return new AppError('Gabim i panjohur', 500, 'UNKNOWN_ERROR', details);
  }
  
  const message = customMessage || errorInfo.message;
  return new AppError(message, errorInfo.status, errorCode, details);
}

// Log error me detaje
async function logError(error, req, res) {
  try {
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorCode: error.errorCode || 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      requestBody: req.body,
      requestParams: req.params,
      requestQuery: req.query,
      headers: {
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? 'Bearer ***' : null
      }
    };

    // Log në console me ngjyra
    console.error('\x1b[31m%s\x1b[0m', '🚨 ERROR LOG:');
    console.error('\x1b[33m%s\x1b[0m', `Code: ${errorLog.errorCode}`);
    console.error('\x1b[33m%s\x1b[0m', `Status: ${errorLog.statusCode}`);
    console.error('\x1b[33m%s\x1b[0m', `Message: ${errorLog.message}`);
    console.error('\x1b[33m%s\x1b[0m', `URL: ${errorLog.url}`);
    console.error('\x1b[33m%s\x1b[0m', `User: ${errorLog.userEmail || 'Anonymous'}`);
    console.error('\x1b[33m%s\x1b[0m', `IP: ${errorLog.ip}`);
    console.error('\x1b[33m%s\x1b[0m', `Timestamp: ${errorLog.timestamp}`);
    
    if (error.stack) {
      console.error('\x1b[31m%s\x1b[0m', 'Stack Trace:');
      console.error('\x1b[31m%s\x1b[0m', error.stack);
    }

    // Ruaj në audit trail për errors kritike
    if (error.statusCode >= 500 || error.errorCode?.includes('SECURITY')) {
      await auditService.logSystemEvent(
        'ERROR_CRITICAL',
        `Gabim kritik: ${error.message}`,
        {
          errorCode: error.errorCode,
          statusCode: error.statusCode,
          url: req.originalUrl,
          user: req.user?.email
        },
        'error'
      );
    }

    // Dërgo notification për adminët për errors kritike
    if (error.statusCode >= 500) {
      try {
        // Merr adminët
        const pool = require('../db');
        const result = await pool.query(`
          SELECT id, email FROM users WHERE role = 'admin' AND status = 'active'
        `);

        for (const admin of result.rows) {
          await NotificationService.createNotification(
            admin.id,
            '🚨 Gabim Kritik në Sistem',
            `Gabim ${error.errorCode}: ${error.message} në ${req.originalUrl}`,
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

  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

// Format response error
function formatErrorResponse(error, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  let response = {
    success: false,
    error: {
      code: error.errorCode || 'UNKNOWN_ERROR',
      message: error.message,
      statusCode: error.statusCode || 500
    }
  };

  // Shto detaje në development
  if (isDevelopment) {
    response.error.details = {
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      requestId: req.id || null
    };
  }

  // Në production, fsheh detaje të ndjeshme
  if (isProduction && error.statusCode >= 500) {
    response.error.message = 'Gabim i brendshëm i serverit';
    response.error.code = 'INTERNAL_SERVER_ERROR';
  }

  return response;
}

// Middleware kryesor për error handling
const errorHandler = async (error, req, res, next) => {
  // Log error
  await logError(error, req, res);

  // Format response
  const errorResponse = formatErrorResponse(error, req);

  // Set status code
  res.status(error.statusCode || 500);

  // Send response
  res.json(errorResponse);
};

// Middleware për 404 errors
const notFoundHandler = (req, res, next) => {
  const error = createError('RESOURCE_NOT_FOUND', {
    path: req.originalUrl,
    method: req.method
  });
  next(error);
};

// Middleware për async error handling
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware për validation errors
const validationErrorHandler = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const validationError = createError('VALIDATION_ERROR', {
      fields: Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value
      }))
    });
    return next(validationError);
  }
  next(error);
};

// Middleware për database errors
const databaseErrorHandler = (error, req, res, next) => {
  if (error.code === '23505') { // Unique violation
    const dbError = createError('DB_DUPLICATE_ENTRY', {
      constraint: error.constraint,
      detail: error.detail
    });
    return next(dbError);
  }
  
  if (error.code === '23503') { // Foreign key violation
    const dbError = createError('DB_FOREIGN_KEY_VIOLATION', {
      constraint: error.constraint,
      detail: error.detail
    });
    return next(dbError);
  }
  
  if (error.code === '23502') { // Not null violation
    const dbError = createError('VALIDATION_REQUIRED_FIELD', {
      column: error.column,
      table: error.table
    });
    return next(dbError);
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    const dbError = createError('DB_CONNECTION_ERROR', {
      code: error.code,
      message: error.message
    });
    return next(dbError);
  }
  
  next(error);
};

// Middleware për rate limiting errors
const rateLimitErrorHandler = (error, req, res, next) => {
  if (error.status === 429) {
    const rateLimitError = createError('RATE_LIMIT_EXCEEDED', {
      retryAfter: error.headers?.['retry-after'],
      limit: error.limit,
      windowMs: error.windowMs
    });
    return next(rateLimitError);
  }
  next(error);
};

// Middleware për security errors
const securityErrorHandler = (error, req, res, next) => {
  if (error.name === 'JsonWebTokenError') {
    const authError = createError('AUTH_INVALID_TOKEN');
    return next(authError);
  }
  
  if (error.name === 'TokenExpiredError') {
    const authError = createError('AUTH_EXPIRED_TOKEN');
    return next(authError);
  }
  
  if (error.name === 'UnauthorizedError') {
    const authError = createError('AUTH_INSUFFICIENT_PERMISSIONS');
    return next(authError);
  }
  
  next(error);
};

// Utility functions
const errorUtils = {
  // Krijimi i error nga code
  createError,
  
  // Error codes
  ERROR_CODES,
  
  // Kontrollo nëse është operational error
  isOperationalError: (error) => {
    return error.isOperational === true;
  },
  
  // Kontrollo nëse është network error
  isNetworkError: (error) => {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ENOTFOUND' || 
           error.code === 'ETIMEDOUT';
  },
  
  // Kontrollo nëse është database error
  isDatabaseError: (error) => {
    return error.code && error.code.startsWith('23') ||
           error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND';
  },
  
  // Kontrollo nëse është validation error
  isValidationError: (error) => {
    return error.name === 'ValidationError' ||
           error.name === 'CastError' ||
           error.code === '23502';
  },
  
  // Kontrollo nëse është authentication error
  isAuthError: (error) => {
    return error.name === 'JsonWebTokenError' ||
           error.name === 'TokenExpiredError' ||
           error.name === 'UnauthorizedError';
  }
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  databaseErrorHandler,
  rateLimitErrorHandler,
  securityErrorHandler,
  errorUtils,
  createError,
  ERROR_CODES
}; 