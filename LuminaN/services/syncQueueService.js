// Sync Queue Management Service for Offline-First POS
import LocalDatabaseService from './localDatabase.js';
import NetworkService from './networkService.js';
import { EventEmitter } from 'react-native';

class SyncQueueService extends EventEmitter {
  constructor() {
    super();
    this.maxRetries = 5;
    this.retryDelays = [1000, 5000, 15000, 30000, 60000]; // 1s, 5s, 15s, 30s, 1min
    this.batchSize = 10;
    this.isProcessing = false;
    this.processingInterval = null;
    this.queueStats = {
      pending: 0,
      processing: 0,
      failed: 0,
      completed: 0
    };
  }

  // Initialize sync queue service
  async initialize() {
    try {
      console.log('🔄 Initializing Sync Queue Service...');
      
      // Start periodic processing
      this.startPeriodicProcessing();
      
      // Listen to network events
      this.setupNetworkListeners();
      
      console.log('✅ Sync Queue Service Initialized');
      return true;
    } catch (error) {
      console.error('❌ Sync Queue Service initialization failed:', error);
      throw error;
    }
  }

  // Add operation to sync queue
  async addToQueue(tableName, operationType, recordId, data, priority = 'normal') {
    try {
      console.log(`📥 Adding to sync queue: ${tableName}.${operationType}`, { recordId, priority });

      // Prepare sync data
      const syncData = {
        table_name: tableName,
        record_id: recordId,
        operation_type: operationType,
        data: JSON.stringify(data),
        priority: priority,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString()
      };

      // Add to database
      const result = await LocalDatabaseService.insert('sync_queue', syncData);
      const queueId = result.insertId;

      // Update local statistics
      await this.updateQueueStats();

      // Emit event
      this.emit('itemAdded', {
        queueId,
        tableName,
        operationType,
        priority,
        timestamp: new Date().toISOString()
      });

      // Try immediate processing if online
      if (NetworkService.isConnected) {
        this.triggerImmediateProcessing();
      }

      console.log(`✅ Added to sync queue: ${queueId}`);
      return queueId;
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
      throw error;
    }
  }

  // Get items from queue for processing
  async getQueueItems(limit = null) {
    try {
      const limitClause = limit ? `LIMIT ${limit}` : '';
      const sql = `
        SELECT * FROM sync_queue 
        WHERE status IN ('pending', 'failed') 
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'normal' THEN 2 
            WHEN 'low' THEN 3 
          END,
          retry_count ASC,
          created_at ASC
        ${limitClause}
      `;
      
      const [result] = await LocalDatabaseService.db.executeSql(sql);
      const items = [];
      
      for (let i = 0; i < result.rows.length; i++) {
        items.push(result.rows.item(i));
      }
      
      return items;
    } catch (error) {
      console.error('❌ Failed to get queue items:', error);
      throw error;
    }
  }

  // Process sync queue items
  async processQueueItems() {
    if (this.isProcessing) {
      console.log('🔄 Sync processing already in progress');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting sync queue processing...');

    try {
      // Get items to process
      const items = await this.getQueueItems(this.batchSize);
      
      if (items.length === 0) {
        console.log('📭 No items to process in sync queue');
        this.isProcessing = false;
        return;
      }

      console.log(`📦 Processing ${items.length} sync queue items`);

      // Process each item
      let successCount = 0;
      let failCount = 0;

      for (const item of items) {
        try {
          await this.processQueueItem(item);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to process queue item ${item.id}:`, error);
          failCount++;
          
          // Mark as failed and increment retry count
          await this.markQueueItemFailed(item.id, error.message);
        }
      }

      // Update statistics
      await this.updateQueueStats();

      console.log(`✅ Sync processing completed: ${successCount} success, ${failCount} failed`);

      // Emit completion event
      this.emit('processingCompleted', {
        processed: items.length,
        success: successCount,
        failed: failCount,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Sync queue processing failed:', error);
      this.emit('processingError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual queue item
  async processQueueItem(item) {
    try {
      console.log(`🔄 Processing queue item ${item.id}: ${item.table_name}.${item.operation_type}`);

      // Mark as processing
      await this.markQueueItemProcessing(item.id);

      // Parse data
      const data = JSON.parse(item.data);

      // Perform the actual sync operation
      await this.performSyncOperation(item.table_name, item.operation_type, data);

      // Mark as completed
      await this.markQueueItemCompleted(item.id);

      console.log(`✅ Successfully processed queue item ${item.id}`);
    } catch (error) {
      console.error(`❌ Failed to process queue item ${item.id}:`, error);
      throw error;
    }
  }

  // Perform actual sync operation
  async performSyncOperation(tableName, operationType, data) {
    try {
      const serverUrl = 'https://luminanzimbabwepos.onrender.com';
      
      console.log(`🌐 Syncing ${tableName}.${operationType} to server...`);

      let endpoint = '';
      let method = 'POST';
      let payload = data;

      // Determine endpoint and method based on operation
      switch (operationType) {
        case 'create':
          endpoint = `/api/v1/shop/${tableName}/`;
          method = 'POST';
          break;
        case 'update':
          endpoint = `/api/v1/shop/${tableName}/${data.id}/`;
          method = 'PUT';
          break;
        case 'delete':
          endpoint = `/api/v1/shop/${tableName}/${data.id}/`;
          method = 'DELETE';
          break;
        default:
          throw new Error(`Unknown operation type: ${operationType}`);
      }

      // Make API call
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: method !== 'DELETE' ? JSON.stringify(payload) : undefined
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully synced ${tableName}.${operationType}`);

      // Update local record with server ID if needed
      if (result.id && tableName !== 'sync_queue') {
        await LocalDatabaseService.update(tableName, 
          { server_id: result.id.toString() },
          'id = ?', [data.id]
        );
      }

      return result;
    } catch (error) {
      console.error(`❌ Sync operation failed:`, error);
      throw error;
    }
  }

  // Mark queue item as completed
  async markQueueItemCompleted(queueId) {
    await LocalDatabaseService.update('sync_queue', 
      { 
        status: 'completed',
        sync_completed: new Date().toISOString()
      },
      'id = ?', [queueId]
    );
  }

  // Mark queue item as failed
  async markQueueItemFailed(queueId, errorMessage) {
    const item = await LocalDatabaseService.select('sync_queue', 'id = ?', [queueId]);
    if (item.length === 0) return;

    const currentItem = item[0];
    const newRetryCount = currentItem.retry_count + 1;
    const newStatus = newRetryCount >= this.maxRetries ? 'failed' : 'pending';

    await LocalDatabaseService.update('sync_queue', 
      { 
        status: newStatus,
        retry_count: newRetryCount,
        last_retry: new Date().toISOString(),
        error_message: errorMessage
      },
      'id = ?', [queueId]
    );

    if (newStatus === 'failed') {
      console.error(`❌ Queue item ${queueId} permanently failed after ${newRetryCount} retries`);
    }
  }

  // Mark queue item as processing
  async markQueueItemProcessing(queueId) {
    await LocalDatabaseService.update('sync_queue', 
      { 
        status: 'processing',
        processing_started: new Date().toISOString()
      },
      'id = ?', [queueId]
    );
  }

  // Update queue statistics
  async updateQueueStats() {
    try {
      const stats = {};
      const statuses = ['pending', 'processing', 'failed', 'completed'];
      
      for (const status of statuses) {
        const [result] = await LocalDatabaseService.db.executeSql(
          'SELECT COUNT(*) as count FROM sync_queue WHERE status = ?', [status]
        );
        stats[status] = result.rows.item(0).count;
      }

      this.queueStats = stats;
      
      // Emit statistics update
      this.emit('statsUpdated', this.queueStats);
      
      return this.queueStats;
    } catch (error) {
      console.error('❌ Failed to update queue stats:', error);
      return this.queueStats;
    }
  }

  // Start periodic processing
  startPeriodicProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process every 30 seconds
    this.processingInterval = setInterval(() => {
      if (NetworkService.isConnected && !this.isProcessing) {
        this.processQueueItems();
      }
    }, 30000);

    console.log('⏰ Periodic sync processing started (30s interval)');
  }

  // Trigger immediate processing
  triggerImmediateProcessing() {
    setTimeout(() => {
      if (NetworkService.isConnected && !this.isProcessing) {
        this.processQueueItems();
      }
    }, 2000); // Wait 2 seconds before immediate processing
  }

  // Setup network event listeners
  setupNetworkListeners() {
    NetworkService.onConnectionRestored(() => {
      console.log('🔗 Connection restored - triggering immediate sync');
      this.triggerImmediateProcessing();
    });
  }

  // Get queue statistics
  getQueueStats() {
    return this.queueStats;
  }

  // Clear completed items
  async clearCompletedItems(daysOld = 7) {
    try {
      const sql = 'DELETE FROM sync_queue WHERE status = ? AND created_at < datetime("now", ?)';
      await LocalDatabaseService.db.executeSql(sql, ['completed', `-${daysOld} days`]);
      
      console.log(`🧹 Cleared completed sync items older than ${daysOld} days`);
      await this.updateQueueStats();
    } catch (error) {
      console.error('❌ Failed to clear completed items:', error);
    }
  }

  // Force sync all pending items
  async forceSyncAll() {
    console.log('🚀 Force syncing all pending items...');
    
    // Mark all pending items as high priority
    await LocalDatabaseService.update('sync_queue', 
      { priority: 'high' },
      'status = ?', ['pending']
    );
    
    // Trigger immediate processing
    this.triggerImmediateProcessing();
  }

  // Cleanup
  destroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.removeAllListeners();
    console.log('🧹 Sync Queue Service destroyed');
  }
}

export default new SyncQueueService();