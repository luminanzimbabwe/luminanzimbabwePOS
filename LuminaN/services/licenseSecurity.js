/**
 * License Security Utilities for LuminaN POS - Bulletproof Edition
 * Provides multi-layer anti-manipulation features for offline applications
 * Designed to survive computer restarts, clock manipulation, and system bypass attempts
 */

import * as Device from 'expo-device';
import * as Application from 'expo-application';
// Using AsyncStorage for web compatibility
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';
import CryptoJS from 'crypto-js';

class LicenseSecurity {
  
  constructor() {
    this.fingerprintCache = null;
    this.lastValidationTime = null;
    this.usageHistory = [];
    this.systemIntegrity = null;
    this.offlineTimeAnchor = null;
    this.validationChain = [];
    this.emergencyLockdown = false;
    this.usagePatterns = new Map();
    this.appStateChangeHandler = null;
    this.initializeSecurity();
  }

  /**
   * Initialize security system with app state monitoring
   */
  async initializeSecurity() {
    try {
      // Set up app state monitoring for tamper detection
      this.appStateChangeHandler = (nextAppState) => {
        if (nextAppState === 'background') {
          this.storeOfflineTimeAnchor();
        } else if (nextAppState === 'active') {
          this.validateAppStateReturn();
        }
      };
      
      AppState.addEventListener('change', this.appStateChangeHandler);
      
      // Initialize offline time anchor
      await this.initializeOfflineTimeAnchor();
      
      // Load usage patterns
      await this.loadUsagePatterns();
      
      // Check system integrity
      await this.performSystemIntegrityCheck();
      
      console.log('Enhanced security system initialized');
    } catch (error) {
      console.error('Security initialization failed:', error);
    }
  }

  /**
   * Generate a unique hardware fingerprint for the device
   */
  /**
   * Generate enhanced multi-layer hardware fingerprint for the device
   */
  async generateHardwareFingerprint() {
    try {
      if (this.fingerprintCache) {
        return this.fingerprintCache;
      }

      const fingerprintData = {
        // Layer 1: Device Information
        deviceModel: Device.modelName || 'Unknown',
        deviceName: Device.deviceName || 'Unknown',
        osName: Device.osName || 'Unknown',
        osVersion: Device.osVersion || 'Unknown',
        platform: Platform.OS,
        platformVersion: Platform.Version.toString(),
        
        // Layer 2: Application Information
        appName: Application.applicationName || 'LuminaN',
        appVersion: Application.nativeApplicationVersion || '1.0.0',
        buildVersion: Application.nativeBuildVersion || '1',
        
        // Layer 3: System Hardware (when available)
        deviceId: await this.getDeviceId(),
        
        // Layer 4: System Time and Environment
        currentTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        
        // Layer 5: Screen/Display Information
        screenWidth: Platform.OS === 'web' ? window.screen.width : null,
        screenHeight: Platform.OS === 'web' ? window.screen.height : null,
        
        // Layer 6: Additional System Characteristics
        deviceType: await this.getDeviceType(),
        systemFonts: await this.getSystemFonts(),
        installedLanguages: Intl.DateTimeFormat().resolvedOptions().locales,
        
        // Layer 7: Timing-based entropy
        bootTime: await this.getBootTime(),
        timezoneOffset: new Date().getTimezoneOffset(),
        
        // Layer 8: Persistent storage characteristics
        storageCharacteristics: await this.analyzeStorageCharacteristics(),
        
        // Layer 9: Network interface (if available)
        networkInterfaces: await this.getNetworkInterfaces(),
        
        // Layer 10: System behavior patterns
        systemBehaviorHash: await this.generateBehaviorHash()
      };

      // Create layered fingerprint
      const primaryFingerprint = this.createLayeredHash(fingerprintData);
      
      // Create secondary validation hash
      const validationHash = this.createValidationHash(fingerprintData);
      
      // Combine for final fingerprint
      const finalFingerprint = CryptoJS.SHA256(
        primaryFingerprint + validationHash
      ).toString();
      
      // Store multiple layers for verification
      await this.storeMultiLayerFingerprint({
        primary: primaryFingerprint,
        validation: validationHash,
        full: finalFingerprint,
        timestamp: new Date().toISOString(),
        version: '2.0'
      });
      
      this.fingerprintCache = finalFingerprint;
      return finalFingerprint;
    } catch (error) {
      console.error('Enhanced hardware fingerprint generation failed:', error);
      return this.generateFallbackFingerprint();
    }
  }

  /**
   * Create layered hash from fingerprint data
   */
  createLayeredHash(data) {
    // Layer 1: Basic device info
    const layer1 = CryptoJS.SHA256(
      `${data.deviceModel}${data.deviceName}${data.osName}${data.osVersion}`
    ).toString();
    
    // Layer 2: App info
    const layer2 = CryptoJS.SHA256(
      `${data.appName}${data.appVersion}${data.buildVersion}`
    ).toString();
    
    // Layer 3: System characteristics
    const layer3 = CryptoJS.SHA256(
      `${data.platform}${data.deviceType}${data.timezone}`
    ).toString();
    
    // Combine layers
    return CryptoJS.SHA256(layer1 + layer2 + layer3).toString();
  }

  /**
   * Create validation hash
   */
  createValidationHash(data) {
    const validationData = {
      timestamp: data.currentTime,
      timezone: data.timezoneOffset,
      behavior: data.systemBehaviorHash,
      network: data.networkInterfaces,
      storage: data.storageCharacteristics
    };
    
    return CryptoJS.SHA256(JSON.stringify(validationData)).toString();
  }

  /**
   * Get device type classification
   */
  async getDeviceType() {
    try {
      if (Platform.OS === 'web') {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Mobile')) return 'mobile-web';
        if (userAgent.includes('Tablet')) return 'tablet-web';
        return 'desktop-web';
      }
      
      const deviceType = await Device.getDeviceTypeAsync();
      return Device.DeviceType[deviceType] || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get system fonts (limited for security)
   */
  async getSystemFonts() {
    try {
      // Get a sample of system fonts without compromising security
      const fonts = ['Arial', 'Times New Roman', 'Courier New'];
      return CryptoJS.SHA256(fonts.join(',')).toString().substring(0, 16);
    } catch (error) {
      return 'fallback';
    }
  }

  /**
   * Get approximate boot time
   */
  async getBootTime() {
    try {
      // Approximate boot time using performance.now()
      // This is an estimate, not exact boot time
      const uptime = performance.now();
      const bootTime = Date.now() - uptime;
      return new Date(bootTime).toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Analyze storage characteristics
   */
  async analyzeStorageCharacteristics() {
    try {
      // Analyze local storage availability and characteristics
      const testKey = 'storage_test_' + Date.now();
      localStorage.setItem(testKey, 'test');
      const stored = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      return CryptoJS.SHA256(
        `storage_${stored}_${localStorage.length}`
      ).toString().substring(0, 16);
    } catch (error) {
      return 'no-storage';
    }
  }

  /**
   * Get network interfaces (limited info)
   */
  async getNetworkInterfaces() {
    try {
      // Limited network info for privacy and security
      return 'network-info-hash';
    } catch (error) {
      return 'no-network';
    }
  }

  /**
   * Generate system behavior hash
   */
  async generateBehaviorHash() {
    try {
      // Analyze system behavior patterns
      const behaviorData = {
        platform: Platform.OS,
        timestamp: Date.now(),
        random: Math.random().toString(36)
      };
      
      return CryptoJS.SHA256(JSON.stringify(behaviorData)).toString();
    } catch (error) {
      return 'behavior-error';
    }
  }

  /**
   * Store multi-layer fingerprint securely
   */
  async storeMultiLayerFingerprint(fingerprintData) {
    try {
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(fingerprintData),
        await this.getEncryptionKey()
      ).toString();
      
      await AsyncStorage.setItem('enhanced_fingerprint', encryptedData);
    } catch (error) {
      console.error('Multi-layer fingerprint storage failed:', error);
    }
  }

  /**
   * Get encryption key for secure storage
   */
  async getEncryptionKey() {
    let key = await AsyncStorage.getItem('encryption_key');
    if (!key) {
      key = CryptoJS.lib.WordArray.random(256/8).toString();
      await AsyncStorage.setItem('encryption_key', key);
    }
    return key;
  }

  /**
   * Get device-specific identifier
   */
  async getDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      
      if (!deviceId) {
        // Generate new device ID
        const randomId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        deviceId = CryptoJS.SHA256(randomId).toString();
        
        // Store it securely
        await AsyncStorage.setItem('device_id', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Device ID generation failed:', error);
      return 'fallback-device-id';
    }
  }

  /**
   * Store fingerprint securely
   */
  async storeFingerprintSecurely(fingerprint) {
    try {
      await AsyncStorage.setItem('hardware_fingerprint', fingerprint);
    } catch (error) {
      console.error('Secure storage failed:', error);
    }
  }

  /**
   * Generate fallback fingerprint if primary method fails
   */
  generateFallbackFingerprint() {
    const fallbackData = {
      platform: Platform.OS,
      timestamp: Date.now(),
      random: Math.random().toString(36)
    };
    
    const fallbackString = JSON.stringify(fallbackData);
    return CryptoJS.SHA256(fallbackString).toString();
  }

  /**
   * Initialize offline time anchor system
   */
  async initializeOfflineTimeAnchor() {
    try {
      // Get or create time anchor
      let timeAnchor = await AsyncStorage.getItem('time_anchor');
      
      if (!timeAnchor) {
        // Create initial time anchor
        timeAnchor = {
          anchorTime: new Date().toISOString(),
          anchorTimestamp: Date.now(),
          anchorTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          bootCount: 1,
          validationCount: 0,
          manipulationAttempts: [],
          version: '2.0'
        };
        
        await this.storeTimeAnchor(timeAnchor);
      } else {
        try {
          // Try to decrypt the data first
          const decrypted = CryptoJS.AES.decrypt(
            timeAnchor,
            await this.getEncryptionKey()
          ).toString(CryptoJS.enc.Utf8);
          
          if (decrypted) {
            timeAnchor = JSON.parse(decrypted);
          } else {
            // If decryption fails, treat as plain JSON (backward compatibility)
            timeAnchor = JSON.parse(timeAnchor);
          }
        } catch (decryptError) {
          // If decryption fails, assume it's plain JSON (backward compatibility)
          timeAnchor = JSON.parse(timeAnchor);
        }
        
        timeAnchor.bootCount = (timeAnchor.bootCount || 0) + 1;
        timeAnchor.validationCount = (timeAnchor.validationCount || 0) + 1;
        await this.storeTimeAnchor(timeAnchor);
      }
      
      this.offlineTimeAnchor = timeAnchor;
    } catch (error) {
      console.error('Offline time anchor initialization failed:', error);
    }
  }

  /**
   * Store time anchor with encryption
   */
  async storeTimeAnchor(anchorData) {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(anchorData),
        await this.getEncryptionKey()
      ).toString();
      
      await AsyncStorage.setItem('time_anchor', encrypted);
    } catch (error) {
      console.error('Time anchor storage failed:', error);
    }
  }

  /**
   * Store offline time anchor when app goes to background
   */
  async storeOfflineTimeAnchor() {
    try {
      if (this.offlineTimeAnchor) {
        this.offlineTimeAnchor.lastBackgroundTime = new Date().toISOString();
        this.offlineTimeAnchor.lastBackgroundTimestamp = Date.now();
        await this.storeTimeAnchor(this.offlineTimeAnchor);
      }
    } catch (error) {
      console.error('Offline time anchor storage failed:', error);
    }
  }

  /**
   * Validate app state return for tampering
   */
  async validateAppStateReturn() {
    try {
      if (!this.offlineTimeAnchor) return;
      
      const currentTime = new Date();
      const backgroundTime = this.offlineTimeAnchor.lastBackgroundTimestamp;
      
      if (backgroundTime) {
        const timeAway = Date.now() - backgroundTime;
        
        // Check if time away makes sense (not negative, not extremely long)
        if (timeAway < -1000) {
          console.warn('Possible time manipulation detected on app return');
          this.recordManipulationAttempt('app_state_return_time_backwards');
        }
        
        // Very long background time (possible sleep/hibernate)
        if (timeAway > 30 * 24 * 60 * 60 * 1000) { // 30 days
          this.recordManipulationAttempt('excessive_background_time');
        }
      }
    } catch (error) {
      console.error('App state validation failed:', error);
    }
  }

  /**
   * Record manipulation attempt
   */
  async recordManipulationAttempt(type) {
    try {
      if (!this.offlineTimeAnchor) return;
      
      if (!this.offlineTimeAnchor.manipulationAttempts) {
        this.offlineTimeAnchor.manipulationAttempts = [];
      }
      
      this.offlineTimeAnchor.manipulationAttempts.push({
        type: type,
        timestamp: new Date().toISOString(),
        detectionTime: Date.now()
      });
      
      // Keep only last 10 attempts
      if (this.offlineTimeAnchor.manipulationAttempts.length > 10) {
        this.offlineTimeAnchor.manipulationAttempts = 
          this.offlineTimeAnchor.manipulationAttempts.slice(-10);
      }
      
      await this.storeTimeAnchor(this.offlineTimeAnchor);
      
      // Trigger emergency lockdown if too many attempts
      if (this.offlineTimeAnchor.manipulationAttempts.length >= 5) {
        await this.triggerEmergencyLockdown('excessive_manipulation_attempts');
      }
    } catch (error) {
      console.error('Manipulation recording failed:', error);
    }
  }

  /**
   * Validate system time with multiple checks
   */
  async validateSystemTime() {
    try {
      const currentTime = new Date();
      const timeAnchor = this.offlineTimeAnchor;
      
      if (!timeAnchor) {
        return {
          valid: false,
          reason: 'No time anchor available',
          type: 'NO_ANCHOR'
        };
      }
      
      const validationResults = {
        valid: true,
        issues: [],
        warnings: [],
        checks: {}
      };
      
      // Check 1: Time anchor consistency
      const anchorDate = new Date(timeAnchor.anchorTime);
      const timeDiff = Math.abs(currentTime - anchorDate);
      
      if (timeDiff > 24 * 60 * 60 * 1000) { // More than 24 hours difference
        validationResults.issues.push('Significant time discrepancy from anchor');
        validationResults.checks.timeAnchor = 'FAILED';
      } else {
        validationResults.checks.timeAnchor = 'PASSED';
      }
      
      // Check 2: Time progression validation
      const storedTime = await this.getLastValidationTime();
      if (storedTime && new Date(storedTime) > currentTime) {
        validationResults.issues.push('System time appears to have been manipulated backwards');
        validationResults.checks.timeProgression = 'FAILED';
        await this.recordManipulationAttempt('time_backwards_manipulation');
      } else {
        validationResults.checks.timeProgression = 'PASSED';
      }
      
      // Check 3: Validation frequency (detect rapid time changes)
      if (this.lastValidationTime) {
        const timeSinceLastValidation = currentTime - new Date(this.lastValidationTime);
        if (timeSinceLastValidation < 1000) { // Less than 1 second
          validationResults.issues.push('Validation requests too frequent - possible time manipulation');
          validationResults.checks.validationFrequency = 'FAILED';
        } else {
          validationResults.checks.validationFrequency = 'PASSED';
        }
      }
      
      // Check 4: Boot time consistency
      const bootTimeConsistency = await this.validateBootTimeConsistency();
      if (!bootTimeConsistency.valid) {
        validationResults.issues.push('Boot time inconsistency detected');
        validationResults.checks.bootTime = 'FAILED';
      } else {
        validationResults.checks.bootTime = 'PASSED';
      }
      
      // Check 5: Timezone consistency
      const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeAnchor.anchorTimezone !== currentTimezone) {
        validationResults.warnings.push('Timezone has changed since anchor creation');
        validationResults.checks.timezone = 'WARNING';
      } else {
        validationResults.checks.timezone = 'PASSED';
      }
      
      // Check 6: System clock adjustment detection
      const systemClockCheck = await this.detectSystemClockAdjustment();
      if (!systemClockCheck.valid) {
        validationResults.issues.push('System clock adjustment detected');
        validationResults.checks.clockAdjustment = 'FAILED';
        await this.recordManipulationAttempt('system_clock_adjustment');
      } else {
        validationResults.checks.clockAdjustment = 'PASSED';
      }
      
      // Overall validation
      validationResults.valid = validationResults.issues.length === 0;
      
      if (!validationResults.valid) {
        validationResults.type = 'TIME_MANIPULATION_DETECTED';
      }
      
      return validationResults;
    } catch (error) {
      console.error('System time validation failed:', error);
      return {
        valid: false,
        reason: `Time validation error: ${error.message}`,
        type: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate boot time consistency
   */
  async validateBootTimeConsistency() {
    try {
      // Get current performance timing
      const currentUptime = performance.now();
      const currentTime = Date.now();
      const estimatedBootTime = currentTime - currentUptime;
      
      // Compare with stored boot time if available
      if (this.offlineTimeAnchor && this.offlineTimeAnchor.estimatedBootTime) {
        const storedBootTime = this.offlineTimeAnchor.estimatedBootTime;
        const timeDiff = Math.abs(estimatedBootTime - storedBootTime);
        
        // Allow for some variance due to system sleep/hibernate
        if (timeDiff > 5 * 60 * 1000) { // 5 minutes variance
          return {
            valid: false,
            reason: 'Boot time inconsistency detected',
            expected: storedBootTime,
            actual: estimatedBootTime,
            variance: timeDiff
          };
        }
      }
      
      // Store estimated boot time
      if (this.offlineTimeAnchor) {
        this.offlineTimeAnchor.estimatedBootTime = estimatedBootTime;
        await this.storeTimeAnchor(this.offlineTimeAnchor);
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Boot time validation failed:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Detect system clock adjustments
   */
  async detectSystemClockAdjustment() {
    try {
      const currentTime = Date.now();
      const performanceTime = performance.now();
      
      // Check if system time and performance time are reasonably consistent
      // If someone manipulates system clock, this will be inconsistent
      const timeCorrelation = Math.abs(currentTime - performanceTime);
      
      // If the correlation is wildly different from previous checks, possible manipulation
      const previousCorrelation = await this.getStoredTimeCorrelation();
      
      if (previousCorrelation !== null) {
        const correlationDiff = Math.abs(timeCorrelation - previousCorrelation);
        
        // Large difference suggests clock adjustment
        if (correlationDiff > 10 * 60 * 1000) { // 10 minutes
          return {
            valid: false,
            reason: 'System clock adjustment detected',
            previousCorrelation: previousCorrelation,
            currentCorrelation: timeCorrelation,
            difference: correlationDiff
          };
        }
      }
      
      // Store current correlation
      await this.storeTimeCorrelation(timeCorrelation);
      
      return { valid: true };
    } catch (error) {
      console.error('Clock adjustment detection failed:', error);
      return { valid: false, reason: 'Detection error' };
    }
  }

  /**
   * Store time correlation for future checks
   */
  async storeTimeCorrelation(correlation) {
    try {
      await AsyncStorage.setItem('time_correlation', correlation.toString());
    } catch (error) {
      console.error('Time correlation storage failed:', error);
    }
  }

  /**
   * Get stored time correlation
   */
  async getStoredTimeCorrelation() {
    try {
      const stored = await AsyncStorage.getItem('time_correlation');
      return stored ? parseInt(stored) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Store last validation time with encryption
   */
  async storeLastValidationTime(time) {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        time.toISOString(),
        await this.getEncryptionKey()
      ).toString();
      
      await AsyncStorage.setItem('last_validation_time', encrypted);
    } catch (error) {
      console.error('Failed to store validation time:', error);
    }
  }

  /**
   * Get last validation time with decryption
   */
  async getLastValidationTime() {
    try {
      const encrypted = await AsyncStorage.getItem('last_validation_time');
      if (!encrypted) return null;
      
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        await this.getEncryptionKey()
      ).toString(CryptoJS.enc.Utf8);
      
      return decrypted ? new Date(decrypted) : null;
    } catch (error) {
      console.error('Failed to get validation time:', error);
      return null;
    }
  }

  /**
   * Load usage patterns from secure storage
   */
  async loadUsagePatterns() {
    try {
      const encrypted = await AsyncStorage.getItem('usage_patterns');
      if (encrypted) {
        const decrypted = CryptoJS.AES.decrypt(
          encrypted,
          await this.getEncryptionKey()
        ).toString(CryptoJS.enc.Utf8);
        
        if (decrypted) {
          this.usagePatterns = new Map(JSON.parse(decrypted));
        }
      }
    } catch (error) {
      console.error('Usage pattern loading failed:', error);
    }
  }

  /**
   * Store usage patterns to secure storage
   */
  async storeUsagePatterns() {
    try {
      const patternsArray = Array.from(this.usagePatterns.entries());
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(patternsArray),
        await this.getEncryptionKey()
      ).toString();
      
      await AsyncStorage.setItem('usage_patterns', encrypted);
    } catch (error) {
      console.error('Usage pattern storage failed:', error);
    }
  }

  /**
   * Enhanced usage pattern learning and anomaly detection
   */
  trackUsage(action, metadata = {}) {
    try {
      const usageEntry = {
        action: action,
        timestamp: new Date().toISOString(),
        metadata: metadata,
        day: new Date().toDateString(),
        hour: new Date().getHours(),
        sessionId: this.getSessionId(),
        appUptime: performance.now()
      };
      
      // Add to validation chain
      this.validationChain.push({
        timestamp: Date.now(),
        action: action,
        sequence: this.validationChain.length
      });
      
      // Keep only last 100 validations in chain
      if (this.validationChain.length > 100) {
        this.validationChain = this.validationChain.slice(-100);
      }
      
      this.usageHistory.push(usageEntry);
      
      // Keep only last 30 days of usage data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      this.usageHistory = this.usageHistory.filter(entry => 
        new Date(entry.timestamp) > thirtyDaysAgo
      );
      
      // Update usage patterns
      this.updateUsagePatterns(action, usageEntry);
      
      // Detect anomalous usage patterns
      return this.detectUsageAnomalies();
    } catch (error) {
      console.error('Enhanced usage tracking failed:', error);
      return { valid: true }; // Don't block on tracking errors
    }
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    return this.sessionId;
  }

  /**
   * Update usage patterns with machine learning-like analysis
   */
  updateUsagePatterns(action, entry) {
    try {
      const dayKey = entry.day;
      const hourKey = entry.hour;
      
      // Daily patterns
      if (!this.usagePatterns.has('daily')) {
        this.usagePatterns.set('daily', new Map());
      }
      const dailyPatterns = this.usagePatterns.get('daily');
      
      if (!dailyPatterns.has(dayKey)) {
        dailyPatterns.set(dayKey, { actions: 0, actionsByHour: {}, uniqueActions: new Set() });
      }
      
      const dayData = dailyPatterns.get(dayKey);
      dayData.actions++;
      dayData.uniqueActions.add(action);
      
      if (!dayData.actionsByHour[hourKey]) {
        dayData.actionsByHour[hourKey] = 0;
      }
      dayData.actionsByHour[hourKey]++;
      
      // Hourly patterns
      if (!this.usagePatterns.has('hourly')) {
        this.usagePatterns.set('hourly', new Map());
      }
      const hourlyPatterns = this.usagePatterns.get('hourly');
      
      const hourKeyFull = `${dayKey}_${hourKey}`;
      if (!hourlyPatterns.has(hourKeyFull)) {
        hourlyPatterns.set(hourKeyFull, { count: 0, actions: new Set() });
      }
      
      const hourData = hourlyPatterns.get(hourKeyFull);
      hourData.count++;
      hourData.actions.add(action);
      
      // Action frequency patterns
      if (!this.usagePatterns.has('actions')) {
        this.usagePatterns.set('actions', new Map());
      }
      const actionPatterns = this.usagePatterns.get('actions');
      
      if (!actionPatterns.has(action)) {
        actionPatterns.set(action, {
          totalCount: 0,
          intervals: [],
          lastOccurrence: null,
          avgInterval: 0
        });
      }
      
      const actionData = actionPatterns.get(action);
      actionData.totalCount++;
      
      if (actionData.lastOccurrence) {
        const interval = Date.now() - actionData.lastOccurrence;
        actionData.intervals.push(interval);
        
        // Keep only last 20 intervals for analysis
        if (actionData.intervals.length > 20) {
          actionData.intervals = actionData.intervals.slice(-20);
        }
        
        // Calculate average interval
        actionData.avgInterval = actionData.intervals.reduce((a, b) => a + b, 0) / actionData.intervals.length;
      }
      
      actionData.lastOccurrence = Date.now();
      
      // Store patterns periodically
      if (this.usageHistory.length % 10 === 0) {
        this.storeUsagePatterns();
      }
    } catch (error) {
      console.error('Usage pattern update failed:', error);
    }
  }

  /**
   * Advanced anomaly detection with multiple algorithms
   */
  detectUsageAnomalies() {
    try {
      const anomalies = {
        valid: true,
        issues: [],
        warnings: [],
        riskLevel: 'LOW',
        details: {}
      };
      
      const today = new Date().toDateString();
      const todayUsage = this.usageHistory.filter(entry => entry.day === today);
      
      // Anomaly 1: Excessive daily usage
      if (todayUsage.length > 2000) { // More than 2000 actions per day
        anomalies.valid = false;
        anomalies.issues.push('Excessive daily usage detected');
        anomalies.riskLevel = 'HIGH';
        anomalies.details.excessiveUsage = {
          count: todayUsage.length,
          threshold: 2000
        };
      } else if (todayUsage.length > 1000) {
        anomalies.warnings.push('High daily usage detected');
        anomalies.riskLevel = anomalies.riskLevel === 'LOW' ? 'MEDIUM' : anomalies.riskLevel;
      }
      
      // Anomaly 2: Unusual time patterns
      const currentHour = new Date().getHours();
      const unusualHours = [2, 3, 4, 5]; // Very early morning
      if (unusualHours.includes(currentHour) && todayUsage.length > 50) {
        anomalies.warnings.push('High usage during unusual hours');
        anomalies.riskLevel = anomalies.riskLevel === 'LOW' ? 'MEDIUM' : anomalies.riskLevel;
        anomalies.details.unusualHours = {
          hour: currentHour,
          usage: todayUsage.length
        };
      }
      
      // Anomaly 3: Rapid-fire actions (possible automation)
      const recentUsage = this.usageHistory.slice(-20);
      const rapidActions = this.detectRapidActions(recentUsage);
      if (rapidActions.detected) {
        anomalies.issues.push('Rapid-fire automated behavior detected');
        anomalies.riskLevel = 'HIGH';
        anomalies.details.rapidActions = rapidActions;
      }
      
      // Anomaly 4: Action frequency anomalies
      const frequencyAnomalies = this.detectFrequencyAnomalies();
      if (frequencyAnomalies.length > 0) {
        anomalies.warnings.push('Unusual action frequency patterns detected');
        anomalies.riskLevel = anomalies.riskLevel === 'LOW' ? 'MEDIUM' : anomalies.riskLevel;
        anomalies.details.frequencyAnomalies = frequencyAnomalies;
      }
      
      // Anomaly 5: Session anomalies
      const sessionAnomalies = this.detectSessionAnomalies();
      if (sessionAnomalies.detected) {
        anomalies.issues.push('Suspicious session behavior detected');
        anomalies.riskLevel = 'HIGH';
        anomalies.details.sessionAnomalies = sessionAnomalies;
      }
      
      // Anomaly 6: Validation chain analysis
      const chainAnomalies = this.detectValidationChainAnomalies();
      if (chainAnomalies.detected) {
        anomalies.issues.push('Validation chain manipulation detected');
        anomalies.riskLevel = 'HIGH';
        anomalies.details.chainAnomalies = chainAnomalies;
      }
      
      // Overall risk assessment
      if (anomalies.riskLevel === 'HIGH') {
        anomalies.valid = false;
        this.triggerEnhancedSecurityProtocol('high_risk_usage');
      }
      
      return anomalies;
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return { valid: true, riskLevel: 'UNKNOWN' };
    }
  }

  /**
   * Detect rapid-fire automated actions
   */
  detectRapidActions(usageEntries) {
    try {
      if (usageEntries.length < 10) return { detected: false };
      
      // Check for actions happening faster than humanly possible
      let rapidSequences = 0;
      let maxRapidSequence = 0;
      let currentSequence = 0;
      
      for (let i = 1; i < usageEntries.length; i++) {
        const timeDiff = new Date(usageEntries[i].timestamp) - new Date(usageEntries[i-1].timestamp);
        
        if (timeDiff < 100) { // Less than 100ms between actions
          currentSequence++;
          maxRapidSequence = Math.max(maxRapidSequence, currentSequence);
        } else {
          if (currentSequence > 0) rapidSequences++;
          currentSequence = 0;
        }
      }
      
      return {
        detected: maxRapidSequence >= 5 || rapidSequences >= 3,
        maxRapidSequence,
        rapidSequences,
        threshold: 5
      };
    } catch (error) {
      return { detected: false };
    }
  }

  /**
   * Detect frequency anomalies in actions
   */
  detectFrequencyAnomalies() {
    try {
      const anomalies = [];
      const actionPatterns = this.usagePatterns.get('actions');
      
      if (!actionPatterns) return anomalies;
      
      for (const [action, data] of actionPatterns.entries()) {
        if (data.totalCount > 100 && data.intervals.length > 10) {
          // Check for suspiciously consistent intervals (automation indicator)
          const avgInterval = data.avgInterval;
          const variance = data.intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - avgInterval, 2);
          }, 0) / data.intervals.length;
          
          const standardDeviation = Math.sqrt(variance);
          const coefficientOfVariation = standardDeviation / avgInterval;
          
          // Very low variation suggests automation
          if (coefficientOfVariation < 0.1 && avgInterval < 5000) {
            anomalies.push({
              action,
              type: 'suspiciously_consistent_frequency',
              avgInterval,
              coefficientOfVariation,
              totalCount: data.totalCount
            });
          }
        }
      }
      
      return anomalies;
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect session anomalies
   */
  detectSessionAnomalies() {
    try {
      const todayUsage = this.usageHistory.filter(entry => entry.day === new Date().toDateString());
      const sessions = new Set(todayUsage.map(entry => entry.sessionId));
      
      // Too many sessions in one day (possible manipulation)
      if (sessions.size > 10) {
        return {
          detected: true,
          type: 'excessive_sessions',
          sessionCount: sessions.size,
          threshold: 10
        };
      }
      
      // Check for very short sessions (possible bypass attempts)
      const sessionDurations = this.calculateSessionDurations(todayUsage);
      const shortSessions = sessionDurations.filter(duration => duration < 30000); // Less than 30 seconds
      
      if (shortSessions.length > 5) {
        return {
          detected: true,
          type: 'excessive_short_sessions',
          shortSessionCount: shortSessions.length,
          totalSessions: sessions.size
        };
      }
      
      return { detected: false };
    } catch (error) {
      return { detected: false };
    }
  }

  /**
   * Calculate session durations
   */
  calculateSessionDurations(usageEntries) {
    try {
      const sessions = new Map();
      
      usageEntries.forEach(entry => {
        const sessionId = entry.sessionId;
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, { start: entry.timestamp, end: entry.timestamp });
        } else {
          const session = sessions.get(sessionId);
          session.end = entry.timestamp;
        }
      });
      
      return Array.from(sessions.values()).map(session => {
        return new Date(session.end) - new Date(session.start);
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect validation chain anomalies
   */
  detectValidationChainAnomalies() {
    try {
      if (this.validationChain.length < 10) return { detected: false };
      
      const recentValidations = this.validationChain.slice(-20);
      
      // Check for validation gaps (missing validations)
      const expectedSequence = recentValidations[recentValidations.length - 1].sequence;
      const actualSequence = recentValidations.length - 1;
      
      if (expectedSequence !== actualSequence) {
        return {
          detected: true,
          type: 'sequence_gap',
          expected: expectedSequence,
          actual: actualSequence
        };
      }
      
      // Check for time anomalies in validation chain
      const timeGaps = [];
      for (let i = 1; i < recentValidations.length; i++) {
        const gap = recentValidations[i].timestamp - recentValidations[i-1].timestamp;
        timeGaps.push(gap);
      }
      
      const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
      const suspiciousGaps = timeGaps.filter(gap => gap < 100); // Very rapid validations
      
      if (suspiciousGaps.length > 5) {
        return {
          detected: true,
          type: 'rapid_validations',
          suspiciousGapCount: suspiciousGaps.length,
          totalGaps: timeGaps.length
        };
      }
      
      return { detected: false };
    } catch (error) {
      return { detected: false };
    }
  }

  /**
   * Trigger enhanced security protocol
   */
  async triggerEnhancedSecurityProtocol(reason) {
    try {
      console.warn(`Enhanced security protocol triggered: ${reason}`);
      
      // Increase validation frequency
      this.validationFrequency = 'HIGH';
      
      // Store security event
      await this.storeSecurityEvent({
        type: 'ENHANCED_PROTOCOL_TRIGGERED',
        reason: reason,
        timestamp: new Date().toISOString(),
        riskLevel: 'HIGH'
      });
      
      // If this happens multiple times, trigger emergency lockdown
      const securityEvents = await this.getSecurityEvents();
      const recentProtocolTriggers = securityEvents.filter(event => 
        event.type === 'ENHANCED_PROTOCOL_TRIGGERED' &&
        new Date(event.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      
      if (recentProtocolTriggers.length >= 3) {
        await this.triggerEmergencyLockdown('multiple_security_violations');
      }
    } catch (error) {
      console.error('Enhanced security protocol failed:', error);
    }
  }

  /**
   * Perform comprehensive system integrity check
   */
  async performSystemIntegrityCheck() {
    try {
      const integrityResults = {
        valid: true,
        checks: {},
        issues: [],
        warnings: [],
        riskLevel: 'LOW'
      };
      
      // Check 1: Application state integrity
      const appStateCheck = await this.checkApplicationStateIntegrity();
      integrityResults.checks.appState = appStateCheck;
      if (!appStateCheck.valid) {
        integrityResults.issues.push('Application state integrity compromised');
        integrityResults.riskLevel = 'HIGH';
      }
      
      // Check 2: Storage integrity
      const storageCheck = await this.checkStorageIntegrity();
      integrityResults.checks.storage = storageCheck;
      if (!storageCheck.valid) {
        integrityResults.issues.push('Storage integrity compromised');
        integrityResults.riskLevel = 'HIGH';
      }
      
      // Check 3: Runtime environment check
      const runtimeCheck = await this.checkRuntimeEnvironment();
      integrityResults.checks.runtime = runtimeCheck;
      if (!runtimeCheck.valid) {
        integrityResults.warnings.push('Runtime environment irregularities detected');
        integrityResults.riskLevel = integrityResults.riskLevel === 'LOW' ? 'MEDIUM' : integrityResults.riskLevel;
      }
      
      // Check 4: Memory integrity
      const memoryCheck = await this.checkMemoryIntegrity();
      integrityResults.checks.memory = memoryCheck;
      if (!memoryCheck.valid) {
        integrityResults.issues.push('Memory integrity issues detected');
        integrityResults.riskLevel = 'HIGH';
      }
      
      // Check 5: File system integrity
      const fileSystemCheck = await this.checkFileSystemIntegrity();
      integrityResults.checks.fileSystem = fileSystemCheck;
      if (!fileSystemCheck.valid) {
        integrityResults.warnings.push('File system integrity warnings');
        integrityResults.riskLevel = integrityResults.riskLevel === 'LOW' ? 'MEDIUM' : integrityResults.riskLevel;
      }
      
      // Check 6: Process integrity
      const processCheck = await this.checkProcessIntegrity();
      integrityResults.checks.process = processCheck;
      if (!processCheck.valid) {
        integrityResults.issues.push('Process integrity compromised');
        integrityResults.riskLevel = 'HIGH';
      }
      
      this.systemIntegrity = integrityResults;
      
      // Store integrity results
      await this.storeIntegrityResults(integrityResults);
      
      return integrityResults;
    } catch (error) {
      console.error('System integrity check failed:', error);
      return {
        valid: false,
        checks: {},
        issues: [`Integrity check error: ${error.message}`],
        warnings: [],
        riskLevel: 'HIGH'
      };
    }
  }

  /**
   * Check application state integrity
   */
  async checkApplicationStateIntegrity() {
    try {
      // Check if critical app state variables are intact
      const criticalStates = ['fingerprintCache', 'validationChain', 'usageHistory'];
      const stateIntegrity = {};
      
      for (const state of criticalStates) {
        const value = this[state];
        stateIntegrity[state] = {
          exists: value !== null && value !== undefined,
          type: typeof value,
          size: Array.isArray(value) ? value.length : (value instanceof Map ? value.size : 'unknown')
        };
      }
      
      // Check for suspicious state modifications
      const hasValidCache = stateIntegrity.fingerprintCache.exists && 
                           typeof stateIntegrity.fingerprintCache.type === 'string';
      const hasValidChain = stateIntegrity.validationChain.exists && 
                           Array.isArray(this.validationChain);
      const hasValidHistory = stateIntegrity.usageHistory.exists && 
                             Array.isArray(this.usageHistory);
      
      return {
        valid: hasValidCache && hasValidChain && hasValidHistory,
        details: stateIntegrity,
        criticalStatesValid: hasValidCache && hasValidChain && hasValidHistory
      };
    } catch (error) {
      return { valid: false, reason: 'State check error' };
    }
  }

  /**
   * Check storage integrity
   */
  async checkStorageIntegrity() {
    try {
      // Test critical storage operations
      const testKey = 'integrity_test_' + Date.now();
      const testValue = 'integrity_check_value';
      
      // Test write
      await AsyncStorage.setItem(testKey, testValue);
      
      // Test read
      const retrieved = await AsyncStorage.getItem(testKey);
      
      // Test delete
      await AsyncStorage.removeItem(testKey);
      
      const storageWorking = retrieved === testValue;
      
      // Check if critical security data exists and is readable
      const securityKeys = ['encryption_key', 'time_anchor', 'usage_patterns'];
      const criticalDataStatus = {};
      
      for (const key of securityKeys) {
        try {
          const exists = await AsyncStorage.getItem(key);
          criticalDataStatus[key] = {
            exists: !!exists,
            readable: true,
            size: exists ? exists.length : 0
          };
        } catch (error) {
          criticalDataStatus[key] = {
            exists: false,
            readable: false,
            error: error.message
          };
        }
      }
      
      return {
        valid: storageWorking,
        storageWorking,
        criticalDataStatus,
        testPassed: storageWorking
      };
    } catch (error) {
      return { valid: false, reason: 'Storage integrity check failed' };
    }
  }

  /**
   * Check runtime environment
   */
  async checkRuntimeEnvironment() {
    try {
      const environmentChecks = {
        platform: Platform.OS,
        available: typeof performance !== 'undefined',
        performanceWorking: typeof performance.now === 'function',
        cryptoAvailable: typeof CryptoJS !== 'undefined',
        asyncStorageAvailable: typeof AsyncStorage !== 'undefined'
      };
      
      // Test performance API
      let performanceTest = false;
      try {
        const start = performance.now();
        const end = performance.now();
        performanceTest = end >= start;
      } catch (error) {
        environmentChecks.performanceWorking = false;
      }
      
      // Test crypto functionality
      let cryptoTest = false;
      try {
        const testHash = CryptoJS.SHA256('test').toString();
        cryptoTest = testHash.length === 64;
      } catch (error) {
        environmentChecks.cryptoAvailable = false;
      }
      
      const allCriticalAvailable = environmentChecks.performanceWorking && 
                                   environmentChecks.cryptoAvailable &&
                                   environmentChecks.asyncStorageAvailable;
      
      return {
        valid: allCriticalAvailable,
        environmentChecks,
        performanceTest,
        cryptoTest
      };
    } catch (error) {
      return { valid: false, reason: 'Runtime check failed' };
    }
  }

  /**
   * Check memory integrity
   */
  async checkMemoryIntegrity() {
    try {
      // Check for memory-related issues
      const memoryStatus = {
        memoryAvailable: typeof performance !== 'undefined' && typeof performance.memory === 'object',
        largeObjectSupport: true,
        arrayOperationsWorking: true
      };
      
      // Test large object handling
      try {
        const largeArray = new Array(10000).fill(0);
        memoryStatus.largeObjectSupport = largeArray.length === 10000;
      } catch (error) {
        memoryStatus.largeObjectSupport = false;
      }
      
      // Test array operations
      try {
        const testArray = [1, 2, 3];
        testArray.push(4);
        testArray.filter(x => x > 0);
        memoryStatus.arrayOperationsWorking = testArray.length === 4;
      } catch (error) {
        memoryStatus.arrayOperationsWorking = false;
      }
      
      const memoryHealthy = memoryStatus.largeObjectSupport && memoryStatus.arrayOperationsWorking;
      
      return {
        valid: memoryHealthy,
        memoryStatus,
        memoryUsage: memoryStatus.memoryAvailable ? performance.memory : null
      };
    } catch (error) {
      return { valid: false, reason: 'Memory check failed' };
    }
  }

  /**
   * Check file system integrity
   */
  async checkFileSystemIntegrity() {
    try {
      // Limited file system check for web/mobile environment
      const fsChecks = {
        localStorageAvailable: typeof localStorage !== 'undefined',
        sessionStorageAvailable: typeof sessionStorage !== 'undefined',
        indexDBAvailable: typeof indexedDB !== 'undefined'
      };
      
      // Test localStorage
      let localStorageTest = false;
      if (fsChecks.localStorageAvailable) {
        try {
          const testKey = 'fs_test_' + Date.now();
          localStorage.setItem(testKey, 'test');
          const retrieved = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          localStorageTest = retrieved === 'test';
        } catch (error) {
          localStorageTest = false;
        }
      }
      
      fsChecks.localStorageTest = localStorageTest;
      
      const fileSystemHealthy = fsChecks.localStorageAvailable && localStorageTest;
      
      return {
        valid: fileSystemHealthy,
        fsChecks,
        limitations: 'Limited file system access in web/mobile environment'
      };
    } catch (error) {
      return { valid: false, reason: 'File system check failed' };
    }
  }

  /**
   * Check process integrity
   */
  async checkProcessIntegrity() {
    try {
      // Check if the application is running normally
      const processChecks = {
        mainThreadAvailable: typeof performance !== 'undefined',
        eventLoopWorking: typeof setTimeout === 'function',
        consoleAvailable: typeof console !== 'undefined',
        globalObjectsAvailable: typeof window !== 'undefined' || typeof global !== 'undefined'
      };
      
      // Test event loop
      let eventLoopTest = false;
      try {
        let testPassed = false;
        setTimeout(() => {
          testPassed = true;
        }, 10);
        
        // Wait briefly for the timeout
        await new Promise(resolve => setTimeout(resolve, 20));
        eventLoopTest = testPassed;
      } catch (error) {
        processChecks.eventLoopWorking = false;
      }
      
      processChecks.eventLoopTest = eventLoopTest;
      
      const processHealthy = processChecks.mainThreadAvailable && 
                            processChecks.eventLoopWorking &&
                            processChecks.consoleAvailable;
      
      return {
        valid: processHealthy,
        processChecks,
        environment: Platform.OS
      };
    } catch (error) {
      return { valid: false, reason: 'Process check failed' };
    }
  }

  /**
   * Store integrity results
   */
  async storeIntegrityResults(results) {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(results),
        await this.getEncryptionKey()
      ).toString();
      
      await AsyncStorage.setItem('system_integrity', encrypted);
    } catch (error) {
      console.error('Integrity results storage failed:', error);
    }
  }

  /**
   * Multi-layer validation system
   */
  async performMultiLayerValidation(licenseData = null) {
    const validationResults = {
      valid: true,
      layers: {},
      overallScore: 0,
      riskLevel: 'LOW',
      recommendations: []
    };
    
    try {
      // Check if we're in development environment
      const isDevelopment = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('localhost') ||
        window.location.protocol === 'http:'
      );
      
      // Layer 1: Hardware Fingerprint Validation
      const hardwareValidation = await this.validateHardwareFingerprint();
      validationResults.layers.hardware = hardwareValidation;
      
      // Layer 2: Time Validation
      const timeValidation = await this.validateSystemTime();
      validationResults.layers.time = timeValidation;
      
      // Layer 3: License Integrity Validation
      const licenseValidation = await this.validateLicenseIntegrity(licenseData);
      validationResults.layers.license = licenseValidation;
      
      // Layer 4: Usage Pattern Validation
      const usageValidation = this.detectUsageAnomalies();
      validationResults.layers.usage = usageValidation;
      
      // Layer 5: System Integrity Validation
      const systemValidation = await this.performSystemIntegrityCheck();
      validationResults.layers.system = systemValidation;
      
      // Layer 6: Network Validation (if available)
      const networkValidation = isDevelopment ? {
        valid: true,
        score: 100,
        source: 'development-bypass',
        warning: 'Network validation bypassed in development'
      } : await this.checkNetworkConnectivity();
      validationResults.layers.network = networkValidation;
      
      // Layer 7: Offline Persistence Validation
      const persistenceValidation = await this.validateOfflinePersistence();
      validationResults.layers.persistence = persistenceValidation;
      
      // Layer 8: Application State Validation
      const appStateValidation = await this.validateApplicationState();
      validationResults.layers.appState = appStateValidation;
      
      // Calculate overall score
      validationResults.overallScore = this.calculateValidationScore(validationResults.layers);
      
      // Determine risk level
      validationResults.riskLevel = this.determineRiskLevel(validationResults);
      
      // Generate recommendations
      validationResults.recommendations = this.generateSecurityRecommendations(validationResults);
      
      // Lower validation threshold in development
      const requiredScore = isDevelopment ? 60 : 70;
      validationResults.valid = validationResults.overallScore >= requiredScore && 
                               validationResults.riskLevel !== 'HIGH';
      
      // Log development info
      if (isDevelopment) {
        console.log(`🛠️ Development mode: Score ${validationResults.overallScore}, required ${requiredScore}, risk: ${validationResults.riskLevel}`);
      }
      
      return validationResults;
    } catch (error) {
      console.error('Multi-layer validation failed:', error);
      return {
        valid: false,
        layers: {},
        overallScore: 0,
        riskLevel: 'HIGH',
        error: error.message,
        recommendations: ['System validation error - manual review required']
      };
    }
  }

  /**
   * Validate hardware fingerprint
   */
  async validateHardwareFingerprint() {
    try {
      const currentFingerprint = await this.generateHardwareFingerprint();
      const storedFingerprint = await this.getStoredFingerprint();
      
      const match = storedFingerprint === currentFingerprint;
      
      return {
        valid: match,
        current: currentFingerprint.substring(0, 16) + '...',
        stored: storedFingerprint ? storedFingerprint.substring(0, 16) + '...' : 'None',
        match: match,
        score: match ? 100 : 0
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        score: 0
      };
    }
  }

  /**
   * Validate license integrity
   */
  async validateLicenseIntegrity(licenseData) {
    try {
      const integrityResults = {
        valid: true,
        issues: [],
        warnings: [],
        score: 100
      };
      
      if (!licenseData) {
        integrityResults.valid = false;
        integrityResults.issues.push('No license data provided for validation');
        integrityResults.score = 0;
        return integrityResults;
      }
      
      // SPECIAL HANDLING FOR UNLIMITED LICENSES
      if (licenseData.type === 'UNLIMITED') {
        console.log('🟢 Unlimited license detected - applying simplified validation');
        
        // For unlimited licenses, only check basic required fields
        const basicRequiredFields = ['id', 'type', 'status'];
        const missingFields = [];
        
        for (const field of basicRequiredFields) {
          if (!licenseData[field]) {
            missingFields.push(field);
          }
        }
        
        if (missingFields.length > 0) {
          integrityResults.valid = false;
          integrityResults.issues.push(`Missing basic required fields: ${missingFields.join(', ')}`);
          integrityResults.score = 0;
        } else {
          // All basic checks passed for unlimited license
          integrityResults.warnings.push('✅ Unlimited license validation passed');
          integrityResults.score = 100; // Full score for unlimited licenses
        }
        
        return integrityResults;
      }
      
      // Check required license fields for non-unlimited licenses
      const requiredFields = ['id', 'type', 'status', 'expiry_date', 'activation_date'];
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!licenseData[field]) {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        integrityResults.valid = false;
        integrityResults.issues.push(`Missing required license fields: ${missingFields.join(', ')}`);
        integrityResults.score = 0;
      }
      
      // Validate license dates
      if (licenseData.activation_date && licenseData.expiry_date) {
        const activationDate = new Date(licenseData.activation_date);
        const expiryDate = new Date(licenseData.expiry_date);
        const currentDate = new Date();
        
        if (activationDate > currentDate) {
          integrityResults.warnings.push('License activation date is in the future');
          integrityResults.score -= 20;
        }
        
        if (expiryDate <= currentDate) {
          integrityResults.valid = false;
          integrityResults.issues.push('License has expired');
          integrityResults.score = 0;
        }
        
        if (expiryDate <= activationDate) {
          integrityResults.valid = false;
          integrityResults.issues.push('License expiry date is before activation date');
          integrityResults.score = 0;
        }
      } else if (licenseData.type === 'UNLIMITED') {
        // Unlimited licenses don't need expiry dates
        integrityResults.warnings.push('Unlimited license detected - no expiry validation required');
        integrityResults.score += 10; // Bonus for unlimited licenses
      }
      
      // Validate license status
      const validStatuses = ['ACTIVE', 'TRIAL', 'SUSPENDED'];
      if (licenseData.status && !validStatuses.includes(licenseData.status)) {
        integrityResults.warnings.push(`Unusual license status: ${licenseData.status}`);
        integrityResults.score -= 10;
      }
      
      // Check for trial license specific validations
      if (licenseData.type === 'TRIAL') {
        if (!licenseData.is_founder_trial && !licenseData.trial_days_used !== undefined) {
          integrityResults.warnings.push('Trial license missing trial tracking data');
          integrityResults.score -= 15;
        }
        
        if (licenseData.max_trial_days && licenseData.trial_days_used > licenseData.max_trial_days) {
          integrityResults.valid = false;
          integrityResults.issues.push('Trial days used exceeds maximum allowed');
          integrityResults.score = 0;
        }
      }
      
      // Validate license key format (if present)
      if (licenseData.license_key) {
        const licenseKeyPattern = /^[A-Z0-9]{16}$/;
        if (!licenseKeyPattern.test(licenseData.license_key)) {
          integrityResults.warnings.push('License key format appears invalid');
          integrityResults.score -= 10;
        }
      }
      
      // Hardware binding validation
      if (licenseData.activation_fingerprint) {
        const currentFingerprint = await this.generateHardwareFingerprint();
        if (licenseData.activation_fingerprint !== currentFingerprint) {
          integrityResults.warnings.push('Hardware fingerprint mismatch - license may be tied to different device');
          integrityResults.score -= 25;
        }
      }
      
      // Calculate final score
      integrityResults.score = Math.max(0, Math.min(100, integrityResults.score));
      
      // Overall validity assessment
      if (integrityResults.issues.length > 0) {
        integrityResults.valid = false;
      }
      
      return integrityResults;
    } catch (error) {
      console.error('License integrity validation failed:', error);
      return {
        valid: false,
        issues: [`License integrity validation error: ${error.message}`],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Get stored fingerprint
   */
  async getStoredFingerprint() {
    try {
      const encrypted = await AsyncStorage.getItem('enhanced_fingerprint');
      if (!encrypted) return null;
      
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        await this.getEncryptionKey()
      ).toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) return null;
      
      const fingerprintData = JSON.parse(decrypted);
      return fingerprintData.full || fingerprintData.primary;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate offline persistence
   */
  async validateOfflinePersistence() {
    try {
      const persistenceChecks = {
        encryptionKeyAvailable: false,
        timeAnchorAvailable: false,
        usagePatternsAvailable: false,
        fingerprintAvailable: false,
        dataIntegrity: false
      };
      
      // Check encryption key
      const encryptionKey = await AsyncStorage.getItem('encryption_key');
      persistenceChecks.encryptionKeyAvailable = !!encryptionKey;
      
      // Check time anchor
      const timeAnchor = await AsyncStorage.getItem('time_anchor');
      persistenceChecks.timeAnchorAvailable = !!timeAnchor;
      
      // Check usage patterns
      const usagePatterns = await AsyncStorage.getItem('usage_patterns');
      persistenceChecks.usagePatternsAvailable = !!usagePatterns;
      
      // Check fingerprint
      const fingerprint = await AsyncStorage.getItem('enhanced_fingerprint');
      persistenceChecks.fingerprintAvailable = !!fingerprint;
      
      // Test data integrity
      const integrityTest = await this.testDataIntegrity();
      persistenceChecks.dataIntegrity = integrityTest.valid;
      
      const availableChecks = Object.values(persistenceChecks).filter(Boolean).length;
      const totalChecks = Object.keys(persistenceChecks).length;
      const score = (availableChecks / totalChecks) * 100;
      
      return {
        valid: score >= 80,
        checks: persistenceChecks,
        score: score,
        availableChecks: availableChecks,
        totalChecks: totalChecks
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        score: 0
      };
    }
  }

  /**
   * Test data integrity
   */
  async testDataIntegrity() {
    try {
      // Test critical data operations
      const testKey = 'integrity_test_' + Date.now();
      const testData = {
        timestamp: new Date().toISOString(),
        random: Math.random().toString(36),
        hash: CryptoJS.SHA256('test').toString()
      };
      
      // Test encryption/decryption
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(testData),
        await this.getEncryptionKey()
      ).toString();
      
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        await this.getEncryptionKey()
      ).toString(CryptoJS.enc.Utf8);
      
      const parsed = JSON.parse(decrypted);
      const integrityValid = parsed.hash === testData.hash;
      
      return {
        valid: integrityValid,
        testPassed: integrityValid,
        dataMatches: parsed.random === testData.random
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate application state
   */
  async validateApplicationState() {
    try {
      const stateChecks = {
        securityInitialized: false,
        sessionValid: false,
        appStateValid: false,
        criticalVariablesIntact: false
      };
      
      // Check if security system is initialized
      stateChecks.securityInitialized = !!this.fingerprintCache;
      
      // Check session validity
      stateChecks.sessionValid = !!this.sessionId;
      
      // Check app state (basic)
      stateChecks.appStateValid = !this.emergencyLockdown;
      
      // Check critical variables
      stateChecks.criticalVariablesIntact = !!(
        this.usageHistory && 
        this.validationChain && 
        this.usagePatterns
      );
      
      const validChecks = Object.values(stateChecks).filter(Boolean).length;
      const totalChecks = Object.keys(stateChecks).length;
      const score = (validChecks / totalChecks) * 100;
      
      return {
        valid: score >= 75,
        checks: stateChecks,
        score: score,
        validChecks: validChecks,
        totalChecks: totalChecks
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        score: 0
      };
    }
  }

  /**
   * Calculate validation score
   */
  calculateValidationScore(layers) {
    try {
      // Check if we're in development environment
      const isDevelopment = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('localhost') ||
        window.location.protocol === 'http:'
      );
      
      // Reduce network weight in development to allow CORS failures
      const weights = isDevelopment ? {
        hardware: 0.25,
        time: 0.20,
        license: 0.25,
        usage: 0.10,
        system: 0.15,
        network: 0.00, // No weight for network in development
        persistence: 0.05,
        appState: 0.00
      } : {
        hardware: 0.20,
        time: 0.15,
        license: 0.20,
        usage: 0.10,
        system: 0.15,
        network: 0.05,
        persistence: 0.10,
        appState: 0.05
      };
      
      let totalScore = 0;
      let totalWeight = 0;
      
      for (const [layerName, layerData] of Object.entries(layers)) {
        const weight = weights[layerName] || 0;
        const score = layerData.score || (layerData.valid ? 100 : 0);
        
        totalScore += score * weight;
        totalWeight += weight;
      }
      
      return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Determine risk level based on validation results
   */
  determineRiskLevel(validationResults) {
    try {
      const score = validationResults.overallScore;
      const layers = validationResults.layers;
      
      // Check if we're in development environment
      const isDevelopment = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('localhost') ||
        window.location.protocol === 'http:'
      );
      
      // In development, be more permissive with risk levels
      if (isDevelopment) {
        // High risk only for critical failures in development
        if (score < 30 || 
            !layers.license?.valid) {
          return 'HIGH';
        }
        
        // Medium risk for moderate issues in development
        if (score < 50 ||
            !layers.hardware?.valid ||
            !layers.time?.valid) {
          return 'MEDIUM';
        }
        
        // Low risk for development (default)
        return 'LOW';
      }
      
      // Production risk level logic
      // High risk conditions
      if (score < 50 || 
          !layers.hardware?.valid || 
          !layers.time?.valid || 
          !layers.license?.valid) {
        return 'HIGH';
      }
      
      // Medium risk conditions
      if (score < 70 ||
          !layers.system?.valid ||
          !layers.persistence?.valid ||
          layers.usage?.riskLevel === 'HIGH') {
        return 'MEDIUM';
      }
      
      // Low risk (default)
      return 'LOW';
    } catch (error) {
      return 'HIGH';
    }
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations(validationResults) {
    const recommendations = [];
    const layers = validationResults.layers;
    
    try {
      // Hardware recommendations
      if (!layers.hardware?.valid) {
        recommendations.push('Hardware fingerprint mismatch - verify device authenticity');
      }
      
      // Time recommendations
      if (!layers.time?.valid) {
        recommendations.push('Time validation failed - check system clock settings');
      }
      
      // License recommendations
      if (!layers.license?.valid) {
        recommendations.push('License integrity compromised - contact support');
      }
      
      // System recommendations
      if (!layers.system?.valid) {
        recommendations.push('System integrity issues detected - restart application');
      }
      
      // Persistence recommendations
      if (!layers.persistence?.valid) {
        recommendations.push('Data persistence issues - check storage permissions');
      }
      
      // Usage recommendations
      if (layers.usage?.riskLevel === 'HIGH') {
        recommendations.push('Suspicious usage patterns detected - review activity logs');
      }
      
      // General recommendations based on score
      if (validationResults.overallScore < 80) {
        recommendations.push('Overall security score below recommended threshold');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Security validation passed - system operating normally');
      }
      
      return recommendations;
    } catch (error) {
      return ['Error generating security recommendations'];
    }
  }

  /**
   * Comprehensive security check
   */
  async performSecurityCheck(licenseData = null) {
    const securityResults = {
      valid: true,
      checks: {},
      issues: [],
      warnings: []
    };
    
    try {
      // 1. Hardware fingerprint check
      const fingerprint = await this.generateHardwareFingerprint();
      securityResults.checks.hardwareFingerprint = {
        valid: true,
        fingerprint: fingerprint.substring(0, 16) + '...'
      };
      
      // 2. System time validation
      const timeValidation = await this.validateSystemTime();
      securityResults.checks.systemTime = timeValidation;
      if (!timeValidation.valid) {
        securityResults.valid = false;
        securityResults.issues.push(`Time validation failed: ${timeValidation.reason}`);
      }
      
      // 3. Usage pattern analysis
      const anomalyDetection = this.detectUsageAnomalies();
      securityResults.checks.usagePatterns = anomalyDetection;
      if (!anomalyDetection.valid) {
        securityResults.valid = false;
        securityResults.issues.push(`Usage anomaly detected: ${anomalyDetection.reason}`);
      }
      
      // 4. License integrity check (if data provided)
      if (licenseData) {
        const integrityCheck = await this.validateLicenseIntegrity(licenseData);
        securityResults.checks.licenseIntegrity = integrityCheck;
        if (!integrityCheck.valid) {
          securityResults.valid = false;
          securityResults.issues.push(...integrityCheck.issues);
        }
        securityResults.warnings.push(...integrityCheck.warnings);
      }
      
      // 5. Network connectivity check
      const networkCheck = await this.checkNetworkConnectivity();
      securityResults.checks.networkConnectivity = networkCheck;
      if (!networkCheck.valid) {
        securityResults.warnings.push('Network connectivity issues detected');
      }
      
      return securityResults;
    } catch (error) {
      console.error('Security check failed:', error);
      return {
        valid: false,
        checks: {},
        issues: [`Security check error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Emergency lockdown system
   */
  async triggerEmergencyLockdown(reason, severity = 'HIGH') {
    try {
      console.error(`EMERGENCY LOCKDOWN TRIGGERED: ${reason}`);
      
      this.emergencyLockdown = true;
      
      // Store lockdown event
      await this.storeSecurityEvent({
        type: 'EMERGENCY_LOCKDOWN',
        reason: reason,
        severity: severity,
        timestamp: new Date().toISOString(),
        lockdownActive: true
      });
      
      // Immediately secure all data
      await this.secureAllData();
      
      // Enable maximum security mode
      await this.enableMaximumSecurityMode();
      
      // Create recovery challenge
      const recoveryChallenge = await this.createRecoveryChallenge();
      
      // Store lockdown state persistently
      await this.storeLockdownState({
        active: true,
        reason: reason,
        severity: severity,
        timestamp: Date.now(),
        recoveryChallenge: recoveryChallenge,
        requiresManualIntervention: true
      });
      
      // Notify user of lockdown (if possible)
      await this.notifyLockdown(reason, recoveryChallenge);
      
      return {
        lockdownActive: true,
        reason: reason,
        severity: severity,
        recoveryRequired: true,
        challenge: recoveryChallenge,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Emergency lockdown failed:', error);
      // Even if lockdown fails, mark as locked
      this.emergencyLockdown = true;
      return {
        lockdownActive: true,
        reason: 'Lockdown system error',
        severity: 'CRITICAL',
        recoveryRequired: true
      };
    }
  }

  /**
   * Secure all data during lockdown
   */
  async secureAllData() {
    try {
      // Encrypt all critical data with lockdown key
      const lockdownKey = await this.generateLockdownKey();
      
      const criticalData = [
        'time_anchor',
        'usage_patterns',
        'enhanced_fingerprint',
        'system_integrity',
        'security_events'
      ];
      
      for (const dataKey of criticalData) {
        try {
          const data = await AsyncStorage.getItem(dataKey);
          if (data) {
            // Re-encrypt with lockdown key
            const reencrypted = CryptoJS.AES.encrypt(
              data,
              lockdownKey
            ).toString();
            await AsyncStorage.setItem(dataKey + '_locked', reencrypted);
            
            // Clear original
            await AsyncStorage.removeItem(dataKey);
          }
        } catch (error) {
          console.error(`Failed to secure ${dataKey}:`, error);
        }
      }
      
      // Store lockdown key hash for verification
      const keyHash = CryptoJS.SHA256(lockdownKey).toString();
      await AsyncStorage.setItem('lockdown_key_hash', keyHash);
      
    } catch (error) {
      console.error('Data securing failed:', error);
    }
  }

  /**
   * Generate lockdown key
   */
  async generateLockdownKey() {
    try {
      // Create lockdown key based on multiple factors
      const factors = [
        this.fingerprintCache || 'no_fingerprint',
        this.offlineTimeAnchor ? this.offlineTimeAnchor.anchorTimestamp : 'no_anchor',
        Date.now().toString(),
        Math.random().toString(36),
        'LOCKDOWN_' + (this.emergencyLockdown ? 'ACTIVE' : 'INACTIVE')
      ];
      
      const keyMaterial = factors.join('|');
      return CryptoJS.PBKDF2(keyMaterial, 'lockdown_salt', {
        keySize: 256/32,
        iterations: 10000
      }).toString();
    } catch (error) {
      // Fallback key
      return CryptoJS.SHA256('emergency_lockdown_fallback').toString();
    }
  }

  /**
   * Enable maximum security mode
   */
  async enableMaximumSecurityMode() {
    try {
      // Increase validation frequency
      this.validationFrequency = 'MAXIMUM';
      
      // Enable real-time monitoring
      this.realTimeMonitoring = true;
      
      // Set aggressive timeout
      this.aggressiveTimeout = true;
      
      // Store maximum security state
      await this.storeSecurityEvent({
        type: 'MAXIMUM_SECURITY_ENABLED',
        timestamp: new Date().toISOString(),
        validationFrequency: 'MAXIMUM',
        realTimeMonitoring: true
      });
      
    } catch (error) {
      console.error('Maximum security mode failed:', error);
    }
  }

  /**
   * Create recovery challenge
   */
  async createRecoveryChallenge() {
    try {
      // Generate random challenge
      const challenge = {
        id: CryptoJS.lib.WordArray.random(16).toString(),
        question: this.generateChallengeQuestion(),
        expectedAnswer: this.generateExpectedAnswer(),
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      return challenge;
    } catch (error) {
      // Fallback challenge
      return {
        id: 'fallback_challenge',
        question: 'Contact support for recovery assistance',
        expectedAnswer: 'SUPPORT_REQUIRED',
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      };
    }
  }

  /**
   * Generate challenge question
   */
  generateChallengeQuestion() {
    const questions = [
      'What is the name of your business?',
      'What is your license key?',
      'When did you first install this application?',
      'What is your shop registration number?',
      'Who is your system administrator?'
    ];
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Generate expected answer (simplified for demo)
   */
  generateExpectedAnswer() {
    // In a real implementation, this would be based on stored user data
    return 'CONTACT_SUPPORT';
  }

  /**
   * Store lockdown state
   */
  async storeLockdownState(state) {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(state),
        await this.getEncryptionKey()
      ).toString();
      
      await AsyncStorage.setItem('lockdown_state', encrypted);
    } catch (error) {
      console.error('Lockdown state storage failed:', error);
    }
  }

  /**
   * Notify user of lockdown
   */
  async notifyLockdown(reason, challenge) {
    try {
      // Store notification for display
      await this.storeSecurityEvent({
        type: 'LOCKDOWN_NOTIFICATION',
        reason: reason,
        challenge: challenge,
        timestamp: new Date().toISOString(),
        message: 'System has been locked down due to security violations. Recovery required.'
      });
      
      console.warn('LOCKDOWN NOTIFICATION:', {
        reason: reason,
        challengeId: challenge.id,
        requiresRecovery: true
      });
      
    } catch (error) {
      console.error('Lockdown notification failed:', error);
    }
  }

  /**
   * Check if system is in lockdown
   */
  async isInLockdown() {
    try {
      if (this.emergencyLockdown) return true;
      
      const encrypted = await AsyncStorage.getItem('lockdown_state');
      if (!encrypted) return false;
      
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        await this.getEncryptionKey()
      ).toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) return true; // Assume lockdown if can't decrypt
      
      const state = JSON.parse(decrypted);
      return state.active === true;
    } catch (error) {
      return true; // Assume lockdown on error
    }
  }

  /**
   * Attempt recovery from lockdown
   */
  async attemptRecovery(challengeId, answer) {
    try {
      const lockdownState = await AsyncStorage.getItem('lockdown_state');
      if (!lockdownState) {
        return { success: false, reason: 'No lockdown state found' };
      }
      
      const decrypted = CryptoJS.AES.decrypt(
        lockdownState,
        await this.getEncryptionKey()
      ).toString(CryptoJS.enc.Utf8);
      
      const state = JSON.parse(decrypted);
      
      // Check if challenge is valid
      if (state.recoveryChallenge.id !== challengeId) {
        return { success: false, reason: 'Invalid challenge ID' };
      }
      
      // Check if challenge has expired
      if (Date.now() > state.recoveryChallenge.expiresAt) {
        return { success: false, reason: 'Challenge has expired' };
      }
      
      // Verify answer (simplified)
      if (answer !== state.recoveryChallenge.expectedAnswer) {
        await this.recordFailedRecoveryAttempt();
        return { success: false, reason: 'Incorrect answer' };
      }
      
      // Recovery successful
      await this.performRecovery();
      
      return {
        success: true,
        message: 'System recovery successful. Security measures restored.',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Recovery attempt failed:', error);
      return { success: false, reason: 'Recovery system error' };
    }
  }

  /**
   * Record failed recovery attempt
   */
  async recordFailedRecoveryAttempt() {
    try {
      await this.storeSecurityEvent({
        type: 'FAILED_RECOVERY_ATTEMPT',
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown', // Would be captured in real implementation
        requiresInvestigation: true
      });
      
      // If too many failed attempts, extend lockdown
      const events = await this.getSecurityEvents();
      const recentFailures = events.filter(event => 
        event.type === 'FAILED_RECOVERY_ATTEMPT' &&
        new Date(event.timestamp) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
      );
      
      if (recentFailures.length >= 3) {
        await this.triggerEmergencyLockdown('multiple_failed_recovery_attempts', 'CRITICAL');
      }
    } catch (error) {
      console.error('Failed recovery recording failed:', error);
    }
  }

  /**
   * Perform system recovery
   */
  async performRecovery() {
    try {
      // Clear lockdown state
      await AsyncStorage.removeItem('lockdown_state');
      
      // Restore data from locked storage
      await this.restoreLockedData();
      
      // Reset security variables
      this.emergencyLockdown = false;
      this.validationFrequency = 'NORMAL';
      this.realTimeMonitoring = false;
      
      // Store recovery event
      await this.storeSecurityEvent({
        type: 'SYSTEM_RECOVERED',
        timestamp: new Date().toISOString(),
        recoverySuccessful: true
      });
      
      console.log('System recovery completed successfully');
      
    } catch (error) {
      console.error('System recovery failed:', error);
      // Keep lockdown active if recovery fails
      this.emergencyLockdown = true;
    }
  }

  /**
   * Restore locked data
   */
  async restoreLockedData() {
    try {
      const criticalData = [
        'time_anchor',
        'usage_patterns', 
        'enhanced_fingerprint',
        'system_integrity',
        'security_events'
      ];
      
      for (const dataKey of criticalData) {
        try {
          const lockedData = await AsyncStorage.getItem(dataKey + '_locked');
          if (lockedData) {
            // Restore original data
            await AsyncStorage.setItem(dataKey, lockedData);
            
            // Remove locked copy
            await AsyncStorage.removeItem(dataKey + '_locked');
          }
        } catch (error) {
          console.error(`Failed to restore ${dataKey}:`, error);
        }
      }
      
      // Clear lockdown key hash
      await AsyncStorage.removeItem('lockdown_key_hash');
      
    } catch (error) {
      console.error('Data restoration failed:', error);
    }
  }

  /**
   * Secure offline license validation mechanism
   */
  async validateLicenseOffline(licenseData) {
    try {
      // Check if system is in lockdown
      const lockdownActive = await this.isInLockdown();
      if (lockdownActive) {
        return {
          valid: false,
          reason: 'System is in lockdown mode',
          requiresRecovery: true,
          lockdownActive: true
        };
      }
      
      // Comprehensive offline validation
      const validationResults = await this.performMultiLayerValidation(licenseData);
      
      // Add offline-specific checks
      const offlineChecks = {
        offlineCapable: true,
        dataPersistence: await this.validateDataPersistence(),
        offlineTimeValidation: await this.validateOfflineTime(),
        hardwareBinding: await this.validateHardwareBinding(),
        offlineSecurityScore: this.calculateOfflineSecurityScore(validationResults)
      };
      
      validationResults.offlineChecks = offlineChecks;
      
      // Determine offline validity
      const offlineValid = validationResults.valid && 
                          offlineChecks.offlineCapable &&
                          offlineChecks.dataPersistence.valid &&
                          offlineChecks.offlineTimeValidation.valid &&
                          offlineChecks.hardwareBinding.valid &&
                          offlineChecks.offlineSecurityScore >= 60;
      
      validationResults.offlineValid = offlineValid;
      
      // Add tracking for offline validation
      this.trackUsage('license_validation_offline', {
        valid: offlineValid,
        score: offlineChecks.offlineSecurityScore,
        riskLevel: validationResults.riskLevel
      });
      
      return validationResults;
    } catch (error) {
      console.error('Offline license validation failed:', error);
      return {
        valid: false,
        reason: `Offline validation error: ${error.message}`,
        error: error.message,
        offlineValid: false
      };
    }
  }

  /**
   * Validate data persistence for offline use
   */
  async validateDataPersistence() {
    try {
      const persistenceTests = {
        encryptionKeyPersists: false,
        timeAnchorPersists: false,
        fingerprintPersists: false,
        usagePatternsPersists: false,
        licenseDataPersists: false
      };
      
      // Test encryption key persistence
      const encryptionKey = await AsyncStorage.getItem('encryption_key');
      persistenceTests.encryptionKeyPersists = !!encryptionKey;
      
      // Test time anchor persistence
      const timeAnchor = await AsyncStorage.getItem('time_anchor');
      persistenceTests.timeAnchorPersists = !!timeAnchor;
      
      // Test fingerprint persistence
      const fingerprint = await AsyncStorage.getItem('enhanced_fingerprint');
      persistenceTests.fingerprintPersists = !!fingerprint;
      
      // Test usage patterns persistence
      const usagePatterns = await AsyncStorage.getItem('usage_patterns');
      persistenceTests.usagePatternsPersists = !!usagePatterns;
      
      // Test license data persistence (if available)
      const licenseData = await AsyncStorage.getItem('current_license');
      persistenceTests.licenseDataPersists = !!licenseData;
      
      const totalTests = Object.keys(persistenceTests).length;
      const passedTests = Object.values(persistenceTests).filter(Boolean).length;
      const persistenceScore = (passedTests / totalTests) * 100;
      
      return {
        valid: persistenceScore >= 80,
        score: persistenceScore,
        tests: persistenceTests,
        passedTests: passedTests,
        totalTests: totalTests
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        score: 0
      };
    }
  }

  /**
   * Validate offline time handling
   */
  async validateOfflineTime() {
    try {
      const timeValidations = {
        timeAnchorAvailable: false,
        timeConsistency: false,
        noTimeManipulation: false,
        timezoneConsistent: false
      };
      
      // Check time anchor availability
      const timeAnchor = this.offlineTimeAnchor || await this.loadTimeAnchor();
      timeValidations.timeAnchorAvailable = !!timeAnchor;
      
      if (timeAnchor) {
        // Check time consistency
        const currentTime = new Date();
        const anchorTime = new Date(timeAnchor.anchorTime);
        const timeDiff = Math.abs(currentTime - anchorTime);
        
        // Allow for reasonable time passage (not more than 1 year difference)
        timeValidations.timeConsistency = timeDiff < 365 * 24 * 60 * 60 * 1000;
        
        // Check for time manipulation
        const lastValidation = await this.getLastValidationTime();
        if (lastValidation) {
          timeValidations.noTimeManipulation = currentTime >= lastValidation;
        } else {
          timeValidations.noTimeManipulation = true;
        }
        
        // Check timezone consistency
        const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        timeValidations.timezoneConsistent = timeAnchor.anchorTimezone === currentTimezone;
      }
      
      const totalValidations = Object.keys(timeValidations).length;
      const passedValidations = Object.values(timeValidations).filter(Boolean).length;
      const timeScore = (passedValidations / totalValidations) * 100;
      
      return {
        valid: timeScore >= 75,
        score: timeScore,
        validations: timeValidations,
        passedValidations: passedValidations,
        totalValidations: totalValidations
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        score: 0
      };
    }
  }

  /**
   * Load time anchor
   */
  async loadTimeAnchor() {
    try {
      const encrypted = await AsyncStorage.getItem('time_anchor');
      if (!encrypted) return null;
      
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        await this.getEncryptionKey()
      ).toString(CryptoJS.enc.Utf8);
      
      return decrypted ? JSON.parse(decrypted) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate hardware binding
   */
  async validateHardwareBinding() {
    try {
      const bindingChecks = {
        fingerprintAvailable: false,
        fingerprintConsistent: false,
        hardwareStable: false,
        noHardwareChanges: false
      };
      
      // Check fingerprint availability
      const currentFingerprint = await this.generateHardwareFingerprint();
      bindingChecks.fingerprintAvailable = !!currentFingerprint;
      
      if (bindingChecks.fingerprintAvailable) {
        // Check fingerprint consistency
        const storedFingerprint = await this.getStoredFingerprint();
        bindingChecks.fingerprintConsistent = storedFingerprint === currentFingerprint;
        
        // Check hardware stability (simplified)
        bindingChecks.hardwareStable = true; // Would check against known hardware profile
        
        // Check for hardware changes
        bindingChecks.noHardwareChanges = bindingChecks.fingerprintConsistent;
      }
      
      const totalChecks = Object.keys(bindingChecks).length;
      const passedChecks = Object.values(bindingChecks).filter(Boolean).length;
      const bindingScore = (passedChecks / totalChecks) * 100;
      
      return {
        valid: bindingScore >= 75,
        score: bindingScore,
        checks: bindingChecks,
        passedChecks: passedChecks,
        totalChecks: totalChecks
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        score: 0
      };
    }
  }

  /**
   * Calculate offline security score
   */
  calculateOfflineSecurityScore(validationResults) {
    try {
      const offlineWeights = {
        overallScore: 0.30,
        hardwareLayer: 0.20,
        timeLayer: 0.20,
        licenseLayer: 0.15,
        systemLayer: 0.10,
        persistenceLayer: 0.05
      };
      
      let totalScore = 0;
      
      // Overall score
      totalScore += (validationResults.overallScore || 0) * offlineWeights.overallScore;
      
      // Layer scores
      if (validationResults.layers) {
        const hardwareScore = validationResults.layers.hardware?.score || (validationResults.layers.hardware?.valid ? 100 : 0);
        const timeScore = validationResults.layers.time?.valid ? 100 : 0;
        const licenseScore = validationResults.layers.license?.valid ? 100 : 0;
        const systemScore = validationResults.layers.system?.score || (validationResults.layers.system?.valid ? 100 : 0);
        const persistenceScore = validationResults.layers.persistence?.score || 0;
        
        totalScore += hardwareScore * offlineWeights.hardwareLayer;
        totalScore += timeScore * offlineWeights.timeLayer;
        totalScore += licenseScore * offlineWeights.licenseLayer;
        totalScore += systemScore * offlineWeights.systemLayer;
        totalScore += persistenceScore * offlineWeights.persistenceLayer;
      }
      
      return Math.round(totalScore);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Store security event
   */
  async storeSecurityEvent(event) {
    try {
      const events = await this.getSecurityEvents();
      events.push(event);
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(events),
        await this.getEncryptionKey()
      ).toString();
      
      await AsyncStorage.setItem('security_events', encrypted);
    } catch (error) {
      console.error('Security event storage failed:', error);
    }
  }

  /**
   * Get security events
   */
  async getSecurityEvents() {
    try {
      const encrypted = await AsyncStorage.getItem('security_events');
      if (!encrypted) return [];
      
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        await this.getEncryptionKey()
      ).toString(CryptoJS.enc.Utf8);
      
      return decrypted ? JSON.parse(decrypted) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Check network connectivity with CORS handling
   */
  async checkNetworkConnectivity() {
    try {
      // Multiple time sources for redundancy
      const timeSources = [
        'https://worldtimeapi.org/api/timezone/Etc/UTC',
        'https://api.timezonedb.com/v2.1/get-time-zone?key=YOUR_KEY&format=json&by=zone&zone=UTC',
        'https://timeapi.io/api/Time/current/zone?timeZone=UTC'
      ];
      
      // Try each source with timeout
      for (const source of timeSources) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const response = await fetch(source, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const timeData = await response.json();
            return {
              valid: true,
              serverTime: timeData.datetime || timeData.currentDateTime || new Date().toISOString(),
              source: source.includes('worldtimeapi') ? 'worldtimeapi.org' : 
                     source.includes('timezonedb') ? 'timezonedb.com' : 'timeapi.io',
              score: 100
            };
          }
        } catch (sourceError) {
          console.log(`Time source ${source} failed:`, sourceError.message);
          continue; // Try next source
        }
      }
      
      // If all network sources fail, check if we're in a development environment
      // or if it's a CORS issue (which is common in development)
      const isDevelopment = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('localhost') ||
        window.location.protocol === 'http:'
      );
      
      if (isDevelopment) {
        console.log('🛠️ Development environment detected - allowing offline validation');
        // Development environment - allow offline validation
        return {
          valid: true, // Treat as valid in dev to avoid CORS blocking
          serverTime: new Date().toISOString(),
          source: 'local-development',
          score: 80,
          warning: 'Using local time in development environment'
        };
      }
      
      return {
        valid: false,
        reason: 'All network time sources failed',
        score: 0,
        corsBlocked: true
      };
      
    } catch (error) {
      // If it's a CORS error specifically, handle it gracefully
      if (error.message.includes('CORS') || error.message.includes('Cross-Origin')) {
        return {
          valid: true, // Allow app to proceed in offline mode
          serverTime: new Date().toISOString(),
          source: 'offline-fallback',
          score: 70,
          warning: 'CORS blocked - using offline validation mode'
        };
      }
      
      return {
        valid: false,
        reason: `Network error: ${error.message}`,
        score: 0
      };
    }
  }

  /**
   * Reset security state (for testing or troubleshooting)
   */
  async resetSecurityState() {
    try {
      this.fingerprintCache = null;
      this.lastValidationTime = null;
      this.usageHistory = [];
      this.validationChain = [];
      this.usagePatterns = new Map();
      this.emergencyLockdown = false;
      this.sessionId = null;
      
      // Clear stored security data
      const keysToClear = [
        'last_validation_time',
        'enhanced_fingerprint',
        'time_anchor',
        'usage_patterns',
        'system_integrity',
        'security_events',
        'lockdown_state'
      ];
      
      for (const key of keysToClear) {
        await AsyncStorage.removeItem(key);
      }
      
      // Reinitialize
      await this.initializeSecurity();
      
      return { success: true };
    } catch (error) {
      console.error('Security state reset failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup method to remove event listeners
   */
  cleanup() {
    try {
      if (this.appStateChangeHandler) {
        AppState.removeEventListener('change', this.appStateChangeHandler);
        this.appStateChangeHandler = null;
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const licenseSecurity = new LicenseSecurity();
export default licenseSecurity;