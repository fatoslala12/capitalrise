const { createError } = require('../middleware/errorHandler');

class RateLimitService {
  constructor() {
    this.rateLimits = new Map();
    this.config = {
      // Default limits
      default: {
        windowMs: 15 * 60 * 1000, // 15 minuta
        max: 100, // 100 requests per window
        message: 'Keni tejkaluar limitin e kërkesave. Provoni përsëri më vonë.',
        statusCode: 429,
        headers: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      
      // Auth endpoints
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minuta
        max: 5, // 5 login attempts per 15 minutes
        message: 'Shumë tentativa të dështuara. Provoni përsëri më vonë.',
        statusCode: 429,
        headers: true,
        skipSuccessfulRequests: true,
        skipFailedRequests: false
      },
      
      // API endpoints
      api: {
        windowMs: 60 * 1000, // 1 minutë
        max: 60, // 60 requests per minute
        message: 'Keni tejkaluar limitin e kërkesave API.',
        statusCode: 429,
        headers: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      
      // File upload
      upload: {
        windowMs: 60 * 60 * 1000, // 1 orë
        max: 10, // 10 uploads per hour
        message: 'Keni tejkaluar limitin e ngarkimeve të file-ve.',
        statusCode: 429,
        headers: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      
      // Admin operations
      admin: {
        windowMs: 60 * 1000, // 1 minutë
        max: 30, // 30 requests per minute
        message: 'Keni tejkaluar limitin e operacioneve admin.',
        statusCode: 429,
        headers: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      
      // Backup operations
      backup: {
        windowMs: 60 * 60 * 1000, // 1 orë
        max: 5, // 5 backup operations per hour
        message: 'Keni tejkaluar limitin e operacioneve të backup.',
        statusCode: 429,
        headers: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      
      // Real-time alerts
      alerts: {
        windowMs: 60 * 1000, // 1 minutë
        max: 20, // 20 alert operations per minute
        message: 'Keni tejkaluar limitin e operacioneve të alerts.',
        statusCode: 429,
        headers: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      }
    };
  }

  // Krijimi i key për rate limiting
  generateKey(req, type = 'default') {
    const identifier = req.user?.id || req.ip || 'anonymous';
    return `${type}:${identifier}`;
  }

  // Kontrollo rate limit
  checkRateLimit(req, type = 'default') {
    const config = this.config[type] || this.config.default;
    const key = this.generateKey(req, type);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Merr historikun e kërkesave
    let requests = this.rateLimits.get(key) || [];
    
    // Fshij kërkesat e vjetra
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Kontrollo nëse ka hapësirë
    if (requests.length >= config.max) {
      // Llogarit kohën e mbetur
      const oldestRequest = Math.min(...requests);
      const resetTime = oldestRequest + config.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      // Log rate limit violation
      this.logRateLimitViolation(req, type, config, retryAfter);

      throw createError('RATE_LIMIT_EXCEEDED', {
        type,
        limit: config.max,
        windowMs: config.windowMs,
        retryAfter,
        resetTime: new Date(resetTime).toISOString()
      }, config.message);
    }

    // Shto kërkesën aktuale
    requests.push(now);
    this.rateLimits.set(key, requests);

    // Shto headers në response
    if (config.headers) {
      req.rateLimitInfo = {
        limit: config.max,
        remaining: config.max - requests.length,
        reset: new Date(now + config.windowMs).toISOString(),
        retryAfter: 0
      };
    }

    return true;
  }

  // Log rate limit violation
  logRateLimitViolation(req, type, config, retryAfter) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️ RATE LIMIT VIOLATION:');
    console.warn('\x1b[33m%s\x1b[0m', `Type: ${type}`);
    console.warn('\x1b[33m%s\x1b[0m', `IP: ${req.ip || req.connection.remoteAddress}`);
    console.warn('\x1b[33m%s\x1b[0m', `User: ${req.user?.email || 'Anonymous'}`);
    console.warn('\x1b[33m%s\x1b[0m', `URL: ${req.originalUrl}`);
    console.warn('\x1b[33m%s\x1b[0m', `Method: ${req.method}`);
    console.warn('\x1b[33m%s\x1b[0m', `Limit: ${config.max}`);
    console.warn('\x1b[33m%s\x1b[0m', `Window: ${config.windowMs}ms`);
    console.warn('\x1b[33m%s\x1b[0m', `Retry After: ${retryAfter}s`);
  }

  // Middleware për rate limiting
  rateLimitMiddleware(type = 'default') {
    return (req, res, next) => {
      try {
        this.checkRateLimit(req, type);
        
        // Shto headers në response
        if (req.rateLimitInfo) {
          res.set({
            'X-RateLimit-Limit': req.rateLimitInfo.limit,
            'X-RateLimit-Remaining': req.rateLimitInfo.remaining,
            'X-RateLimit-Reset': req.rateLimitInfo.reset,
            'Retry-After': req.rateLimitInfo.retryAfter
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware për auth rate limiting
  authRateLimitMiddleware() {
    return (req, res, next) => {
      try {
        this.checkRateLimit(req, 'auth');
        
        // Për login të dështuar, shto kërkesën
        if (req.path === '/login' && req.method === 'POST') {
          const key = this.generateKey(req, 'auth');
          let requests = this.rateLimits.get(key) || [];
          requests.push(Date.now());
          this.rateLimits.set(key, requests);
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware për API rate limiting
  apiRateLimitMiddleware() {
    return (req, res, next) => {
      try {
        this.checkRateLimit(req, 'api');
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware për upload rate limiting
  uploadRateLimitMiddleware() {
    return (req, res, next) => {
      try {
        this.checkRateLimit(req, 'upload');
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware për admin rate limiting
  adminRateLimitMiddleware() {
    return (req, res, next) => {
      try {
        // Kontrollo nëse përdoruesi është admin
        if (req.user?.role !== 'admin') {
          return next();
        }
        
        this.checkRateLimit(req, 'admin');
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware për backup rate limiting
  backupRateLimitMiddleware() {
    return (req, res, next) => {
      try {
        this.checkRateLimit(req, 'backup');
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware për alerts rate limiting
  alertsRateLimitMiddleware() {
    return (req, res, next) => {
      try {
        this.checkRateLimit(req, 'alerts');
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Përditëso konfigurimin
  updateConfig(type, newConfig) {
    if (this.config[type]) {
      this.config[type] = { ...this.config[type], ...newConfig };
    } else {
      this.config[type] = { ...this.config.default, ...newConfig };
    }
    
    console.log(`✅ Rate limit config u përditësua për '${type}'`);
  }

  // Merr konfigurimin aktual
  getConfig(type = null) {
    if (type) {
      return this.config[type] || null;
    }
    return this.config;
  }

  // Reset rate limits për një përdorues
  resetRateLimit(identifier, type = 'default') {
    const key = `${type}:${identifier}`;
    this.rateLimits.delete(key);
    console.log(`✅ Rate limit u reset për '${key}'`);
  }

  // Reset të gjitha rate limits
  resetAllRateLimits() {
    this.rateLimits.clear();
    console.log('✅ Të gjitha rate limits u reset');
  }

  // Merr statistika të rate limits
  getRateLimitStats() {
    const stats = {
      totalKeys: this.rateLimits.size,
      configs: Object.keys(this.config),
      activeLimits: {}
    };

    // Merr statistika për çdo type
    for (const [type, config] of Object.entries(this.config)) {
      const typeKeys = Array.from(this.rateLimits.keys()).filter(key => key.startsWith(`${type}:`));
      stats.activeLimits[type] = {
        activeKeys: typeKeys.length,
        config: config
      };
    }

    return stats;
  }

  // Pastro rate limits të vjetër
  cleanupOldRateLimits() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, requests] of this.rateLimits.entries()) {
      const type = key.split(':')[0];
      const config = this.config[type] || this.config.default;
      const windowStart = now - config.windowMs;

      // Fshij kërkesat e vjetra
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length === 0) {
        this.rateLimits.delete(key);
        cleanedCount++;
      } else if (validRequests.length !== requests.length) {
        this.rateLimits.set(key, validRequests);
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 U pastruan ${cleanedCount} rate limits të vjetër`);
    }

    return cleanedCount;
  }

  // Kontrollo nëse një përdorues është i bllokuar
  isUserBlocked(identifier, type = 'default') {
    const key = `${type}:${identifier}`;
    const requests = this.rateLimits.get(key) || [];
    const config = this.config[type] || this.config.default;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    return recentRequests.length >= config.max;
  }

  // Merr kohën e mbetur për reset
  getTimeUntilReset(identifier, type = 'default') {
    const key = `${type}:${identifier}`;
    const requests = this.rateLimits.get(key) || [];
    const config = this.config[type] || this.config.default;
    const now = Date.now();

    if (requests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...requests);
    const resetTime = oldestRequest + config.windowMs;
    return Math.max(0, Math.ceil((resetTime - now) / 1000));
  }

  // Shto custom rate limit type
  addCustomRateLimit(type, config) {
    this.config[type] = { ...this.config.default, ...config };
    console.log(`✅ U shtua custom rate limit type: '${type}'`);
  }

  // Pastro automatikisht çdo 5 minuta
  startAutoCleanup() {
    setInterval(() => {
      this.cleanupOldRateLimits();
    }, 5 * 60 * 1000); // 5 minuta

    console.log('✅ Auto cleanup për rate limits u aktivizua');
  }
}

module.exports = RateLimitService; 