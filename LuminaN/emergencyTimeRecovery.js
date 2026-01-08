/**
 * Emergency Time Recovery System
 * Allows recovery from time manipulation lockdown
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import licenseSecurity from './services/licenseSecurity';
import { shopStorage } from './services/storage';

const EmergencyTimeRecovery = {
  /**
   * Check if emergency recovery is needed
   */
  async isEmergencyRecoveryNeeded() {
    try {
      // Check if emergency lockdown is active
      const lockdownActive = await this.isInLockdown();
      
      if (!lockdownActive) return false;
      
      // Get current system time
      const systemTime = new Date();
      const currentYear = systemTime.getFullYear();
      
      // If system time shows future year > 2026, likely time manipulation
      if (currentYear > 2026) {
        console.log('🚨 Emergency recovery needed: Future time detected');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Emergency recovery check failed:', error);
      return false;
    }
  },

  /**
   * Attempt emergency recovery from time manipulation
   */
  async attemptEmergencyRecovery(reason = 'USER_INITIATED') {
    try {
      console.log('🔧 Starting emergency time recovery...');
      
      // Step 1: Clear emergency lockdown
      await this.clearEmergencyLockdown();
      
      // Step 2: Reset time anchor to current real time
      await this.resetTimeAnchor();
      
      // Step 3: Clear manipulation attempt history
      await this.clearManipulationHistory();
      
      // Step 4: Reinitialize security system
      await licenseSecurity.initializeSecurity();
      
      // Step 5: Store recovery event
      await this.storeRecoveryEvent(reason);
      
      console.log('✅ Emergency time recovery completed successfully');
      
      return {
        success: true,
        message: 'Emergency recovery completed. App should now function normally.',
        recovered: true
      };
      
    } catch (error) {
      console.error('❌ Emergency recovery failed:', error);
      return {
        success: false,
        message: `Emergency recovery failed: ${error.message}`,
        recovered: false
      };
    }
  },

  /**
   * Check if system is in lockdown
   */
  async isInLockdown() {
    try {
      const encrypted = await AsyncStorage.getItem('lockdown_state');
      if (!encrypted) return false;
      
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        await this.getEncryptionKey()
      ).toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) return true;
      
      const state = JSON.parse(decrypted);
      return state.active === true;
    } catch (error) {
      return true; // Assume lockdown on error
    }
  },

  /**
   * Clear emergency lockdown state
   */
  async clearEmergencyLockdown() {
    try {
      await AsyncStorage.removeItem('lockdown_state');
      console.log('🗑️ Emergency lockdown state cleared');
    } catch (error) {
      console.error('Failed to clear lockdown state:', error);
      throw error;
    }
  },

  /**
   * Reset time anchor to current time
   */
  async resetTimeAnchor() {
    try {
      const timeAnchor = {
        anchorTime: new Date().toISOString(),
        anchorTimestamp: Date.now(),
        anchorTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        bootCount: 1,
        validationCount: 0,
        manipulationAttempts: [],
        emergencyRecovery: true,
        recoveryTimestamp: Date.now(),
        version: '2.0'
      };
      
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(timeAnchor),
        await this.getEncryptionKey()
      ).toString();
      
      await AsyncStorage.setItem('time_anchor', encrypted);
      console.log('🕒 Time anchor reset to current time');
    } catch (error) {
      console.error('Failed to reset time anchor:', error);
      throw error;
    }
  },

  /**
   * Clear manipulation attempt history
   */
  async clearManipulationHistory() {
    try {
      // Clear any stored manipulation attempts
      const timeAnchor = await AsyncStorage.getItem('time_anchor');
      if (timeAnchor) {
        const decrypted = CryptoJS.AES.decrypt(
          timeAnchor,
          await this.getEncryptionKey()
        ).toString(CryptoJS.enc.Utf8);
        
        if (decrypted) {
          const anchor = JSON.parse(decrypted);
          anchor.manipulationAttempts = [];
          anchor.emergencyRecovery = true;
          anchor.recoveryTimestamp = Date.now();
          
          const reencrypted = CryptoJS.AES.encrypt(
            JSON.stringify(anchor),
            await this.getEncryptionKey()
          ).toString();
          
          await AsyncStorage.setItem('time_anchor', reencrypted);
          console.log('🗑️ Manipulation history cleared');
        }
      }
    } catch (error) {
      console.error('Failed to clear manipulation history:', error);
    }
  },

  /**
   * Store recovery event
   */
  async storeRecoveryEvent(reason) {
    try {
      const recoveryEvent = {
        type: 'EMERGENCY_TIME_RECOVERY',
        reason: reason,
        timestamp: new Date().toISOString(),
        recoveryTimestamp: Date.now(),
        systemTime: new Date().toISOString(),
        recovered: true
      };
      
      const events = await this.getSecurityEvents();
      events.push(recoveryEvent);
      
      // Keep only last 10 recovery events
      if (events.length > 10) {
        events.splice(0, events.length - 10);
      }
      
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(events),
        await this.getEncryptionKey()
      ).toString();
      
      await AsyncStorage.setItem('security_events', encrypted);
      console.log('📝 Recovery event stored');
    } catch (error) {
      console.error('Failed to store recovery event:', error);
    }
  },

  /**
   * Get encryption key
   */
  async getEncryptionKey() {
    let key = await AsyncStorage.getItem('encryption_key');
    if (!key) {
      key = CryptoJS.lib.WordArray.random(256/8).toString();
      await AsyncStorage.setItem('encryption_key', key);
    }
    return key;
  },

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
  },

  /**
   * Provide recovery instructions to user
   */
  getRecoveryInstructions() {
    return {
      title: '🔧 Emergency Time Recovery',
      message: 'Your app was locked due to time manipulation detection.',
      steps: [
        '1. Ensure your system time is set correctly',
        '2. Restart the application',
        '3. If still locked, contact support for manual recovery',
        '4. Do not change system time again to avoid re-lockdown'
      ],
      warning: '⚠️ Changing system time will trigger security lockdown again!'
    };
  }
};

export default EmergencyTimeRecovery;