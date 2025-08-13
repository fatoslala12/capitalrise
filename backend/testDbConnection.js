const { pool, performHealthCheck, keepAlive } = require('./db');

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection and keep-alive...\n');
  
  try {
    // Test initial connection
    console.log('1️⃣ Testing initial connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Connection successful!');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   Database version:', result.rows[0].db_version.split(' ')[0]);
    client.release();
    
    // Test health check
    console.log('\n2️⃣ Testing health check...');
    const healthResult = await performHealthCheck();
    console.log(healthResult ? '✅ Health check passed' : '❌ Health check failed');
    
    // Test keep-alive
    console.log('\n3️⃣ Testing keep-alive...');
    await keepAlive();
    console.log('✅ Keep-alive test completed');
    
    // Test connection pool status
    console.log('\n4️⃣ Connection pool status:');
    console.log('   Total connections:', pool.totalCount);
    console.log('   Idle connections:', pool.idleCount);
    console.log('   Waiting clients:', pool.waitingCount);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('💡 The database will now stay alive with automatic keep-alive every 4 minutes.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Don't close the pool, let it keep running
    console.log('\n🔄 Database connection will remain active for keep-alive...');
  }
}

// Run the test
testDatabaseConnection();

// Keep the script running to observe keep-alive
console.log('\n⏰ Keep-alive will run every 4 minutes. Press Ctrl+C to stop...');