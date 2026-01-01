// Real Server Integration for Offline-First POS
// This service integrates with the actual Render server at https://luminanzimbabwepos.onrender.com

import OfflineFirstService from './offlineFirstService.js';
import { shopAPI } from './api.js';
import { shopStorage } from './storage.js';

class ServerIntegration {
  constructor() {
    this.serverUrl = 'https://luminanzimbabwepos.onrender.com';
    this.isInitialized = false;
    this.authenticated = false;
    this.credentials = null;
  }

  // Initialize connection to real Render server
  async initialize() {
    try {
      console.log('🚀 Initializing connection to Render server...');
      console.log(`🌐 Server URL: ${this.serverUrl}`);

      // Test server connectivity
      await this.testServerConnection();

      // Initialize offline-first system
      await OfflineFirstService.initialize();

      this.isInitialized = true;
      console.log('✅ Server integration initialized successfully');

      return true;
    } catch (error) {
      console.error('❌ Server integration initialization failed:', error);
      throw error;
    }
  }

  // Test connection to the real Render server
  async testServerConnection() {
    try {
      console.log('🔍 Testing server connection...');

      const response = await fetch(`${this.serverUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LuminaN-POS/1.0'
        }
      });

      if (response.ok) {
        const healthData = await response.json();
        console.log('✅ Server is healthy:', healthData);
        return true;
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('⚠️ Server connection test failed:', error.message);
      // Don't throw here - we can still work offline
      return false;
    }
  }

  // Authenticate with the server using stored credentials
  async authenticate() {
    try {
      console.log('🔐 Authenticating with server...');

      // Get stored credentials
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        throw new Error('No stored credentials found');
      }

      // Test authentication
      const authData = {
        email: credentials.email,
        password: credentials.shop_owner_master_password
      };

      const response = await fetch(`${this.serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(authData)
      });

      if (response.ok) {
        const authResult = await response.json();
        this.credentials = { ...credentials, ...authResult };
        this.authenticated = true;
        
        console.log('✅ Authentication successful');
        return true;
      } else {
        throw new Error(`Authentication failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      this.authenticated = false;
      return false;
    }
  }

  // Enhanced product sync with real server
  async syncProducts() {
    try {
      console.log('📦 Syncing products with server...');

      if (!this.authenticated) {
        await this.authenticate();
      }

      // Get latest products from server
      const response = await shopAPI.getProducts();
      const serverProducts = response.data || [];

      console.log(`📥 Received ${serverProducts.length} products from server`);

      // Update local database with server data
      await OfflineFirstService.updateLocalProducts(serverProducts);

      // Add to sync queue for any local changes that need to go up
      for (const product of serverProducts) {
        // This would typically check for local modifications
        // and queue them for sync
      }

      console.log('✅ Product sync completed');
      return {
        success: true,
        serverProducts: serverProducts.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Product sync failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Enhanced sales sync with real server
  async syncSales() {
    try {
      console.log('💰 Syncing sales with server...');

      if (!this.authenticated) {
        await this.authenticate();
      }

      // Get latest sales from server
      const response = await shopAPI.getSales();
      const serverSales = response.data?.sales || response.data || [];

      console.log(`📥 Received ${serverSales.length} sales from server`);

      // Update local database with server sales data
      for (const sale of serverSales) {
        const existingSale = await OfflineFirstService.localDatabase.select(
          'sales', 'server_id = ?', [sale.id?.toString()]
        );

        if (existingSale.length === 0) {
          await OfflineFirstService.localDatabase.insert('sales', {
            server_id: sale.id?.toString(),
            total_amount: sale.total_amount,
            payment_method: sale.payment_method,
            cashier_id: sale.cashier_id,
            shop_id: sale.shop_id,
            customer_name: sale.customer_name,
            sale_date: sale.sale_date,
            status: sale.status || 'completed',
            created_at: sale.created_at
          });
        }
      }

      console.log('✅ Sales sync completed');
      return {
        success: true,
        serverSales: serverSales.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Sales sync failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Push local sales to server
  async pushLocalSales() {
    try {
      console.log('⬆️ Pushing local sales to server...');

      if (!this.authenticated) {
        await this.authenticate();
      }

      // Get unsynced local sales
      const unsyncedSales = await OfflineFirstService.localDatabase.select(
        'sales', 'sync_status = ?', ['pending']
      );

      let pushedCount = 0;

      for (const sale of unsyncedSales) {
        try {
          // Create sale on server
          const saleData = {
            total_amount: sale.total_amount,
            payment_method: sale.payment_method,
            cashier_id: sale.cashier_id,
            shop_id: sale.shop_id,
            customer_name: sale.customer_name,
            sale_date: sale.sale_date,
            items: sale.items || []
          };

          const response = await fetch(`${this.serverUrl}/api/sales/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(saleData)
          });

          if (response.ok) {
            const result = await response.json();
            
            // Mark as synced locally
            await OfflineFirstService.localDatabase.update('sales',
              { 
                sync_status: 'synced', 
                server_id: result.id.toString() 
              },
              'id = ?', [sale.id]
            );

            pushedCount++;
            console.log(`✅ Pushed sale ${sale.id} (server ID: ${result.id})`);
          }
        } catch (saleError) {
          console.error(`❌ Failed to push sale ${sale.id}:`, saleError);
        }
      }

      console.log(`✅ Pushed ${pushedCount} local sales to server`);
      return {
        success: true,
        pushedCount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Push local sales failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Comprehensive sync: pull from server and push local changes
  async performFullSync() {
    try {
      console.log('🔄 Starting comprehensive server sync...');

      const results = {
        startTime: new Date().toISOString(),
        steps: []
      };

      // Step 1: Test server connection
      const connectionTest = await this.testServerConnection();
      results.steps.push({
        step: 'connection_test',
        success: connectionTest,
        timestamp: new Date().toISOString()
      });

      if (!connectionTest) {
        console.log('📴 Server not reachable, sync aborted');
        results.success = false;
        results.error = 'Server not reachable';
        return results;
      }

      // Step 2: Authenticate
      const authResult = await this.authenticate();
      results.steps.push({
        step: 'authentication',
        success: authResult,
        timestamp: new Date().toISOString()
      });

      // Step 3: Pull products from server
      const productSync = await this.syncProducts();
      results.steps.push({
        step: 'product_sync',
        ...productSync,
        timestamp: new Date().toISOString()
      });

      // Step 4: Pull sales from server
      const salesSync = await this.syncSales();
      results.steps.push({
        step: 'sales_sync',
        ...salesSync,
        timestamp: new Date().toISOString()
      });

      // Step 5: Push local changes to server
      const pushResult = await this.pushLocalSales();
      results.steps.push({
        step: 'push_local_changes',
        ...pushResult,
        timestamp: new Date().toISOString()
      });

      // Step 6: Run conflict resolution
      const conflictResolution = await OfflineFirstService.resolveConflicts();
      results.steps.push({
        step: 'conflict_resolution',
        ...conflictResolution,
        timestamp: new Date().toISOString()
      });

      results.endTime = new Date().toISOString();
      results.success = true;

      console.log('✅ Comprehensive server sync completed');
      return results;

    } catch (error) {
      console.error('❌ Comprehensive sync failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get server integration status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      authenticated: this.authenticated,
      serverUrl: this.serverUrl,
      credentials: this.credentials ? {
        email: this.credentials.email,
        hasPassword: !!this.credentials.shop_owner_master_password
      } : null
    };
  }

  // Health check for the entire system
  async healthCheck() {
    try {
      console.log('🏥 Running system health check...');

      const health = {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        checks: {}
      };

      // Check server connectivity
      const serverHealth = await this.testServerConnection();
      health.checks.server = serverHealth ? 'healthy' : 'unreachable';

      // Check offline-first system
      const offlineStatus = OfflineFirstService.getSyncStatus();
      health.checks.offline_first = offlineStatus.isInitialized ? 'healthy' : 'not_initialized';

      // Check database
      try {
        const dbStats = await OfflineFirstService.getDatabaseStats();
        health.checks.database = dbStats ? 'healthy' : 'error';
      } catch (error) {
        health.checks.database = 'error';
        health.overall = 'degraded';
      }

      // Check authentication
      health.checks.authentication = this.authenticated ? 'authenticated' : 'not_authenticated';

      // Determine overall health
      const failedChecks = Object.values(health.checks).filter(status => status === 'error' || status === 'unreachable').length;
      if (failedChecks > 0) {
        health.overall = 'degraded';
      }

      console.log('✅ Health check completed:', health);
      return health;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        timestamp: new Date().toISOString(),
        overall: 'error',
        error: error.message
      };
    }
  }
}

export default new ServerIntegration();