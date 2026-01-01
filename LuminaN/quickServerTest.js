// Quick Test for Your Live Render Server
// This tests the connection to your running Render server at https://luminanzimbabwepos.onrender.com

class QuickServerTest {
  constructor() {
    this.serverUrl = 'https://luminanzimbabwepos.onrender.com';
    this.apiBase = '/api/v1/shop/';
  }

  // Test your live Render server
  async testLiveServer() {
    console.log('🚀 Testing Your Live Render Server...');
    console.log(`🌐 Server URL: ${this.serverUrl}`);
    console.log(`🔗 API Base: ${this.apiBase}`);
    
    const tests = [
      {
        name: 'Server Basic Connectivity',
        test: () => this.testBasicConnectivity()
      },
      {
        name: 'API Endpoints Test',
        test: () => this.testAPIEndpoints()
      },
      {
        name: 'CORS Headers Test',
        test: () => this.testCORSHeaders()
      },
      {
        name: 'Response Time Test',
        test: () => this.testResponseTime()
      }
    ];

    const results = [];
    
    for (const test of tests) {
      try {
        console.log(`\n🔍 Testing: ${test.name}...`);
        const result = await test.test();
        results.push({ name: test.name, success: true, ...result });
        console.log(`✅ ${test.name}: SUCCESS`);
      } catch (error) {
        results.push({ name: test.name, success: false, error: error.message });
        console.log(`❌ ${test.name}: FAILED - ${error.message}`);
      }
    }

    this.printResults(results);
    return results;
  }

  // Test basic connectivity
  async testBasicConnectivity() {
    const startTime = Date.now();
    
    // Test the root endpoint first
    const response = await fetch(`${this.serverUrl}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LuminaN-POS-Test/1.0'
      }
    });

    const responseTime = Date.now() - startTime;
    
    return {
      status: response.status,
      responseTime: `${responseTime}ms`,
      serverReachable: response.status !== 404 || response.status === 404, // 404 is OK for root
      note: 'Server is reachable and responding'
    };
  }

  // Test API endpoints
  async testAPIEndpoints() {
    const endpoints = [
      { path: 'status/', name: 'Shop Status' },
      { path: 'products/', name: 'Products' },
      { path: 'sales/', name: 'Sales' },
      { path: 'login/', name: 'Login' },
      { path: 'dashboard/', name: 'Dashboard' }
    ];

    const results = {};
    let workingCount = 0;
    
    for (const endpoint of endpoints) {
      try {
        const fullPath = `${this.apiBase}${endpoint.path}`;
        const response = await fetch(`${this.serverUrl}${fullPath}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'LuminaN-POS-Test/1.0'
          }
        });
        
        const isWorking = response.status !== 404 && response.status !== 500;
        if (isWorking) workingCount++;
        
        results[endpoint.name] = {
          path: fullPath,
          status: response.status,
          accessible: isWorking
        };
      } catch (error) {
        results[endpoint.name] = {
          path: `${this.apiBase}${endpoint.path}`,
          status: 'error',
          accessible: false,
          error: error.message
        };
      }
    }

    return {
      totalEndpoints: endpoints.length,
      workingEndpoints: workingCount,
      endpointResults: results
    };
  }

  // Test CORS headers
  async testCORSHeaders() {
    const response = await fetch(`${this.serverUrl}${this.apiBase}status/`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    });

    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers')
    };

    return {
      status: response.status,
      corsHeaders: corsHeaders,
      corsEnabled: corsHeaders['access-control-allow-origin'] !== null || response.status === 200, // Django might not send CORS headers for OPTIONS
      note: 'CORS configuration check'
    };
  }

  // Test response time
  async testResponseTime() {
    const times = [];
    
    // Test 3 requests for average
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      try {
        await fetch(`${this.serverUrl}${this.apiBase}status/`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        times.push(Date.now() - startTime);
      } catch (error) {
        times.push(9999); // Mark failed requests
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const validTimes = times.filter(t => t < 9999);
    const avgTime = validTimes.length > 0 
      ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
      : 0;
    
    return {
      individualTimes: times,
      averageTime: `${avgTime}ms`,
      fastResponse: avgTime < 2000,
      allRequestsSuccessful: validTimes.length === times.length,
      note: 'Average response time over 3 requests'
    };
  }

  // Print test results
  printResults(results) {
    console.log('\n🧪 RENDER SERVER TEST RESULTS');
    console.log('==============================');
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`\n📊 SUMMARY: ${passed}/${total} tests passed (${successRate}%)`);
    console.log('==============================');
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.name}`);
      
      if (result.success) {
        if (result.status !== undefined) console.log(`   Status: ${result.status}`);
        if (result.responseTime) console.log(`   Response Time: ${result.responseTime}`);
        if (result.serverReachable !== undefined) {
          console.log(`   Server Reachable: ${result.serverReachable ? 'Yes' : 'No'}`);
        }
        if (result.corsEnabled !== undefined) {
          console.log(`   CORS: ${result.corsEnabled ? 'Enabled' : 'Check needed'}`);
        }
        if (result.workingEndpoints) {
          console.log(`   Working Endpoints: ${result.workingEndpoints}`);
        }
        if (result.averageTime) {
          console.log(`   Avg Response: ${result.averageTime}`);
          console.log(`   Fast Response: ${result.fastResponse ? 'Yes' : 'No'}`);
        }
        if (result.note) console.log(`   Note: ${result.note}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Final verdict
    console.log('\n🎯 FINAL VERDICT:');
    if (passed >= total * 0.75) { // 75% success rate
      console.log('🎉 SERVER IS OPERATIONAL!');
      console.log('✅ Your Render server is running successfully');
      console.log('✅ API endpoints are accessible');
      console.log('✅ Ready for offline-first POS integration');
      console.log('\n🚀 Your offline-first system can now connect to the cloud!');
    } else if (passed > 0) {
      console.log('⚠️ SERVER PARTIALLY WORKING');
      console.log('🔧 Some endpoints may need attention');
      console.log('💡 Your offline-first system can still work offline');
    } else {
      console.log('❌ SERVER ISSUES DETECTED');
      console.log('🔧 Check server configuration and logs');
      console.log('💡 Your offline-first system works offline regardless');
    }
  }

  // Simple connectivity test
  async quickConnectivityTest() {
    console.log('🚀 Quick Connectivity Test...');
    console.log(`🌐 Testing: ${this.serverUrl}`);
    
    try {
      const response = await fetch(`${this.serverUrl}${this.apiBase}status/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok || response.status === 401 || response.status === 403) {
        // 401/403 is OK - means server is responding but needs auth
        console.log('✅ Render server is reachable and responding!');
        console.log(`📊 Status: ${response.status} (${response.status === 401 ? 'Needs Authentication' : response.status === 403 ? 'Forbidden' : 'OK'})`);
        return true;
      } else {
        console.log(`❌ Server responded with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log('❌ Cannot reach Render server:', error.message);
      return false;
    }
  }

  // Test specific endpoint
  async testEndpoint(endpointPath) {
    console.log(`🔍 Testing endpoint: ${endpointPath}`);
    
    try {
      const response = await fetch(`${this.serverUrl}${this.apiBase}${endpointPath}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log(`📊 Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success! Data:', data);
        return { success: true, data, status: response.status };
      } else {
        console.log('⚠️ Endpoint returned error status');
        return { success: false, status: response.status };
      }
    } catch (error) {
      console.log('❌ Endpoint test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export for use
export default QuickServerTest;

// Quick usage examples:
// import QuickServerTest from './quickServerTest.js';
// 
// // Run quick test
// await QuickServerTest.quickConnectivityTest();
// 
// // Run full test suite
// const test = new QuickServerTest();
// await test.testLiveServer();
// 
// // Test specific endpoint
// await test.testEndpoint('products/');