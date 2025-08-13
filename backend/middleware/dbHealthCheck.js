const { pool, performHealthCheck, reconnectPool } = require('../db');

// Database health check middleware
const dbHealthCheck = async (req, res, next) => {
  try {
    // Skip health check for certain endpoints to avoid infinite loops
    if (req.path.includes('/health') || req.path.includes('/test')) {
      return next();
    }
    
    // Quick health check
    const client = await pool.connect();
    await client.query('SELECT 1 as health_check');
    client.release();
    
    // If we get here, database is healthy
    next();
  } catch (error) {
    console.error('🚨 Database health check failed in middleware:', error.message);
    
    // Try to reconnect
    try {
      console.log('🔄 Attempting automatic reconnection...');
      await reconnectPool();
      
      // Test the reconnection
      const client = await pool.connect();
      await client.query('SELECT 1 as reconnection_test');
      client.release();
      
      console.log('✅ Automatic reconnection successful, continuing request...');
      next();
    } catch (reconnectError) {
      console.error('❌ Automatic reconnection failed:', reconnectError.message);
      
      // Return error response
      res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Duke provuar të lidhemi me databazën...',
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Optional: Add a route to manually check database health
const addHealthRoutes = (app) => {
  app.get('/api/health/db', async (req, res) => {
    try {
      const healthResult = await performHealthCheck();
      
      if (healthResult) {
        res.json({
          success: true,
          status: 'healthy',
          message: 'Database connection is working properly',
          timestamp: new Date().toISOString(),
          pool: {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
          }
        });
      } else {
        res.status(503).json({
          success: false,
          status: 'unhealthy',
          message: 'Database connection is not working',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'error',
        message: 'Error checking database health',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.post('/api/health/db/reconnect', async (req, res) => {
    try {
      console.log('🔄 Manual reconnection requested...');
      await reconnectPool();
      
      res.json({
        success: true,
        message: 'Database reconnection completed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Database reconnection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
};

module.exports = {
  dbHealthCheck,
  addHealthRoutes
};