// Local SQLite Database Service for Offline-First POS
import SQLite from 'react-native-sqlite-storage';
import { Platform } from 'react-native';

// Enable SQLite debug mode in development
SQLite.DEBUG(Platform.OS === 'development');
SQLite.enablePromise(true);

class LocalDatabaseService {
  constructor() {
    this.db = null;
    this.dbName = 'luminan_pos_offline.db';
  }

  // Initialize database and create tables
  async initialize() {
    try {
      console.log('🗄️ Initializing Local SQLite Database...');
      
      this.db = await SQLite.openDatabase({
        name: this.dbName,
        location: 'default',
      });

      await this.createTables();
      console.log('✅ Local Database Initialized Successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Database Initialization Failed:', error);
      throw error;
    }
  }

  // Create all necessary tables for offline operation
  async createTables() {
    const tables = [
      // Products table
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT UNIQUE,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        cost_price REAL DEFAULT 0,
        barcode TEXT,
        category TEXT,
        stock_quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        last_updated TEXT,
        sync_status TEXT DEFAULT 'synced',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Sales table
      `CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT UNIQUE,
        total_amount REAL NOT NULL,
        payment_method TEXT,
        cashier_id TEXT,
        shop_id TEXT,
        customer_name TEXT,
        sale_date TEXT,
        status TEXT DEFAULT 'completed',
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Sale items table
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (sale_id) REFERENCES sales (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // Stock movements table
      `CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT UNIQUE,
        product_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        previous_quantity INTEGER,
        new_quantity INTEGER,
        reason TEXT,
        user_id TEXT,
        shop_id TEXT,
        movement_date TEXT,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // Cashier orders table
      `CREATE TABLE IF NOT EXISTS cashier_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT UNIQUE,
        cashier_id TEXT NOT NULL,
        order_type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Sync queue table
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        operation_type TEXT NOT NULL,
        data TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_retry TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Sync log table
      `CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_type TEXT NOT NULL,
        status TEXT NOT NULL,
        records_processed INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        error_message TEXT,
        sync_started TEXT,
        sync_completed TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    ];

    for (const tableSQL of tables) {
      await this.db.executeSql(tableSQL);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_server_id ON products(server_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_sales_server_id ON sales(server_id)',
      'CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name)'
    ];

    for (const indexSQL of indexes) {
      await this.db.executeSql(indexSQL);
    }

    console.log('✅ Database tables and indexes created');
  }

  // Generic CRUD operations
  async insert(table, data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
      const result = await this.db.executeSql(sql, values);
      
      console.log(`✅ Inserted into ${table}:`, data);
      return result;
    } catch (error) {
      console.error(`❌ Insert failed for ${table}:`, error);
      throw error;
    }
  }

  async update(table, data, whereClause, whereParams = []) {
    try {
      const keys = Object.keys(data);
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), ...whereParams];
      
      const sql = `UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE ${whereClause}`;
      const result = await this.db.executeSql(sql, values);
      
      console.log(`✅ Updated ${table}:`, data);
      return result;
    } catch (error) {
      console.error(`❌ Update failed for ${table}:`, error);
      throw error;
    }
  }

  async delete(table, whereClause, whereParams = []) {
    try {
      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
      const result = await this.db.executeSql(sql, whereParams);
      
      console.log(`✅ Deleted from ${table}:`, whereClause);
      return result;
    } catch (error) {
      console.error(`❌ Delete failed for ${table}:`, error);
      throw error;
    }
  }

  async select(table, whereClause = '1=1', whereParams = [], columns = '*') {
    try {
      const sql = `SELECT ${columns} FROM ${table} WHERE ${whereClause}`;
      const [result] = await this.db.executeSql(sql, whereParams);
      
      const data = [];
      for (let i = 0; i < result.rows.length; i++) {
        data.push(result.rows.item(i));
      }
      
      return data;
    } catch (error) {
      console.error(`❌ Select failed for ${table}:`, error);
      throw error;
    }
  }

  // Product-specific operations
  async getProducts(limit = 100, offset = 0) {
    const sql = `SELECT * FROM products WHERE is_active = 1 ORDER BY name LIMIT ? OFFSET ?`;
    const [result] = await this.db.executeSql(sql, [limit, offset]);
    
    const products = [];
    for (let i = 0; i < result.rows.length; i++) {
      products.push(result.rows.item(i));
    }
    return products;
  }

  async getProductByBarcode(barcode) {
    const products = await this.select('products', 'barcode = ? AND is_active = 1', [barcode]);
    return products[0] || null;
  }

  async updateProductStock(productId, newQuantity) {
    return await this.update('products', 
      { stock_quantity: newQuantity, last_updated: new Date().toISOString() },
      'id = ?', [productId]
    );
  }

  // Sales operations
  async createSale(saleData, items) {
    try {
      await this.db.executeSql('BEGIN TRANSACTION');
      
      // Insert sale
      const saleResult = await this.insert('sales', saleData);
      const saleId = saleResult.insertId;
      
      // Insert sale items and update stock
      for (const item of items) {
        await this.insert('sale_items', {
          ...item,
          sale_id: saleId
        });
        
        // Update product stock
        await this.updateProductStock(item.product_id, item.new_quantity);
      }
      
      await this.db.executeSql('COMMIT');
      console.log('✅ Sale created successfully:', saleId);
      return saleId;
    } catch (error) {
      await this.db.executeSql('ROLLBACK');
      console.error('❌ Sale creation failed:', error);
      throw error;
    }
  }

  // Sync queue operations
  async addToSyncQueue(table, recordId, operationType, data) {
    return await this.insert('sync_queue', {
      table_name: table,
      record_id: recordId,
      operation_type: operationType,
      data: JSON.stringify(data),
      status: 'pending'
    });
  }

  async getPendingSyncItems(limit = 50) {
    return await this.select('sync_queue', 
      'status = ?', ['pending'], 
      '*'
    );
  }

  async markSyncItemCompleted(id) {
    return await this.update('sync_queue', 
      { status: 'completed' },
      'id = ?', [id]
    );
  }

  async markSyncItemFailed(id, errorMessage) {
    return await this.update('sync_queue', 
      { 
        status: 'failed',
        retry_count: 'retry_count + 1',
        last_retry: new Date().toISOString()
      },
      'id = ?', [id]
    );
  }

  // Database maintenance
  async getDatabaseSize() {
    const [result] = await this.db.executeSql("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");
    return result.rows.item(0).size;
  }

  async cleanup() {
    // Clean old sync log entries (keep last 30 days)
    await this.db.executeSql("DELETE FROM sync_log WHERE created_at < datetime('now', '-30 days')");
    
    // Clean completed sync queue entries older than 7 days
    await this.db.executeSql("DELETE FROM sync_queue WHERE status = 'completed' AND created_at < datetime('now', '-7 days')");
    
    console.log('✅ Database cleanup completed');
  }

  // Close database connection
  async close() {
    if (this.db) {
      await this.db.close();
      console.log('✅ Database connection closed');
    }
  }
}

export default new LocalDatabaseService();