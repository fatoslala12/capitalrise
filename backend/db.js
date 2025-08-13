const { Pool } = require('pg');

// Enhanced connection pool configuration with keep-alive
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_vzOic6bTHB5o@ep-shy-truth-a2p7hce5-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
  
  // Connection pool optimizations for long-running applications
  max: 20,                    // Maximum number of clients in the pool
  min: 2,                     // Minimum number of clients to keep alive
  idleTimeoutMillis: 300000,  // Keep connections alive for 5 minutes (was 30 seconds)
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  maxUses: 7500,              // Close (and replace) a connection after it has been used 7500 times
  
  // Keep-alive settings
  keepAlive: true,            // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // Start keep-alive after 10 seconds
  
  // Statement timeout to prevent hanging queries
  statement_timeout: 30000,   // 30 seconds timeout for queries
  
  // Application name for monitoring
  application_name: 'building-system-backend'
});

// Enhanced error handling
pool.on('error', (err, client) => {
  console.error('🚨 Database pool error:', err.message);
  // Don't exit the process, just log the error
  // The pool will automatically try to reconnect
});

// Connection acquired event
pool.on('acquire', (client) => {
  console.log('🔗 Database connection acquired, active connections:', pool.totalCount);
});

// Connection released event
pool.on('release', (client) => {
  console.log('🔓 Database connection released, active connections:', pool.totalCount);
});

// Connection connect event
pool.on('connect', (client) => {
  console.log('✅ New database connection established');
});

// Connection remove event
pool.on('remove', (client) => {
  console.log('❌ Database connection removed');
});

// Health check function
const performHealthCheck = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1 as health_check');
    client.release();
    console.log('💚 Database health check passed');
    return true;
  } catch (error) {
    console.error('💔 Database health check failed:', error.message);
    return false;
  }
};

// Keep-alive function to prevent connections from going to sleep
const keepAlive = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1 as keep_alive');
    client.release();
    console.log('💓 Database keep-alive ping sent');
  } catch (error) {
    console.error('💔 Database keep-alive failed:', error.message);
    // Try to reconnect
    await reconnectPool();
  }
};

// Reconnection function
const reconnectPool = async () => {
  try {
    console.log('🔄 Attempting to reconnect to database...');
    
    // Close all existing connections
    await pool.end();
    
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Recreate the pool
    const newPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_vzOic6bTHB5o@ep-shy-truth-a2p7hce5-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
      ssl: { rejectUnauthorized: false },
      max: 20,
      min: 2,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 10000,
      maxUses: 7500,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      statement_timeout: 30000,
      application_name: 'building-system-backend'
    });
    
    // Copy the new pool to the existing reference
    Object.assign(pool, newPool);
    
    console.log('✅ Database reconnection successful');
  } catch (error) {
    console.error('❌ Database reconnection failed:', error.message);
  }
};

// Enhanced connection test with retry mechanism
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[INIT] Duke testuar lidhjen me databazën... (attempt ${i + 1}/${retries})`);
      
      const client = await pool.connect();
      await client.query('SELECT 1 as connection_test');
      client.release();
      
      console.log('✅ Lidhja me databazën u realizua me sukses!');
      return true;
    } catch (err) {
      console.error(`❌ Gabim gjatë lidhjes me databazën (attempt ${i + 1}/${retries}):`, err.message);
      
      if (i < retries - 1) {
        console.log('🔄 Duke provuar përsëri në 5 sekonda...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  console.error('❌ Të gjitha tentativat për lidhje me databazën dështuan');
  return false;
};

// Initialize connection and start keep-alive
(async () => {
  const connected = await testConnection();
  
  if (connected) {
    // Start health check every 2 minutes
    setInterval(performHealthCheck, 2 * 60 * 1000);
    
    // Start keep-alive every 4 minutes to prevent sleep
    setInterval(keepAlive, 4 * 60 * 1000);
    
    console.log('🚀 Database monitoring and keep-alive activated');
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down database connections gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down database connections gracefully...');
  await pool.end();
  process.exit(0);
});

// Export enhanced pool with utility functions
module.exports = {
  pool,
  performHealthCheck,
  keepAlive,
  reconnectPool,
  testConnection
};
