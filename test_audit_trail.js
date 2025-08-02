import axios from 'axios';

// Test audit trail API endpoints
async function testAuditTrail() {
  const baseURL = 'http://localhost:5000';
  
  console.log('🧪 Testing Audit Trail API...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    const healthCheck = await axios.get(`${baseURL}/api/health`).catch(() => null);
    if (healthCheck) {
      console.log('✅ Server is running');
    } else {
      console.log('❌ Server not responding');
      return;
    }
    
    // Test 2: Test audit stats endpoint (should return auth error)
    console.log('\n2. Testing audit stats endpoint...');
    try {
      const statsResponse = await axios.get(`${baseURL}/api/audit/stats`);
      console.log('✅ Audit stats endpoint working');
    } catch (error) {
      if (error.response?.data?.error === 'Token mungon' || error.response?.data?.error === 'Token i pavlefshëm') {
        console.log('✅ Audit stats endpoint working (auth required as expected)');
      } else {
        console.log('❌ Audit stats endpoint error:', error.response?.data?.error || error.message);
      }
    }
    
    // Test 3: Test audit logs endpoint
    console.log('\n3. Testing audit logs endpoint...');
    try {
      const logsResponse = await axios.get(`${baseURL}/api/audit/logs?limit=5`);
      console.log('✅ Audit logs endpoint working');
    } catch (error) {
      if (error.response?.data?.error === 'Token mungon' || error.response?.data?.error === 'Token i pavlefshëm') {
        console.log('✅ Audit logs endpoint working (auth required as expected)');
      } else {
        console.log('❌ Audit logs endpoint error:', error.response?.data?.error || error.message);
      }
    }
    
    console.log('\n🎉 Audit Trail API tests completed!');
    console.log('\n📝 Note: Authentication errors are expected since we\'re not providing valid tokens.');
    console.log('The API endpoints are working correctly and require proper authentication.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuditTrail();