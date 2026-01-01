// Network Detection Service for Offline-First POS
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { EventEmitter } from 'react-native';

class NetworkService extends EventEmitter {
  constructor() {
    super();
    this.isConnected = false;
    this.connectionType = null;
    this.isMonitoring = false;
    this.lastOnlineCheck = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
    
    // Network event listeners
    this.listeners = [];
  }

  // Start monitoring network connectivity
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('🔍 Network monitoring already active');
      return;
    }

    try {
      console.log('🌐 Starting Network Monitoring...');
      
      // Get initial connection state
      const state = await NetInfo.fetch();
      this.updateConnectionState(state);
      
      // Subscribe to network state changes
      const unsubscribe = NetInfo.addEventListener(state => {
        this.handleConnectionChange(state);
      });
      
      this.listeners.push(unsubscribe);
      this.isMonitoring = true;
      
      console.log('✅ Network Monitoring Started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start network monitoring:', error);
      return false;
    }
  }

  // Stop monitoring network connectivity
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    console.log('🛑 Stopping Network Monitoring...');
    
    // Remove all listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    
    this.isMonitoring = false;
    console.log('✅ Network Monitoring Stopped');
  }

  // Handle network state changes
  handleConnectionChange(state) {
    const wasConnected = this.isConnected;
    this.updateConnectionState(state);
    
    console.log('📡 Network State Changed:', {
      isConnected: this.isConnected,
      type: this.connectionType,
      wasConnected: wasConnected
    });

    // Emit network change event
    this.emit('networkChange', {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      wasConnected: wasConnected,
      timestamp: new Date().toISOString()
    });

    // If connection was restored, trigger sync
    if (!wasConnected && this.isConnected) {
      console.log('🔄 Connection restored - triggering sync...');
      this.emit('connectionRestored', {
        connectionType: this.connectionType,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Update internal connection state
  updateConnectionState(state) {
    this.isConnected = state.isConnected;
    this.connectionType = state.type;
    this.lastOnlineCheck = new Date().toISOString();
    
    // Update retry count based on connection status
    if (this.isConnected) {
      this.retryCount = 0;
    }
  }

  // Check current connection status
  async checkConnection() {
    try {
      const state = await NetInfo.fetch();
      this.updateConnectionState(state);
      
      return {
        isConnected: this.isConnected,
        connectionType: this.connectionType,
        isOnline: state.isInternetReachable,
        timestamp: this.lastOnlineCheck
      };
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      return {
        isConnected: false,
        connectionType: 'unknown',
        isOnline: false,
        error: error.message
      };
    }
  }

  // Test actual internet connectivity (not just local network)
  async testInternetConnectivity(timeout = 10000) {
    return new Promise(async (resolve) => {
      console.log('🌍 Testing Internet Connectivity...');
      
      // First check if we have any network connection
      const state = await this.checkConnection();
      if (!state.isConnected) {
        console.log('❌ No network connection available');
        resolve({ success: false, reason: 'no_network' });
        return;
      }

      // Test actual internet connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        // Test multiple endpoints for better reliability
        const endpoints = [
          'https://8.8.8.8', // Google DNS
          'https://1.1.1.1', // Cloudflare DNS
          'https://luminanzimbabwepos.onrender.com/api/v1/shop/health' // Real Render server
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: 'HEAD',
              signal: controller.signal,
              headers: {
                'User-Agent': 'LuminaN-POS/1.0'
              }
            });
            
            clearTimeout(timeoutId);
            console.log('✅ Internet connectivity test passed:', endpoint);
            resolve({ 
              success: true, 
              endpoint: endpoint,
              responseTime: Date.now() - timeoutId
            });
            return;
          } catch (endpointError) {
            console.log(`❌ Endpoint test failed: ${endpoint}`, endpointError.message);
            continue;
          }
        }
        
        clearTimeout(timeoutId);
        console.log('❌ All internet connectivity tests failed');
        resolve({ success: false, reason: 'no_internet_response' });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Internet connectivity test error:', error);
        resolve({ 
          success: false, 
          reason: 'test_failed',
          error: error.message 
        });
      }
    });
  }

  // Wait for internet connectivity with retry logic
  async waitForInternet(maxWaitTime = 300000) { // 5 minutes max
    return new Promise((resolve) => {
      console.log(`⏳ Waiting for internet connectivity (max ${maxWaitTime/1000}s)...`);
      
      const startTime = Date.now();
      const checkInterval = setInterval(async () => {
        // Check if max wait time exceeded
        if (Date.now() - startTime > maxWaitTime) {
          clearInterval(checkInterval);
          console.log('⏰ Max wait time exceeded for internet connectivity');
          resolve(false);
          return;
        }

        // Test connectivity
        const result = await this.testInternetConnectivity();
        if (result.success) {
          clearInterval(checkInterval);
          console.log('✅ Internet connectivity restored!');
          resolve(true);
          return;
        }
      }, 5000); // Check every 5 seconds

      // If we already have connection, resolve immediately
      this.checkConnection().then(state => {
        if (state.isConnected) {
          clearInterval(checkInterval);
          resolve(true);
        }
      });
    });
  }

  // Get detailed connection information
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      isMonitoring: this.isMonitoring,
      lastOnlineCheck: this.lastOnlineCheck,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };
  }

  // Get connection quality score (0-100)
  getConnectionQuality() {
    if (!this.isConnected) return 0;
    
    switch (this.connectionType) {
      case 'wifi':
        return 100;
      case 'cellular':
        return 70;
      case 'ethernet':
        return 90;
      default:
        return 50;
    }
  }

  // Event listener management
  onNetworkChange(callback) {
    this.on('networkChange', callback);
    return () => this.off('networkChange', callback);
  }

  onConnectionRestored(callback) {
    this.on('connectionRestored', callback);
    return () => this.off('connectionRestored', callback);
  }

  // Cleanup
  destroy() {
    this.stopMonitoring();
    this.removeAllListeners();
    console.log('🧹 Network Service destroyed');
  }
}

export default new NetworkService();