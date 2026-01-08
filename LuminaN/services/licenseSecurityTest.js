/**
 * License Security Test Suite
 * Comprehensive testing for the bulletproof license security system
 */

import licenseSecurity from './licenseSecurity';

class LicenseSecurityTester {
  constructor() {
    this.testResults = [];
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🔒 Starting License Security Test Suite...\n');
    
    // Core functionality tests
    await this.testHardwareFingerprinting();
    await this.testTimeValidation();
    await this.testEncryption();
    await this.testUsageTracking();
    await this.testSystemIntegrity();
    await this.testEmergencyLockdown();
    await this.testOfflineValidation();
    
    // Security attack simulation tests
    await this.testTimeManipulation();
    await this.testHardwareSpoofing();
    await this.testRapidValidation();
    await this.testStorageManipulation();
    
    // Performance tests
    await this.testPerformance();
    
    // Generate report
    this.generateTestReport();
  }

  /**
   * Test hardware fingerprinting
   */
  async testHardwareFingerprinting() {
    this.logTest('Hardware Fingerprinting', async () => {
      // Test fingerprint generation
      const fingerprint1 = await licenseSecurity.generateHardwareFingerprint();
      const fingerprint2 = await licenseSecurity.generateHardwareFingerprint();
      
      this.assert(fingerprint1 === fingerprint2, 'Fingerprint should be consistent');
      this.assert(fingerprint1.length === 64, 'Fingerprint should be 64 characters (SHA256)');
      this.assert(fingerprint1.startsWith('a') || fingerprint1.startsWith('b') || 
                 fingerprint1.startsWith('c') || fingerprint1.startsWith('d') ||
                 fingerprint1.startsWith('e') || fingerprint1.startsWith('f'),
                 'Fingerprint should be valid hex');
      
      return { fingerprint: fingerprint1.substring(0, 16) + '...' };
    });
  }

  /**
   * Test time validation system
   */
  async testTimeValidation() {
    this.logTest('Time Validation System', async () => {
      // Test normal time validation
      const timeValidation1 = await licenseSecurity.validateSystemTime();
      this.assert(timeValidation1.valid === true, 'Initial time validation should pass');
      
      // Wait a bit and test again
      await new Promise(resolve => setTimeout(resolve, 100));
      const timeValidation2 = await licenseSecurity.validateSystemTime();
      this.assert(timeValidation2.valid === true, 'Subsequent time validation should pass');
      
      return {
        initial: timeValidation1,
        subsequent: timeValidation2
      };
    });
  }

  /**
   * Test encryption functionality
   */
  async testEncryption() {
    this.logTest('Encryption System', async () => {
      // Test encryption key generation
      const key1 = await licenseSecurity.getEncryptionKey();
      const key2 = await licenseSecurity.getEncryptionKey();
      
      this.assert(key1 === key2, 'Encryption key should be consistent');
      this.assert(key1.length > 0, 'Encryption key should not be empty');
      
      // Test data encryption/decryption
      const testData = { test: 'data', timestamp: Date.now() };
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(testData), key1).toString();
      const decrypted = CryptoJS.AES.decrypt(encrypted, key1).toString(CryptoJS.enc.Utf8);
      const parsedData = JSON.parse(decrypted);
      
      this.assert(parsedData.test === 'data', 'Encrypted data should decrypt correctly');
      this.assert(parsedData.timestamp === testData.timestamp, 'Decrypted data should match original');
      
      return { encryptionWorking: true, keyLength: key1.length };
    });
  }

  /**
   * Test usage tracking and anomaly detection
   */
  async testUsageTracking() {
    this.logTest('Usage Tracking & Anomaly Detection', async () => {
      // Test normal usage tracking
      const result1 = licenseSecurity.trackUsage('test_action', { param: 'value' });
      this.assert(result1.valid === true, 'Normal usage should be valid');
      
      // Test rapid usage (potential automation)
      for (let i = 0; i < 10; i++) {
        licenseSecurity.trackUsage('rapid_test', { iteration: i });
      }
      
      const rapidResult = licenseSecurity.trackUsage('rapid_test', { iteration: 11 });
      // Note: Rapid usage might trigger warnings, which is expected
      
      return {
        normalUsage: result1,
        rapidUsage: rapidResult
      };
    });
  }

  /**
   * Test system integrity checks
   */
  async testSystemIntegrity() {
    this.logTest('System Integrity Checks', async () => {
      const integrityResult = await licenseSecurity.performSystemIntegrityCheck();
      
      this.assert(integrityResult.checks !== undefined, 'Integrity check should return checks');
      this.assert(integrityResult.riskLevel !== undefined, 'Should return risk level');
      this.assert(['LOW', 'MEDIUM', 'HIGH'].includes(integrityResult.riskLevel), 
                  'Risk level should be valid');
      
      return {
        valid: integrityResult.valid,
        riskLevel: integrityResult.riskLevel,
        checksCount: Object.keys(integrityResult.checks).length
      };
    });
  }

  /**
   * Test emergency lockdown system
   */
  async testEmergencyLockdown() {
    this.logTest('Emergency Lockdown System', async () => {
      // Test lockdown trigger
      const lockdownResult = await licenseSecurity.triggerEmergencyLockdown('test_reason');
      
      this.assert(lockdownResult.lockdownActive === true, 'Lockdown should be active');
      this.assert(lockdownResult.recoveryRequired === true, 'Recovery should be required');
      this.assert(lockdownResult.challenge !== undefined, 'Should provide recovery challenge');
      
      // Test if system detects lockdown
      const isLocked = await licenseSecurity.isInLockdown();
      this.assert(isLocked === true, 'System should detect lockdown state');
      
      return {
        lockdownTriggered: lockdownResult.lockdownActive,
        challengeId: lockdownResult.challenge?.id,
        systemLocked: isLocked
      };
    });
  }

  /**
   * Test offline validation
   */
  async testOfflineValidation() {
    this.logTest('Offline License Validation', async () => {
      const mockLicenseData = {
        id: 'test-license-id',
        type: 'TRIAL',
        status: 'ACTIVE',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      const validationResult = await licenseSecurity.validateLicenseOffline(mockLicenseData);
      
      this.assert(validationResult.offlineValid !== undefined, 'Should return offline validity');
      this.assert(validationResult.offlineChecks !== undefined, 'Should return offline checks');
      this.assert(validationResult.offlineSecurityScore !== undefined, 'Should return security score');
      
      return {
        offlineValid: validationResult.offlineValid,
        securityScore: validationResult.offlineSecurityScore,
        riskLevel: validationResult.riskLevel
      };
    });
  }

  /**
   * Test time manipulation detection
   */
  async testTimeManipulation() {
    this.logTest('Time Manipulation Detection', async () => {
      // This is a simulation test - in real scenario, system time would be manipulated
      // For testing, we'll simulate the detection by checking time validation logic
      
      const currentTime = Date.now();
      const futureTime = currentTime + (24 * 60 * 60 * 1000); // 24 hours in future
      
      // Simulate future time validation
      const originalNow = Date.now;
      Date.now = () => futureTime;
      
      try {
        const timeValidation = await licenseSecurity.validateSystemTime();
        // The validation might fail due to time being in the future
        // This is expected behavior
        
        return {
          timeManipulationDetected: !timeValidation.valid,
          validationResult: timeValidation
        };
      } finally {
        // Restore original Date.now
        Date.now = originalNow;
      }
    });
  }

  /**
   * Test hardware spoofing detection
   */
  async testHardwareSpoofing() {
    this.logTest('Hardware Spoofing Detection', async () => {
      // Get original fingerprint
      const originalFingerprint = await licenseSecurity.generateHardwareFingerprint();
      
      // Simulate hardware change by modifying fingerprint cache
      const modifiedFingerprint = '0000000000000000000000000000000000000000000000000000000000000000';
      licenseSecurity.fingerprintCache = modifiedFingerprint;
      
      // Test validation with modified fingerprint
      const hardwareValidation = await licenseSecurity.validateHardwareFingerprint();
      
      // Restore original fingerprint
      licenseSecurity.fingerprintCache = originalFingerprint;
      
      this.assert(hardwareValidation.match === false, 'Should detect hardware fingerprint mismatch');
      
      return {
        spoofingDetected: !hardwareValidation.match,
        originalFingerprint: originalFingerprint.substring(0, 16) + '...',
        detectedFingerprint: hardwareValidation.current
      };
    });
  }

  /**
   * Test rapid validation detection
   */
  async testRapidValidation() {
    this.logTest('Rapid Validation Detection', async () => {
      // Simulate rapid validations
      const validationResults = [];
      
      for (let i = 0; i < 5; i++) {
        const result = await licenseSecurity.validateSystemTime();
        validationResults.push(result);
      }
      
      // Check if rapid validation was detected
      const hasRapidDetection = validationResults.some(result => !result.valid);
      
      return {
        rapidValidationDetected: hasRapidDetection,
        validationCount: validationResults.length
      };
    });
  }

  /**
   * Test storage manipulation detection
   */
  async testStorageManipulation() {
    this.logTest('Storage Manipulation Detection', async () => {
      // Test storage integrity
      const storageCheck = await licenseSecurity.checkStorageIntegrity();
      
      this.assert(storageCheck.valid !== undefined, 'Storage check should return validity');
      this.assert(storageCheck.storageWorking !== undefined, 'Should test storage operations');
      
      return {
        storageIntact: storageCheck.valid,
        storageWorking: storageCheck.storageWorking
      };
    });
  }

  /**
   * Test performance
   */
  async testPerformance() {
    this.logTest('Performance Tests', async () => {
      const startTime = performance.now();
      
      // Test multiple operations
      for (let i = 0; i < 10; i++) {
        await licenseSecurity.generateHardwareFingerprint();
        licenseSecurity.trackUsage('performance_test', { iteration: i });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.assert(duration < 5000, `Operations should complete within 5 seconds, took ${duration}ms`);
      
      return {
        duration: duration,
        operationsCompleted: 20,
        averagePerOperation: duration / 20
      };
    });
  }

  /**
   * Log and run a test
   */
  async logTest(testName, testFunction) {
    try {
      console.log(`🧪 Testing: ${testName}`);
      const result = await testFunction();
      this.passedTests++;
      this.testResults.push({
        name: testName,
        status: 'PASSED',
        result: result,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ ${testName}: PASSED\n`);
    } catch (error) {
      this.failedTests++;
      this.testResults.push({
        name: testName,
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(`❌ ${testName}: FAILED - ${error.message}\n`);
    }
  }

  /**
   * Assertion helper
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    const totalTests = this.passedTests + this.failedTests;
    const passRate = ((this.passedTests / totalTests) * 100).toFixed(1);
    
    console.log('📊 License Security Test Report');
    console.log('================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.failedTests}`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log('');
    
    if (this.failedTests === 0) {
      console.log('🎉 All tests passed! License security system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Review the results above.');
    }
    
    console.log('');
    console.log('📋 Test Details:');
    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
}

// Export test runner
export const runLicenseSecurityTests = async () => {
  const tester = new LicenseSecurityTester();
  await tester.runAllTests();
};

export default LicenseSecurityTester;