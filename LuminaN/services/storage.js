// Storage service for managing app data persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  SHOP_CREDENTIALS: 'shop_credentials',
  USER_SESSION: 'user_session',
  APP_INITIALIZED: 'app_initialized',
  PENDING_ORDERS: 'pending_orders',
  CONFIRMED_ORDERS: 'confirmed_orders',
  CASHIER_RECEIVING_RECORDS: 'cashier_receiving_records',
  LICENSE_DATA: 'license_data',
  LICENSE_SECURITY_DATA: 'license_security_data',
  BUSINESS_SETTINGS: 'business_settings'
};

/**
 * Shop credentials storage
 */
export const shopStorage = {
  // Save shop credentials after successful reset
  async saveCredentials(credentials) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOP_CREDENTIALS, JSON.stringify({
        ...credentials,
        savedAt: new Date().toISOString()
      }));
      console.log('✅ Shop credentials saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save credentials:', error);
      return false;
    }
  },

  // Get stored shop credentials
  async getCredentials() {
    try {
      const credentialsJson = await AsyncStorage.getItem(STORAGE_KEYS.SHOP_CREDENTIALS);
      if (credentialsJson) {
        return JSON.parse(credentialsJson);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get credentials:', error);
      return null;
    }
  },

  // Clear stored credentials
  async clearCredentials() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_CREDENTIALS);
      console.log('✅ Shop credentials cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear credentials:', error);
      return false;
    }
  },

  // Check if credentials are saved
  async hasCredentials() {
    const credentials = await this.getCredentials();
    return credentials !== null;
  },

  // Memory storage for fallback
  _memoryStorage: {},

  // Generic storage methods for orders
  async getItem(key) {
    try {
      console.log(`📖 Getting item: ${key}`);
      const value = await AsyncStorage.getItem(key);
      console.log(`✅ Got item ${key}:`, value ? 'Found' : 'Not found');
      
      // If not found in AsyncStorage, check memory storage
      if (!value && this._memoryStorage[key]) {
        console.log(`🔄 Found in memory storage: ${key}`);
        return this._memoryStorage[key];
      }
      
      return value;
    } catch (error) {
      console.error(`❌ Failed to get item ${key}:`, error);
      // Fallback to memory storage
      return this._memoryStorage[key] || null;
    }
  },

  async setItem(key, value) {
    try {
      console.log(`💾 Setting item: ${key}`);
      await AsyncStorage.setItem(key, value);
      console.log(`✅ Set item ${key} successfully`);
      
      // Also store in memory as fallback
      if (!this._memoryStorage) this._memoryStorage = {};
      this._memoryStorage[key] = value;
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to set item ${key}:`, error);
      
      // Fallback to memory storage
      if (!this._memoryStorage) this._memoryStorage = {};
      this._memoryStorage[key] = value;
      console.log(`🔄 Stored in memory fallback: ${key}`);
      
      return false;
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      
      // Also remove from memory
      if (this._memoryStorage) {
        delete this._memoryStorage[key];
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove item ${key}:`, error);
      return false;
    }
  },

  // Cashier receiving records specific methods
  async getCashierReceivingRecords() {
    try {
      const recordsJson = await AsyncStorage.getItem(STORAGE_KEYS.CASHIER_RECEIVING_RECORDS);
      if (recordsJson) {
        return JSON.parse(recordsJson);
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get cashier receiving records:', error);
      return [];
    }
  },

  async saveCashierReceivingRecord(record) {
    try {
      const records = await this.getCashierReceivingRecords();
      records.push(record);
      await AsyncStorage.setItem(STORAGE_KEYS.CASHIER_RECEIVING_RECORDS, JSON.stringify(records));
      console.log('✅ Cashier receiving record saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save cashier receiving record:', error);
      return false;
    }
  },

  async saveCashierReceivingRecords(records) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CASHIER_RECEIVING_RECORDS, JSON.stringify(records));
      console.log('✅ Cashier receiving records saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save cashier receiving records:', error);
      return false;
    }
  },

  // License data storage methods
  async saveLicenseData(licenseData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LICENSE_DATA, licenseData);
      console.log('✅ License data saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save license data:', error);
      return false;
    }
  },

  async getLicenseData() {
    try {
      const licenseData = await AsyncStorage.getItem(STORAGE_KEYS.LICENSE_DATA);
      console.log('📋 License data retrieved:', licenseData ? 'Found' : 'Not found');
      return licenseData;
    } catch (error) {
      console.error('❌ Failed to get license data:', error);
      return null;
    }
  },

  async clearLicenseData() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LICENSE_DATA);
      console.log('✅ License data cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear license data:', error);
      return false;
    }
  },

  async hasLicenseData() {
    const licenseData = await this.getLicenseData();
    return licenseData !== null;
  },

  // Business settings storage methods
  async saveBusinessSettings(settings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BUSINESS_SETTINGS, JSON.stringify({
        ...settings,
        savedAt: new Date().toISOString()
      }));
      console.log('✅ Business settings saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save business settings:', error);
      return false;
    }
  },

  async getBusinessSettings() {
    try {
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.BUSINESS_SETTINGS);
      if (settingsJson) {
        return JSON.parse(settingsJson);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get business settings:', error);
      return null;
    }
  },

  async clearBusinessSettings() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.BUSINESS_SETTINGS);
      console.log('✅ Business settings cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear business settings:', error);
      return false;
    }
  },

  // Clear all app data including license
  async clearAllData() {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
      console.log('✅ All app data cleared including license');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
      return false;
    }
  }
};

/**
 * User session storage
 */
export const sessionStorage = {
  // Save user session data
  async saveSession(sessionData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify({
        ...sessionData,
        savedAt: new Date().toISOString()
      }));
      console.log('✅ User session saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save session:', error);
      return false;
    }
  },

  // Get user session data
  async getSession() {
    try {
      const sessionJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (sessionJson) {
        return JSON.parse(sessionJson);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get session:', error);
      return null;
    }
  },

  // Clear user session
  async clearSession() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSION);
      console.log('✅ User session cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear session:', error);
      return false;
    }
  }
};

/**
 * App initialization status
 */
export const appStorage = {
  // Mark app as initialized
  async markInitialized() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_INITIALIZED, 'true');
      return true;
    } catch (error) {
      console.error('❌ Failed to mark app as initialized:', error);
      return false;
    }
  },

  // Check if app is initialized
  async isInitialized() {
    try {
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.APP_INITIALIZED);
      return initialized === 'true';
    } catch (error) {
      console.error('❌ Failed to check initialization status:', error);
      return false;
    }
  },

  // Reset app initialization (for testing)
  async resetInitialization() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.APP_INITIALIZED);
      return true;
    } catch (error) {
      console.error('❌ Failed to reset initialization:', error);
      return false;
    }
  }
};

/**
 * Clear all app data
 */
export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    console.log('✅ All app data cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear all data:', error);
    return false;
  }
};

// Export default storage instance
export default {
  shop: shopStorage,
  session: sessionStorage,
  app: appStorage,
  clearAll: clearAllData
};