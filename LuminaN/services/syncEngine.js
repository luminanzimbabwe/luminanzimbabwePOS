// Automatic Sync Engine for Offline-First POS
import LocalDatabaseService from './localDatabase.js';
import NetworkService from './networkService.js';
import SyncQueueService from './syncQueueService.js';
import { EventEmitter } from 'react-native';

class SyncEngine extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.isAutoSyncEnabled = true;
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncDuration: 0,
      recordsProcessed: 0
    };
    this.configuration = {
      autoSyncInterval: 300000, // 5 minutes
      maxSyncDuration: 60000, // 1 minute
      batchSize: 50,
      enableConflictResolution: true,
      syncTimeout: 30000 // 30 seconds
    };
  }

  // Initialize the sync engine
  async initialize() {
    try {
      console.log('🔧 Initializing Sync Engine...');

      // Initialize dependent services
      await LocalDatabaseService.initialize();
      await NetworkService.startMonitoring();
      await SyncQueueService.initialize();

      // Setup event listeners
      this.setupEventListeners();

      // Start auto sync if enabled
      if (this.isAutoSyncEnabled) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      console.log('✅ Sync Engine Initialized Successfully');

      // Emit initialization event
      this.emit('initialized', {
        timestamp: new Date().toISOString(),
        configuration: this.configuration
      });

      return true;
    } catch (error) {
      console.error('❌ Sync Engine initialization failed:', error);
      throw error;
    }
  }

  // Setup event listeners for sync triggers
  setupEventListeners() {
    // Network connectivity events
    NetworkService.onConnectionRestored(() => {
      console.log('🌐 Network connection restored - triggering immediate sync');
      this.triggerImmediateSync();
    });

    // Sync queue events
    SyncQueueService.on('statsUpdated', (stats) => {
      this.emit('queueStatsUpdated', stats);
      
      // Auto-trigger sync if there are pending items and we're online
      if (stats.pending > 0 && NetworkService.isConnected) {
        this.triggerImmediateSync();
      }
    });

    // App lifecycle events (simulate)
    this.setupAppLifecycleListeners();
  }

  // Setup app lifecycle listeners
  setupAppLifecycleListeners() {
    // In a real app, you'd listen to AppState changes
    // For now, we'll simulate basic lifecycle events
    console.log('📱 App lifecycle listeners setup');
  }

  // Start automatic synchronization
  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.performAutoSync();
    }, this.configuration.autoSyncInterval);

    console.log(`⏰ Auto sync started (interval: ${this.configuration.autoSyncInterval/1000}s)`);
  }

  // Stop automatic synchronization
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏰ Auto sync stopped');
    }
  }

  // Perform automatic sync check
  async performAutoSync() {
    if (!NetworkService.isConnected || this.syncInProgress) {
      return;
    }

    // Check if we have items to sync
    const queueStats = SyncQueueService.getQueueStats();
    if (queueStats.pending === 0) {
      return;
    }

    console.log('🔄 Starting automatic sync...');
    await this.performFullSync();
  }

  // Trigger immediate synchronization
  async triggerImmediateSync() {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping immediate trigger');
      return;
    }

    if (!NetworkService.isConnected) {
      console.log('📴 No network connection, skipping immediate sync');
      return;
    }

    console.log('🚀 Triggering immediate sync...');
    await this.performFullSync();
  }

  // Perform full synchronization
  async performFullSync() {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    const syncStartTime = Date.now();

    console.log('🚀 Starting full synchronization...');

    try {
      // Emit sync started event
      this.emit('syncStarted', {
        timestamp: new Date().toISOString(),
        trigger: 'manual'
      });

      // Test network connectivity first
      const connectivityTest = await NetworkService.testInternetConnectivity();
      if (!connectivityTest.success) {
        throw new Error(`No internet connectivity: ${connectivityTest.reason}`);
      }

      // Step 1: Pull data from server (if needed)
      const pullResult = await this.pullDataFromServer();

      // Step 2: Push local changes to server
      const pushResult = await this.pushLocalChanges();

      // Step 3: Process sync queue
      await SyncQueueService.processQueueItems();

      // Step 4: Resolve conflicts if any
      if (this.configuration.enableConflictResolution) {
        await this.resolveConflicts();
      }

      // Step 5: Update sync statistics
      const syncDuration = Date.now() - syncStartTime;
      this.updateSyncStats(true, syncDuration, pushResult.recordsProcessed || 0);

      this.lastSyncTime = new Date().toISOString();

      console.log(`✅ Full synchronization completed in ${syncDuration}ms`);

      // Emit sync completed event
      this.emit('syncCompleted', {
        timestamp: new Date().toISOString(),
        duration: syncDuration,
        pullResult,
        pushResult
      });

      return {
        success: true,
        duration: syncDuration,
        pullResult,
        pushResult
      };

    } catch (error) {
      const syncDuration = Date.now() - syncStartTime;
      this.updateSyncStats(false, syncDuration, 0);

      console.error('❌ Full synchronization failed:', error);

      // Emit sync failed event
      this.emit('syncFailed', {
        timestamp: new Date().toISOString(),
        duration: syncDuration,
        error: error.message
      });

      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Pull data from server (pull-based sync)
  async pullDataFromServer() {
    try {
      console.log('⬇️ Pulling data from server...');

      const serverUrl = 'https://luminanzimbabwepos.onrender.com';
      const lastSync = this.lastSyncTime || '1970-01-01T00:00:00.000Z';

      // Pull products
      const productsResponse = await fetch(`${serverUrl}/api/v1/shop/products/?updated_since=${lastSync}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (productsResponse.ok) {
        const products = await productsResponse.json();
        await this.updateLocalProducts(products);
      }

      // Pull other data types as needed
      // Sales, stock movements, etc.

      console.log('✅ Data pull completed');
      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Data pull failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Push local changes to server (push-based sync)
  async pushLocalChanges() {
    try {
      console.log('⬆️ Pushing local changes to server...');

      const serverUrl = 'https://luminanzimbabwepos.onrender.com';

      // Get unsynced local changes
      const unsyncedSales = await LocalDatabaseService.select(
        'sales', 'sync_status = ?', ['pending']
      );

      let recordsProcessed = 0;

      // Push each unsynced sale
      for (const sale of unsyncedSales) {
        try {
          const response = await fetch(`${serverUrl}/api/v1/shop/sales/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(sale)
          });

          if (response.ok) {
            const result = await response.json();
            
            // Mark as synced locally
            await LocalDatabaseService.update('sales',
              { sync_status: 'synced', server_id: result.id.toString() },
              'id = ?', [sale.id]
            );

            recordsProcessed++;
          }
        } catch (saleError) {
          console.error(`❌ Failed to sync sale ${sale.id}:`, saleError);
        }
      }

      console.log(`✅ Pushed ${recordsProcessed} local changes`);
      return {
        success: true,
        recordsProcessed
      };
    } catch (error) {
      console.error('❌ Local changes push failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update local products with server data
  async updateLocalProducts(serverProducts) {
    try {
      for (const serverProduct of serverProducts) {
        const existingProduct = await LocalDatabaseService.select(
          'products', 'server_id = ?', [serverProduct.id.toString()]
        );

        if (existingProduct.length > 0) {
          // Update existing product
          await LocalDatabaseService.update('products',
            {
              name: serverProduct.name,
              price: serverProduct.price,
              stock_quantity: serverProduct.stock_quantity,
              last_updated: serverProduct.updated_at
            },
            'server_id = ?', [serverProduct.id.toString()]
          );
        } else {
          // Insert new product
          await LocalDatabaseService.insert('products', {
            server_id: serverProduct.id.toString(),
            name: serverProduct.name,
            price: serverProduct.price,
            stock_quantity: serverProduct.stock_quantity,
            barcode: serverProduct.barcode,
            category: serverProduct.category,
            is_active: serverProduct.is_active ? 1 : 0,
            last_updated: serverProduct.updated_at
          });
        }
      }

      console.log(`✅ Updated ${serverProducts.length} products locally`);
    } catch (error) {
      console.error('❌ Failed to update local products:', error);
      throw error;
    }
  }

  // Resolve synchronization conflicts
  async resolveConflicts() {
    try {
      console.log('🔄 Resolving synchronization conflicts...');

      // This is a simplified conflict resolution
      // In a real app, you'd implement more sophisticated conflict resolution
      
      const conflicts = await LocalDatabaseService.select(
        'products', 'last_updated < datetime("now", "-1 day")'
      );

      if (conflicts.length > 0) {
        console.log(`📋 Found ${conflicts.length} potential conflicts`);
        // Mark for manual review or apply business rules
      }

      console.log('✅ Conflict resolution completed');
    } catch (error) {
      console.error('❌ Conflict resolution failed:', error);
    }
  }

  // Update sync statistics
  updateSyncStats(success, duration, recordsProcessed) {
    this.syncStats.totalSyncs++;
    
    if (success) {
      this.syncStats.successfulSyncs++;
    } else {
      this.syncStats.failedSyncs++;
    }
    
    this.syncStats.lastSyncDuration = duration;
    this.syncStats.recordsProcessed += recordsProcessed;

    // Emit statistics update
    this.emit('statsUpdated', this.syncStats);
  }

  // Get sync status
  getSyncStatus() {
    return {
      isInitialized: this.isInitialized,
      isAutoSyncEnabled: this.isAutoSyncEnabled,
      isSyncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      networkConnected: NetworkService.isConnected,
      stats: this.syncStats,
      configuration: this.configuration
    };
  }

  // Enable/disable auto sync
  setAutoSyncEnabled(enabled) {
    this.isAutoSyncEnabled = enabled;
    
    if (enabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }

    this.emit('autoSyncChanged', { enabled });
  }

  // Force full synchronization
  async forceFullSync() {
    console.log('🚀 Force full synchronization requested');
    return await this.performFullSync();
  }

  // Get sync queue statistics
  getQueueStats() {
    return SyncQueueService.getQueueStats();
  }

  // Cleanup
  async destroy() {
    console.log('🧹 Destroying Sync Engine...');
    
    this.stopAutoSync();
    NetworkService.stopMonitoring();
    SyncQueueService.destroy();
    
    this.removeAllListeners();
    this.isInitialized = false;
    
    console.log('✅ Sync Engine destroyed');
  }
}

export default new SyncEngine();