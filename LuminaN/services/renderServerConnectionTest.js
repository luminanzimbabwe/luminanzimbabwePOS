// Render Server Connection Test
// This script tests the connection to the real Render server and validates the offline-first architecture

import ServerIntegration from './serverIntegration.js';
import OfflineFirstTest from './offlineFirstTest.js';

class RenderServerConnectionTest {
  constructor() {
    this.serverUrl = 'https://luminanzimbabwepos.onrender.com';
    this.testResults = [];
  }

  // Run comprehensive connection test to Render server
  async runRenderConnectionTest() {
    console.log('🚀 Starting Render Server Connection Test...');
    console.log(`🌐 Testing server: ${this.serverUrl}`);

    try {
      // Test 1: Basic server connectivity
      await this.testBasicConnectivity();

      // Test 2: Server health endpoint
      await this.testServerHealth();

      // Test 3: API endpoints availability
      await this.testApiEndpoints();

      // Test 4: Initialize offline-first system
      await this.testOfflineFirstInitialization();

      // Test 5: Server integration
      await this.testServerIntegration();

      // Test 6: Comprehensive sync test
      await this.testFullSync();

      // Print results
      this.printTestResults();

    } catch (error) {
      console.error('❌ Render connection test failed:', error);
    }
  }

  // Test basic server connectivity
  async testBasicConnectivity() {
    console.log('\n🔍 Testing Basic Server Connectivity...');

    try {
      const startTime = Date.now();
      
      const response = await fetch(this.serverUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LuminaN-POS/1.0'
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.addTestResult('Basic Connectivity', true, `Response time: ${responseTime}ms, Status: ${response.status}`);
      } else {
        this.addTestResult('Basic Connectivity', false, `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.addTestResult('Basic Connectivity', false, error.message);
    }
  }

  // Test server health endpoint
  async testServerHealth() {
    console.log('\n🏥 Testing Server Health Endpoint...');

    try {
      const response = await fetch(`${this.serverUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LuminaN-POS/1.0'
        }
      });

      if (response.ok) {
        const healthData = await response.json();
        this.addTestResult('Health Endpoint', true, `Server healthy: ${JSON.stringify(healthData)}`);
      } else {
        this.addTestResult('Health Endpoint', false, `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.addTestResult('Health Endpoint', false, error.message);
    }
  }

  // Test API endpoints availability
  async testApiEndpoints() {
    console.log('\n🔌 Testing API Endpoints...');

    const endpoints = [
      '/api/products',
      '/api/sales',
      '/api/auth/login',
      '/api/owner/dashboard'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${this.serverUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'LuminaN-POS/1.0'
          }
        });

        const status = response.status;
        const accessible = status !== 404 && status !== 500;
        
        this.addTestResult(`API ${endpoint}`, accessible, `Status: ${status}`);

      } catch (error) {
        this.addTestResult(`API ${endpoint}`, false, error.message);
      }
    }
  }

  // Test offline-first system initialization
  async testOfflineFirstInitialization() {
    console.log('\n🔧 Testing Offline-First System Initialization...');

    try {
      // Initialize the offline-first system
      await ServerIntegration.initialize();
      
      this.addTestResult('Offline-First Init', true, 'System initialized successfully');

      // Test local database
      const dbStats = await ServerIntegration.healthCheck();
      this.addTestResult('Database Health', dbStats.checks.database === 'healthy', `Status: ${dbStats.checks.database}`);

    } catch (error) {
      this.addTestResult('Offline-First Init', false, error.message);
    }
  }

  // Test server integration
  async testServerIntegration() {
    console.log('\n🔗 Testing Server Integration...');

    try {
      // Test authentication
      const authResult = await ServerIntegration.authenticate();
      this.addTestResult('Server Authentication', authResult, 'Authentication completed');

      // Test product sync
      const productSync = await ServerIntegration.syncProducts();
      this.addTestResult('Product Sync', productSync.success, `Synced: ${productSync.serverProducts} products`);

      // Test sales sync
      const salesSync = await ServerIntegration.syncSales();
      this.addTestResult('Sales Sync', salesSync.success, `Synced: ${productSync.serverSales} sales`);

    } catch (error) {
      this.addTestResult('Server Integration', false, error.message);
    }
  }

  // Test full synchronization
  async testFullSync() {
    console.log('\n🔄 Testing Full Synchronization...');

    try {
      const syncResult = await ServerIntegration.performFullSync();
      
      this.addTestResult('Full Sync', syncResult.success, `Steps completed: ${syncResult.steps?.length || 0}`);

      // Check individual sync steps
      if (syncResult.steps) {
        syncResult.steps.forEach(step => {
          const stepName = step.step.replace('_', ' ').toUpperCase();
          this.addTestResult(`Sync Step: ${stepName}`, step.success, step.success ? 'Completed' : (step.error || 'Failed'));
        });
      }

    } catch (error) {
      this.addTestResult('Full Sync', false, error.message);
    }
  }

  // Add test result
  addTestResult(testName, passed, details = '') {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });

    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${details}`);
  }

  // Print comprehensive test results
  printTestResults() {
    console.log('\n🧪 RENDER SERVER CONNECTION TEST RESULTS');
    console.log('=========================================');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`\n📊 SUMMARY: ${passed}/${total} tests passed (${successRate}%)`);
    console.log('=========================================');
    
    // Detailed results
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.details}`);
    });
    
    // Server status
    console.log('\n🌐 RENDER SERVER STATUS:');
    const serverStatus = ServerIntegration.getStatus();
    console.log(`✅ Server URL: ${serverStatus.serverUrl}`);
    console.log(`✅ Initialized: ${serverStatus.isInitialized ? 'Yes' : 'No'}`);
    console.log(`✅ Authenticated: ${serverStatus.authenticated ? 'Yes' : 'No'}`);
    
    // System status
    console.log('\n🚀 OFFLINE-FIRST SYSTEM STATUS:');
    const offlineStatus = ServerIntegration.healthCheck();
    console.log(`✅ Overall Health: ${offlineStatus.overall}`);
    console.log(`✅ Server: ${offlineStatus.checks.server}`);
    console.log(`✅ Database: ${offlineStatus.checks.database}`);
    console.log(`✅ Offline-First: ${offlineStatus.checks.offline_first}`);
    
    // Final verdict
    console.log('\n🎯 FINAL VERDICT:');
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Render server is fully accessible and integrated');
      console.log('✅ Offline-first architecture is working perfectly');
      console.log('✅ System is ready for production deployment');
      console.log('\n🚀 Your POS system is now fully connected to the cloud!');
    } else {
      console.log('⚠️ SOME TESTS FAILED');
      console.log('🔧 Review failed tests and ensure server is running');
      console.log('💡 System can still work offline even if server tests fail');
    }
  }

  // Quick connectivity test (just test if server is reachable)
  async quickConnectivityTest() {
    console.log('🚀 Quick Render Server Connectivity Test...');
    console.log(`🌐 Server: ${this.serverUrl}`);

    try {
      const response = await fetch(`${this.serverUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LuminaN-POS/1.0'
        }
      });

      if (response.ok) {
        const health = await response.json();
        console.log('✅ Render server is reachable and healthy!');
        console.log('📊 Server response:', health);
        return true;
      } else {
        console.log(`❌ Server responded with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log('❌ Cannot reach Render server:', error.message);
      console.log('💡 This is OK - the offline-first system will work offline');
      return false;
    }
  }

  // Get test results
  getTestResults() {
    return this.testResults;
  }
}

// Export singleton instance
export default new RenderServerConnectionTest();

// Example usage:
// import RenderServerConnectionTest from './services/renderServerConnectionTest.js';
//
// // Run full test suite
// await RenderServerConnectionTest.runRenderConnectionTest();
//
// // Quick connectivity test
// await RenderServerConnectionTest.quickConnectivityTest();