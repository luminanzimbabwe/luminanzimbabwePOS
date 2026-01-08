/**
 * Quick License Unlock Script
 * Run this to recover from time manipulation lockdown
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const QuickLicenseUnlock = {
  /**
   * Quick unlock for emergency recovery
   */
  async unlockNow() {
    try {
      console.log('🔧 Starting quick license unlock...');
      
      // Clear lockdown state
      await AsyncStorage.removeItem('lockdown_state');
      console.log('✅ Lockdown state cleared');
      
      // Reset time anchor
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
      
      const encryptionKey = await this.getEncryptionKey();
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(timeAnchor),
        encryptionKey
      ).toString();
      
      await AsyncStorage.setItem('time_anchor', encrypted);
      console.log('✅ Time anchor reset');
      
      console.log('🎉 Quick unlock completed! Restart the app now.');
      
      return {
        success: true,
        message: 'Unlock completed! Please restart the app.'
      };
      
    } catch (error) {
      console.error('❌ Unlock failed:', error);
      return {
        success: false,
        message: `Unlock failed: ${error.message}`
      };
    }
  },

  async getEncryptionKey() {
    let key = await AsyncStorage.getItem('encryption_key');
    if (!key) {
      key = CryptoJS.lib.WordArray.random(256/8).toString();
      await AsyncStorage.setItem('encryption_key', key);
    }
    return key;
  }
};

// Auto-run unlock
QuickLicenseUnlock.unlockNow().then(result => {
  if (result.success) {
    console.log('🎊 SUCCESS:', result.message);
  } else {
    console.error('💥 ERROR:', result.message);
  }
});

export default QuickLicenseUnlock;