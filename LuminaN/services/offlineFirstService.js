// Offline-First Integration Service for POS Screens
import LocalDatabaseService from './localDatabase.js';
import NetworkService from './networkService.js';
import SyncEngine from './syncEngine.js';
import ConflictResolutionService from './conflictResolutionService.js';
import { EventEmitter } from 'react-native';

class OfflineFirstService extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.isOnline = false;
    this.syncStatus = {
      isOnline: false,
      lastSync: null,
      pendingItems: 0,
      syncInProgress: false
    };
    this.offlineOperations = new Map();
  }

  // Initialize the complete offline-first system
  async initialize() {
    try {
      console.log('🚀 Initializing Offline-First POS System...');

      // Initialize all services
      await LocalDatabaseService.initialize();
      await NetworkService.startMonitoring();
      await SyncEngine.initialize();
      await ConflictResolutionService.initialize();

      // Setup event listeners
      this.setupEventListeners();

      // Start the sync engine
      await SyncEngine.initialize();

      this.isInitialized = true;
      this.isOnline = NetworkService.isConnected;

      console.log('✅ Offline-First System Initialized Successfully');

      // Emit initialization event
      this.emit('systemInitialized', {
        timestamp: new Date().toISOString(),
        isOnline: this.isOnline
      });

      return true;
    } catch (error) {
      console.error('❌ Offline-First System initialization failed:', error);
      throw error;
    }
  }

  // Setup event listeners for the entire system
  setupEventListeners() {
    // Network connectivity changes
    NetworkService.onNetworkChange((networkInfo) => {
      this.isOnline = networkInfo.isConnected;
      this.updateSyncStatus({ isOnline: networkInfo.isConnected });
      
      this.emit('networkChanged', {
        isOnline: networkInfo.isConnected,
        connectionType: networkInfo.connectionType
      });
    });

    // Sync engine events
    SyncEngine.on('syncStarted', () => {
      this.updateSyncStatus({ syncInProgress: true });
      this.emit('syncStarted');
    });

    SyncEngine.on('syncCompleted', (result) => {
      this.updateSyncStatus({ 
        syncInProgress: false, 
        lastSync: new Date().toISOString() 
      });
      this.emit('syncCompleted', result);
    });

    SyncEngine.on('syncFailed', (error) => {
      this.updateSyncStatus({ syncInProgress: false });
      this.emit('syncFailed', error);
    });

    // Sync queue events
    SyncEngine.on('queueStatsUpdated', (stats) => {
      this.updateSyncStatus({ pendingItems: stats.pending });
      this.emit('syncQueueUpdated', stats);
    });

    // App lifecycle events
    this.setupAppLifecycleListeners();
  }

  // Setup app lifecycle event listeners
  setupAppLifecycleListeners() {
    // In a real app, you'd listen to AppState changes
    // For now, we'll simulate basic lifecycle events
    
    // Focus events (when user returns to the app)
    this.on('appFocus', () => {
      console.log('📱 App focused - checking sync status');
      this.checkAndSync();
    });

    // Background events (when app goes to background)
    this.on('appBackground', () => {
      console.log('📱 App backgrounded - stopping sync');
      // Don't stop sync completely, but pause immediate processing
    });
  }

  // Update sync status and emit changes
  updateSyncStatus(updates) {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.emit('syncStatusChanged', this.syncStatus);
  }

  // Get current sync status
  getSyncStatus() {
    return {
      ...this.syncStatus,
      isInitialized: this.isInitialized
    };
  }

  // Check connectivity and perform sync if needed
  async checkAndSync() {
    if (!this.isInitialized) {
      console.log('⚠️ Offline-first system not initialized');
      return;
    }

    if (this.isOnline && !this.syncStatus.syncInProgress) {
      console.log('🌐 Online and not syncing - triggering sync');
      try {
        await SyncEngine.triggerImmediateSync();
      } catch (error) {
        console.error('❌ Manual sync failed:', error);
      }
    }
  }

  // Enhanced product loading with offline support
  async loadProducts(options = {}) {
    try {
      const {
        useLocal = !this.isOnline,
        limit = 100,
        offset = 0,
        forceRefresh = false
      } = options;

      console.log(`📦 Loading products (useLocal: ${useLocal}, online: ${this.isOnline})`);

      if (useLocal || !this.isOnline) {
        // Load from local database
        console.log('💾 Loading products from local database...');
        const products = await LocalDatabaseService.getProducts(limit, offset);
        
        // Also add to sync queue if this was a manual refresh
        if (forceRefresh && this.isOnline) {
          // Queue a sync to get fresh data from server
          console.log('🔄 Queueing sync to refresh local data...');
        }

        return {
          products,
          source: 'local',
          timestamp: new Date().toISOString()
        };
      } else {
        // Try to load from server, fallback to local if it fails
        try {
          // Import API service dynamically to avoid circular dependencies
          const { shopAPI } = await import('./api.js');
          
          console.log('🌐 Loading products from server...');
          const response = await shopAPI.getProducts();
          const products = response.data || [];

          // Update local database with fresh data
          await this.updateLocalProducts(products);

          // Add successful server load to sync log
          await LocalDatabaseService.insert('sync_log', {
            sync_type: 'products_load',
            status: 'success',
            records_processed: products.length,
            sync_completed: new Date().toISOString()
          });

          return {
            products,
            source: 'server',
            timestamp: new Date().toISOString()
          };
        } catch (serverError) {
          console.log('⚠️ Server load failed, falling back to local:', serverError);
          
          // Fallback to local database
          const products = await LocalDatabaseService.getProducts(limit, offset);
          
          return {
            products,
            source: 'local_fallback',
            timestamp: new Date().toISOString(),
            error: serverError.message
          };
        }
      }
    } catch (error) {
      console.error('❌ Product loading failed:', error);
      
      // Last resort: try local database
      try {
        const products = await LocalDatabaseService.getProducts(limit, offset);
        return {
          products,
          source: 'emergency_local',
          timestamp: new Date().toISOString(),
          error: error.message
        };
      } catch (localError) {
        console.error('❌ Even local database failed:', localError);
        throw new Error('Unable to load products - both server and local failed');
      }
    }
  }

  // Update local products database
  async updateLocalProducts(serverProducts) {
    try {
      console.log(`📥 Updating ${serverProducts.length} products in local database...`);

      for (const serverProduct of serverProducts) {
        const existingProduct = await LocalDatabaseService.select(
          'products', 'server_id = ?', [serverProduct.id?.toString()]
        );

        if (existingProduct.length > 0) {
          // Update existing product
          await LocalDatabaseService.update('products',
            {
              name: serverProduct.name,
              price: serverProduct.price,
              cost_price: serverProduct.cost_price,
              stock_quantity: serverProduct.stock_quantity,
              barcode: serverProduct.barcode,
              category: serverProduct.category,
              is_active: serverProduct.is_active ? 1 : 0,
              last_updated: serverProduct.updated_at || new Date().toISOString()
            },
            'server_id = ?', [serverProduct.id?.toString()]
          );
        } else {
          // Insert new product
          await LocalDatabaseService.insert('products', {
            server_id: serverProduct.id?.toString(),
            name: serverProduct.name,
            price: serverProduct.price,
            cost_price: serverProduct.cost_price,
            stock_quantity: serverProduct.stock_quantity,
            barcode: serverProduct.barcode,
            category: serverProduct.category,
            is_active: serverProduct.is_active ? 1 : 0,
            last_updated: serverProduct.updated_at || new Date().toISOString()
          });
        }
      }

      console.log('✅ Local products database updated successfully');
    } catch (error) {
      console.error('❌ Failed to update local products:', error);
      throw error;
    }
  }

  // Enhanced sales loading with offline support
  async loadSales(options = {}) {
    try {
      const {
        useLocal = !this.isOnline,
        cashierId = null,
        dateFilter = null,
        limit = 50
      } = options;

      console.log(`💰 Loading sales (useLocal: ${useLocal}, online: ${this.isOnline})`);

      if (useLocal || !this.isOnline) {
        // Load from local database
        console.log('💾 Loading sales from local database...');
        
        let whereClause = '1=1';
        const whereParams = [];

        if (cashierId) {
          whereClause += ' AND cashier_id = ?';
          whereParams.push(cashierId);
        }

        if (dateFilter) {
          whereClause += ' AND date(created_at) = date(?)';
          whereParams.push(dateFilter);
        }

        const sales = await LocalDatabaseService.select(
          'sales',
          whereClause,
          whereParams,
          '*'
        );

        return {
          sales,
          source: 'local',
          timestamp: new Date().toISOString()
        };
      } else {
        // Try server first, fallback to local
        try {
          const { shopAPI } = await import('./api.js');
          
          console.log('🌐 Loading sales from server...');
          const response = await shopAPI.getSales();
          const sales = response.data?.sales || response.data || [];

          // Update local database
          for (const sale of sales) {
            const existingSale = await LocalDatabaseService.select(
              'sales', 'server_id = ?', [sale.id?.toString()]
            );

            if (existingSale.length === 0) {
              await LocalDatabaseService.insert('sales', {
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

          return {
            sales,
            source: 'server',
            timestamp: new Date().toISOString()
          };
        } catch (serverError) {
          console.log('⚠️ Server sales load failed, falling back to local');
          
          // Fallback to local
          let whereClause = '1=1';
          const whereParams = [];

          if (cashierId) {
            whereClause += ' AND cashier_id = ?';
            whereParams.push(cashierId);
          }

          const sales = await LocalDatabaseService.select('sales', whereClause, whereParams);
          
          return {
            sales,
            source: 'local_fallback',
            timestamp: new Date().toISOString(),
            error: serverError.message
          };
        }
      }
    } catch (error) {
      console.error('❌ Sales loading failed:', error);
      throw error;
    }
  }

  // Create sale with offline support
  async createSale(saleData, items) {
    try {
      console.log('💰 Creating sale with offline support...');

      // Create sale in local database
      const saleId = await LocalDatabaseService.createSale(saleData, items);

      // Add to sync queue for when online
      await LocalDatabaseService.addToSyncQueue(
        'sales',
        saleId,
        'create',
        { ...saleData, id: saleId, items }
      );

      console.log('✅ Sale created successfully (local + sync queued)');

      // Emit sale created event
      this.emit('saleCreated', {
        saleId,
        saleData,
        items,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        saleId,
        synced: this.isOnline,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Sale creation failed:', error);
      throw error;
    }
  }

  // Update product stock with offline support
  async updateProductStock(productId, newQuantity, reason = 'manual_update') {
    try {
      console.log(`📦 Updating product ${productId} stock to ${newQuantity}`);

      // Update local database
      await LocalDatabaseService.updateProductStock(productId, newQuantity);

      // Add to sync queue
      await LocalDatabaseService.addToSyncQueue(
        'products',
        productId,
        'update',
        { stock_quantity: newQuantity, reason }
      );

      // Emit stock update event
      this.emit('stockUpdated', {
        productId,
        newQuantity,
        reason,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Product stock updated (local + sync queued)');

      return {
        success: true,
        synced: this.isOnline,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Stock update failed:', error);
      throw error;
    }
  }

  // Force sync all pending items
  async forceSyncAll() {
    try {
      console.log('🚀 Forcing sync of all pending items...');
      
      if (!this.isOnline) {
        throw new Error('Cannot sync when offline');
      }

      await SyncEngine.forceFullSync();
      
      console.log('✅ Force sync completed');
      
      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      throw error;
    }
  }

  // Get offline operation history
  getOfflineOperations() {
    return Array.from(this.offlineOperations.values());
  }

  // Clear offline operations (after successful sync)
  clearOfflineOperations() {
    this.offlineOperations.clear();
    console.log('🧹 Cleared offline operations history');
  }

  // Get database statistics
  async getDatabaseStats() {
    try {
      const stats = await LocalDatabaseService.updateQueueStats();
      const dbSize = await LocalDatabaseService.getDatabaseSize();
      
      return {
        queueStats: stats,
        databaseSize: dbSize,
        isOnline: this.isOnline,
        lastSync: this.syncStatus.lastSync,
        initialized: this.isInitialized
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return null;
    }
  }

  // Cleanup and shutdown
  async shutdown() {
    try {
      console.log('🛑 Shutting down Offline-First System...');
      
      // Stop all services
      await SyncEngine.destroy();
      NetworkService.stopMonitoring();
      
      // Close database
      await LocalDatabaseService.close();
      
      this.isInitialized = false;
      
      console.log('✅ Offline-First System shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

export default new OfflineFirstService();