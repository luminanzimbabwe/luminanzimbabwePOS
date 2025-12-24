// Storage service for managing app data persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  SHOP_CREDENTIALS: 'shop_credentials',
  USER_SESSION: 'user_session',
  APP_INITIALIZED: 'app_initialized',
  PENDING_ORDERS: 'pending_orders',
  CONFIRMED_ORDERS: 'confirmed_orders'
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