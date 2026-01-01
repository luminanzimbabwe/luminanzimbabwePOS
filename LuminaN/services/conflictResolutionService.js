// Conflict Resolution Service for Offline-First POS
import LocalDatabaseService from './localDatabase.js';
import { EventEmitter } from 'react-native';

class ConflictResolutionService extends EventEmitter {
  constructor() {
    super();
    this.conflictStrategies = {
      products: 'server_wins', // Server data takes precedence for products
      sales: 'local_wins',     // Local sales data takes precedence
      stock_movements: 'timestamp_wins', // Latest timestamp wins
      cashier_orders: 'server_wins' // Server data takes precedence
    };
    this.conflictLog = [];
  }

  // Detect and resolve conflicts
  async detectAndResolveConflicts() {
    try {
      console.log('🔍 Detecting synchronization conflicts...');

      const conflicts = await this.findConflicts();
      
      if (conflicts.length === 0) {
        console.log('✅ No conflicts detected');
        return { resolved: 0, conflicts: [] };
      }

      console.log(`📋 Found ${conflicts.length} conflicts to resolve`);

      const resolutionResults = [];
      
      for (const conflict of conflicts) {
        try {
          const result = await this.resolveConflict(conflict);
          resolutionResults.push(result);
        } catch (error) {
          console.error(`❌ Failed to resolve conflict ${conflict.id}:`, error);
          resolutionResults.push({
            conflictId: conflict.id,
            success: false,
            error: error.message
          });
        }
      }

      // Log resolution results
      await this.logConflictResolutions(resolutionResults);

      console.log(`✅ Resolved ${resolutionResults.filter(r => r.success).length} conflicts`);

      // Emit resolution completed event
      this.emit('conflictsResolved', {
        totalConflicts: conflicts.length,
        resolved: resolutionResults.filter(r => r.success).length,
        failed: resolutionResults.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      });

      return {
        resolved: resolutionResults.filter(r => r.success).length,
        failed: resolutionResults.filter(r => !r.success).length,
        conflicts: resolutionResults
      };

    } catch (error) {
      console.error('❌ Conflict detection and resolution failed:', error);
      throw error;
    }
  }

  // Find potential conflicts in the database
  async findConflicts() {
    const conflicts = [];

    try {
      // Check for product conflicts
      const productConflicts = await this.findProductConflicts();
      conflicts.push(...productConflicts);

      // Check for sales conflicts
      const salesConflicts = await this.findSalesConflicts();
      conflicts.push(...salesConflicts);

      // Check for stock movement conflicts
      const stockConflicts = await this.findStockMovementConflicts();
      conflicts.push(...stockConflicts);

      // Check for cashier order conflicts
      const orderConflicts = await this.findCashierOrderConflicts();
      conflicts.push(...orderConflicts);

      return conflicts;
    } catch (error) {
      console.error('❌ Failed to find conflicts:', error);
      return conflicts;
    }
  }

  // Find product conflicts
  async findProductConflicts() {
    try {
      // Find products that have both local and server versions with different data
      const sql = `
        SELECT p1.*, p2.* 
        FROM products p1, products p2 
        WHERE p1.server_id = p2.server_id 
        AND p1.id != p2.id 
        AND (
          p1.name != p2.name OR 
          p1.price != p2.price OR 
          p1.stock_quantity != p2.stock_quantity
        )
      `;

      const [result] = await LocalDatabaseService.db.executeSql(sql);
      const conflicts = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        conflicts.push({
          id: `product_${row.server_id}`,
          type: 'product',
          localRecord: {
            id: row.id,
            name: row.name,
            price: row.price,
            stock_quantity: row.stock_quantity,
            last_updated: row.last_updated
          },
          serverRecord: {
            id: row.server_id,
            name: row.name_2,
            price: row.price_2,
            stock_quantity: row.stock_quantity_2,
            last_updated: row.last_updated_2
          },
          conflictFields: this.getConflictFields(row)
        });
      }

      return conflicts;
    } catch (error) {
      console.error('❌ Failed to find product conflicts:', error);
      return [];
    }
  }

  // Find sales conflicts
  async findSalesConflicts() {
    try {
      // Find sales with same server_id but different data
      const sql = `
        SELECT s1.*, s2.* 
        FROM sales s1, sales s2 
        WHERE s1.server_id = s2.server_id 
        AND s1.id != s2.id 
        AND (
          s1.total_amount != s2.total_amount OR 
          s1.payment_method != s2.payment_method
        )
      `;

      const [result] = await LocalDatabaseService.db.executeSql(sql);
      const conflicts = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        conflicts.push({
          id: `sale_${row.server_id}`,
          type: 'sale',
          localRecord: {
            id: row.id,
            total_amount: row.total_amount,
            payment_method: row.payment_method,
            sale_date: row.sale_date
          },
          serverRecord: {
            id: row.server_id,
            total_amount: row.total_amount_2,
            payment_method: row.payment_method_2,
            sale_date: row.sale_date_2
          },
          conflictFields: this.getConflictFields(row)
        });
      }

      return conflicts;
    } catch (error) {
      console.error('❌ Failed to find sales conflicts:', error);
      return [];
    }
  }

  // Find stock movement conflicts
  async findStockMovementConflicts() {
    try {
      const sql = `
        SELECT sm1.*, sm2.* 
        FROM stock_movements sm1, stock_movements sm2 
        WHERE sm1.server_id = sm2.server_id 
        AND sm1.id != sm2.id 
        AND sm1.movement_date != sm2.movement_date
      `;

      const [result] = await LocalDatabaseService.db.executeSql(sql);
      const conflicts = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        conflicts.push({
          id: `stock_${row.server_id}`,
          type: 'stock_movement',
          localRecord: {
            id: row.id,
            quantity: row.quantity,
            movement_date: row.movement_date,
            movement_type: row.movement_type
          },
          serverRecord: {
            id: row.server_id,
            quantity: row.quantity_2,
            movement_date: row.movement_date_2,
            movement_type: row.movement_type_2
          },
          conflictFields: this.getConflictFields(row)
        });
      }

      return conflicts;
    } catch (error) {
      console.error('❌ Failed to find stock movement conflicts:', error);
      return [];
    }
  }

  // Find cashier order conflicts
  async findCashierOrderConflicts() {
    try {
      const sql = `
        SELECT co1.*, co2.* 
        FROM cashier_orders co1, cashier_orders co2 
        WHERE co1.server_id = co2.server_id 
        AND co1.id != co2.id 
        AND co1.amount != co2.amount
      `;

      const [result] = await LocalDatabaseService.db.executeSql(sql);
      const conflicts = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        conflicts.push({
          id: `order_${row.server_id}`,
          type: 'cashier_order',
          localRecord: {
            id: row.id,
            amount: row.amount,
            status: row.status,
            order_type: row.order_type
          },
          serverRecord: {
            id: row.server_id,
            amount: row.amount_2,
            status: row.status_2,
            order_type: row.order_type_2
          },
          conflictFields: this.getConflictFields(row)
        });
      }

      return conflicts;
    } catch (error) {
      console.error('❌ Failed to find cashier order conflicts:', error);
      return [];
    }
  }

  // Get conflict fields from database row
  getConflictFields(row) {
    const fields = [];
    const keys = Object.keys(row);
    
    for (const key of keys) {
      if (key.includes('_2')) {
        const baseField = key.replace('_2', '');
        const localValue = row[baseField];
        const serverValue = row[key];
        
        if (localValue !== serverValue) {
          fields.push(baseField);
        }
      }
    }
    
    return fields;
  }

  // Resolve individual conflict
  async resolveConflict(conflict) {
    try {
      console.log(`🔄 Resolving conflict: ${conflict.type} ${conflict.id}`);

      const strategy = this.conflictStrategies[conflict.type] || 'server_wins';
      let resolvedData = {};

      // Apply resolution strategy
      switch (strategy) {
        case 'server_wins':
          resolvedData = this.applyServerWinsStrategy(conflict);
          break;
        case 'local_wins':
          resolvedData = this.applyLocalWinsStrategy(conflict);
          break;
        case 'timestamp_wins':
          resolvedData = this.applyTimestampWinsStrategy(conflict);
          break;
        case 'merge':
          resolvedData = this.applyMergeStrategy(conflict);
          break;
        default:
          resolvedData = this.applyServerWinsStrategy(conflict);
      }

      // Update local database with resolved data
      await this.updateLocalRecord(conflict.type, resolvedData);

      // Log the resolution
      await this.logConflictResolution(conflict, resolvedData, strategy);

      console.log(`✅ Resolved conflict: ${conflict.id} using ${strategy} strategy`);

      return {
        conflictId: conflict.id,
        type: conflict.type,
        strategy: strategy,
        success: true,
        resolvedData,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to resolve conflict ${conflict.id}:`, error);
      throw error;
    }
  }

  // Server wins strategy - server data takes precedence
  applyServerWinsStrategy(conflict) {
    const serverRecord = conflict.serverRecord;
    
    // Remove server_id from the data for database update
    const { server_id, ...updateData } = serverRecord;
    
    return updateData;
  }

  // Local wins strategy - local data takes precedence
  applyLocalWinsStrategy(conflict) {
    const localRecord = conflict.localRecord;
    
    // Update server_id for identification
    return {
      ...localRecord,
      server_id: conflict.serverRecord.id
    };
  }

  // Timestamp wins strategy - latest timestamp wins
  applyTimestampWinsStrategy(conflict) {
    const localTime = new Date(conflict.localRecord.last_updated || conflict.localRecord.movement_date);
    const serverTime = new Date(conflict.serverRecord.last_updated || conflict.serverRecord.movement_date);
    
    if (serverTime > localTime) {
      return this.applyServerWinsStrategy(conflict);
    } else {
      return this.applyLocalWinsStrategy(conflict);
    }
  }

  // Merge strategy - intelligent merging of data
  applyMergeStrategy(conflict) {
    const localRecord = conflict.localRecord;
    const serverRecord = conflict.serverRecord;
    
    // For products, merge non-conflicting fields
    if (conflict.type === 'product') {
      return {
        name: serverRecord.name || localRecord.name,
        price: serverRecord.price || localRecord.price,
        stock_quantity: localRecord.stock_quantity, // Keep local stock as it's more accurate
        barcode: serverRecord.barcode || localRecord.barcode,
        category: serverRecord.category || localRecord.category,
        last_updated: new Date().toISOString()
      };
    }
    
    // Default to server wins for other types
    return this.applyServerWinsStrategy(conflict);
  }

  // Update local record with resolved data
  async updateLocalRecord(type, resolvedData) {
    try {
      const tableName = this.getTableName(type);
      const whereClause = 'server_id = ?';
      const whereParams = [resolvedData.server_id];

      // Remove server_id from update data
      const { server_id, ...updateData } = resolvedData;
      updateData.updated_at = new Date().toISOString();

      await LocalDatabaseService.update(tableName, updateData, whereClause, whereParams);
      
      console.log(`✅ Updated local ${type} record with resolved data`);
    } catch (error) {
      console.error(`❌ Failed to update local ${type} record:`, error);
      throw error;
    }
  }

  // Get table name from conflict type
  getTableName(type) {
    const tableMap = {
      'product': 'products',
      'sale': 'sales',
      'stock_movement': 'stock_movements',
      'cashier_order': 'cashier_orders'
    };
    
    return tableMap[type] || type;
  }

  // Log conflict resolution
  async logConflictResolution(conflict, resolvedData, strategy) {
    try {
      const logEntry = {
        conflict_id: conflict.id,
        conflict_type: conflict.type,
        strategy_used: strategy,
        conflict_fields: JSON.stringify(conflict.conflictFields),
        resolved_data: JSON.stringify(resolvedData),
        resolution_timestamp: new Date().toISOString()
      };

      await LocalDatabaseService.insert('conflict_resolution_log', logEntry);
      
      // Also keep in memory for quick access
      this.conflictLog.push(logEntry);
      
      console.log(`📝 Logged conflict resolution: ${conflict.id}`);
    } catch (error) {
      console.error('❌ Failed to log conflict resolution:', error);
    }
  }

  // Log multiple conflict resolutions
  async logConflictResolutions(resolutionResults) {
    try {
      const logEntry = {
        batch_id: `batch_${Date.now()}`,
        total_conflicts: resolutionResults.length,
        successful_resolutions: resolutionResults.filter(r => r.success).length,
        failed_resolutions: resolutionResults.filter(r => !r.success).length,
        resolution_details: JSON.stringify(resolutionResults),
        timestamp: new Date().toISOString()
      };

      await LocalDatabaseService.insert('conflict_resolution_batch_log', logEntry);
      
      console.log(`📝 Logged conflict resolution batch`);
    } catch (error) {
      console.error('❌ Failed to log conflict resolution batch:', error);
    }
  }

  // Get conflict resolution history
  async getConflictHistory(limit = 100) {
    try {
      return await LocalDatabaseService.select(
        'conflict_resolution_batch_log',
        '1=1',
        [],
        '*'
      );
    } catch (error) {
      console.error('❌ Failed to get conflict history:', error);
      return [];
    }
  }

  // Set conflict resolution strategy for a data type
  setConflictStrategy(dataType, strategy) {
    if (this.conflictStrategies[dataType]) {
      this.conflictStrategies[dataType] = strategy;
      console.log(`📋 Updated conflict strategy for ${dataType}: ${strategy}`);
    } else {
      console.warn(`⚠️ Unknown data type: ${dataType}`);
    }
  }

  // Get current conflict strategies
  getConflictStrategies() {
    return { ...this.conflictStrategies };
  }

  // Manual conflict resolution (for user intervention)
  async resolveConflictManually(conflictId, resolution, userId = 'system') {
    try {
      console.log(`👤 Manual conflict resolution requested: ${conflictId}`);

      // This would typically involve UI interaction
      // For now, we'll implement basic manual resolution
      
      const logEntry = {
        conflict_id: conflictId,
        manual_resolution: JSON.stringify(resolution),
        resolved_by: userId,
        timestamp: new Date().toISOString()
      };

      await LocalDatabaseService.insert('manual_conflict_resolutions', logEntry);
      
      console.log(`✅ Manual conflict resolution logged: ${conflictId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Manual conflict resolution failed:', error);
      throw error;
    }
  }

  // Get unresolved conflicts count
  async getUnresolvedConflictsCount() {
    try {
      // This would check for conflicts that haven't been resolved yet
      // Implementation depends on how you track unresolved conflicts
      return 0; // Placeholder
    } catch (error) {
      console.error('❌ Failed to get unresolved conflicts count:', error);
      return 0;
    }
  }
}

export default new ConflictResolutionService();