/**
 * Local Database Client
 *
 * Platform-specific implementations for local database access.
 *
 * - Desktop: SQLite via better-sqlite3 or sqlite3
 * - Web: IndexedDB (TODO)
 * - Mobile: SQLite via react-native-sqlite-storage (TODO)
 */

import { LocalDbClient } from './types';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Desktop SQLite Client
 *
 * Uses better-sqlite3 for synchronous SQLite operations in Electron/Node.js
 */
export class DesktopSqliteClient implements LocalDbClient {
  private db: any = null; // Will be typed as Database from better-sqlite3
  private dbPath: string;
  private isInitialized: boolean = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Check if the database is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if better-sqlite3 module is available
      const Database = await this.loadBetterSqlite3();
      return Database !== null;
    } catch (error) {
      console.error('[DesktopSqliteClient] Not available:', error);
      return false;
    }
  }

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[DesktopSqliteClient] Already initialized');
      return;
    }

    try {
      const Database = await this.loadBetterSqlite3();
      if (!Database) {
        throw new Error('better-sqlite3 module not found');
      }

      const dbExists = existsSync(this.dbPath);
      this.db = new Database(this.dbPath, {
        // verbose: console.log, // Uncomment for debugging
      });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Initialize schema if database is new
      if (!dbExists) {
        await this.initializeSchema();
      }

      this.isInitialized = true;
      console.log(`[DesktopSqliteClient] Initialized database at: ${this.dbPath}`);
    } catch (error) {
      console.error('[DesktopSqliteClient] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database schema from schema.sql file
   */
  private async initializeSchema(): Promise<void> {
    try {
      // Look for schema.sql in the same directory as the database
      const dbDir = dirname(this.dbPath);
      const schemaPath = join(dbDir, 'schema.sql');

      if (!existsSync(schemaPath)) {
        console.warn(`[DesktopSqliteClient] Schema file not found at ${schemaPath}, skipping schema initialization`);
        return;
      }

      console.log(`[DesktopSqliteClient] Initializing schema from ${schemaPath}`);
      const schemaSql = readFileSync(schemaPath, 'utf-8');

      // Split by semicolons and execute each statement
      // Remove comments and empty statements
      const statements = schemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      // Execute all statements in a transaction for better performance
      this.db.transaction(() => {
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              this.db.exec(statement);
            } catch (error: any) {
              // Some statements might fail if they're part of a multi-statement block
              // Try executing as a prepared statement instead
              try {
                this.db.prepare(statement).run();
              } catch (err: any) {
                // Skip trigger creation errors if tables don't exist yet (order dependency)
                if (!err.message.includes('no such table') && !err.message.includes('already exists')) {
                  console.warn(`[DesktopSqliteClient] Schema statement warning: ${err.message}`);
                }
              }
            }
          }
        }
      })();

      console.log('[DesktopSqliteClient] Schema initialized successfully');
    } catch (error) {
      console.error('[DesktopSqliteClient] Failed to initialize schema:', error);
      // Don't throw - allow database to continue without schema if file is missing
    }
  }

  /**
   * Execute a SELECT query
   */
  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.ensureInitialized();

    try {
      const stmt = this.db.prepare(sql);
      const results = stmt.all(...params);
      return results as T[];
    } catch (error) {
      console.error('[DesktopSqliteClient] Query failed:', error);
      throw error;
    }
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE query
   */
  async execute(sql: string, params: unknown[] = []): Promise<void> {
    this.ensureInitialized();

    try {
      const stmt = this.db.prepare(sql);
      stmt.run(...params);
    } catch (error) {
      console.error('[DesktopSqliteClient] Execute failed:', error);
      throw error;
    }
  }

  /**
   * Execute multiple statements in a transaction
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    this.ensureInitialized();

    const transactionFn = this.db.transaction((cb: () => T) => {
      return cb();
    });

    try {
      return transactionFn(() => {
        // Convert async callback to sync for better-sqlite3
        // Note: better-sqlite3 transactions are synchronous
        // We need to handle this carefully
        return callback() as any;
      });
    } catch (error) {
      console.error('[DesktopSqliteClient] Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('[DesktopSqliteClient] Database closed');
    }
  }

  /**
   * Get the raw database instance
   * Use this for advanced operations
   */
  getRawDb(): any {
    return this.db;
  }

  /**
   * Ensure the database is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  /**
   * Dynamically load better-sqlite3 module
   * This allows the module to work even if better-sqlite3 is not installed
   */
  private async loadBetterSqlite3(): Promise<any> {
    try {
      // Dynamic import for better-sqlite3
      // In Electron/Node.js environment
      const module = await import('better-sqlite3');
      return module.default || module;
    } catch (error) {
      console.error('[DesktopSqliteClient] Failed to load better-sqlite3:', error);
      return null;
    }
  }
}

/**
 * Web IndexedDB Client
 *
 * Implements local database access for web platform using IndexedDB
 * Note: IndexedDB is NoSQL, so this provides a simplified SQL-like wrapper
 */
export class WebIndexedDbClient implements LocalDbClient {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private dbVersion: number;
  private isInitialized: boolean = false;
  private schema: IndexedDBSchema | null = null;

  constructor(dbName: string = 'cpos', dbVersion: number = 1, schema?: IndexedDBSchema) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.schema = schema || null;
  }

  /**
   * Check if IndexedDB is available in browser
   */
  async isAvailable(): Promise<boolean> {
    try {
      return typeof indexedDB !== 'undefined';
    } catch (error) {
      console.error('[WebIndexedDbClient] Not available:', error);
      return false;
    }
  }

  /**
   * Initialize the IndexedDB connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[WebIndexedDbClient] Already initialized');
      return;
    }

    if (!await this.isAvailable()) {
      throw new Error('IndexedDB is not available in this browser');
    }

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
      console.log(`[WebIndexedDbClient] Initialized database: ${this.dbName} v${this.dbVersion}`);
    } catch (error) {
      console.error('[WebIndexedDbClient] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Open the IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[WebIndexedDbClient] Upgrading database schema...');

        // Create object stores based on schema
        if (this.schema) {
          this.createObjectStores(db, this.schema);
        }
      };
    });
  }

  /**
   * Create object stores from schema
   */
  private createObjectStores(db: IDBDatabase, schema: IndexedDBSchema): void {
    for (const [storeName, storeConfig] of Object.entries(schema.stores)) {
      // Skip if store already exists
      if (db.objectStoreNames.contains(storeName)) {
        continue;
      }

      const objectStore = db.createObjectStore(storeName, {
        keyPath: storeConfig.keyPath,
        autoIncrement: storeConfig.autoIncrement || false,
      });

      // Create indexes
      if (storeConfig.indexes) {
        for (const [indexName, indexConfig] of Object.entries(storeConfig.indexes)) {
          objectStore.createIndex(indexName, indexConfig.keyPath, {
            unique: indexConfig.unique || false,
            multiEntry: indexConfig.multiEntry || false,
          });
        }
      }

      console.log(`[WebIndexedDbClient] Created object store: ${storeName}`);
    }
  }

  /**
   * Query data from a store
   * Accepts SQL-like strings: "SELECT * FROM storeName" or "SELECT * FROM storeName WHERE key = ?"
   * Or simple store name: "storeName"
   */
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    this.ensureInitialized();

    // Parse SQL to extract store name
    // Simple parsing: "SELECT * FROM storeName" or just "storeName"
    let storeName: string;
    let queryFilter: any = undefined;

    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      // Parse SQL-like query
      const match = sql.match(/FROM\s+(\w+)/i);
      if (match) {
        storeName = match[1];
      } else {
        throw new Error(`Invalid SQL query: ${sql}`);
      }
    } else {
      // Assume it's just a store name
      storeName = sql.trim();
    }

    // If params provided, use first param as filter value
    if (params && params.length > 0) {
      queryFilter = params[0];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const results: T[] = [];

      let request: IDBRequest;

      if (queryFilter && typeof queryFilter === 'object' && !('lower' in queryFilter)) {
        // Query by index - simple object match
        // Get the first key from the query object
        const [key, value] = Object.entries(queryFilter)[0];

        // Try to use index if available
        try {
          const index = store.index(key);
          request = index.getAll(value as IDBValidKey);
        } catch {
          // Index not found, fall back to full scan
          request = store.getAll();
        }
      } else {
        // Get all or by key range
        request = store.getAll(queryFilter);
      }

      request.onsuccess = () => {
        let data = request.result as T[];

        // If we did a full scan with query filter, filter results
        if (queryFilter && typeof queryFilter === 'object' && !('lower' in queryFilter)) {
          data = data.filter(item => {
            for (const [key, value] of Object.entries(queryFilter)) {
              if ((item as any)[key] !== value) {
                return false;
              }
            }
            return true;
          });
        }

        resolve(data);
      };

      request.onerror = () => {
        reject(new Error(`Query failed: ${request.error?.message}`));
      };
    });
  }

  /**
   * Execute an operation (insert, update, delete)
   * Accepts SQL-like strings:
   * - "INSERT INTO storeName VALUES (?)" - params[0] should be the data object
   * - "UPDATE storeName SET ... WHERE id = ?" - params[0] should be the data object
   * - "DELETE FROM storeName WHERE id = ?" - params[0] should be the key
   * Or simple format: "storeName:operation" where operation is 'add', 'put', or 'delete'
   */
  async execute(sql: string, params?: unknown[]): Promise<void> {
    this.ensureInitialized();

    let storeName: string;
    let operation: 'add' | 'put' | 'delete';
    let data: any;

    // Check if it's a simple format: "storeName:operation"
    if (sql.includes(':')) {
      const [name, op] = sql.split(':');
      storeName = name.trim();
      operation = op.trim() as 'add' | 'put' | 'delete';
      data = params && params.length > 0 ? params[0] : undefined;
    } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
      // Parse INSERT statement
      const match = sql.match(/INSERT\s+INTO\s+(\w+)/i);
      if (match) {
        storeName = match[1];
        operation = 'add';
        data = params && params.length > 0 ? params[0] : undefined;
      } else {
        throw new Error(`Invalid INSERT statement: ${sql}`);
      }
    } else if (sql.trim().toUpperCase().startsWith('UPDATE')) {
      // Parse UPDATE statement
      const match = sql.match(/UPDATE\s+(\w+)/i);
      if (match) {
        storeName = match[1];
        operation = 'put';
        data = params && params.length > 0 ? params[0] : undefined;
      } else {
        throw new Error(`Invalid UPDATE statement: ${sql}`);
      }
    } else if (sql.trim().toUpperCase().startsWith('DELETE')) {
      // Parse DELETE statement
      const match = sql.match(/DELETE\s+FROM\s+(\w+)/i);
      if (match) {
        storeName = match[1];
        operation = 'delete';
        data = params && params.length > 0 ? params[0] : undefined;
      } else {
        throw new Error(`Invalid DELETE statement: ${sql}`);
      }
    } else {
      // Assume it's just a store name, default to 'put' operation
      storeName = sql.trim();
      operation = 'put';
      data = params && params.length > 0 ? params[0] : undefined;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      let request: IDBRequest;
      switch (operation) {
        case 'add':
          request = store.add(data);
          break;
        case 'put':
          request = store.put(data);
          break;
        case 'delete':
          request = store.delete(data);
          break;
        default:
          reject(new Error(`Unknown operation: ${operation}`));
          return;
      }

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Execute failed: ${request.error?.message}`));
      };
    });
  }

  /**
   * Execute multiple operations in a transaction
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    this.ensureInitialized();

    try {
      // IndexedDB handles transactions automatically
      // Just execute the callback
      return await callback();
    } catch (error) {
      console.error('[WebIndexedDbClient] Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('[WebIndexedDbClient] Database closed');
    }
  }

  /**
   * Get a single record by key
   */
  async getByKey<T>(storeName: string, key: any): Promise<T | undefined> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Get by key failed: ${request.error?.message}`));
      };
    });
  }

  /**
   * Count records in a store
   */
  async count(storeName: string, query?: IDBKeyRange): Promise<number> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count(query);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Count failed: ${request.error?.message}`));
      };
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(storeName: string): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Clear failed: ${request.error?.message}`));
      };
    });
  }

  /**
   * Get the raw IndexedDB instance
   */
  getRawDb(): IDBDatabase | null {
    return this.db;
  }

  /**
   * Ensure the database is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }
}

/**
 * IndexedDB Schema Types
 */
export interface IndexedDBSchema {
  stores: {
    [storeName: string]: {
      keyPath: string;
      autoIncrement?: boolean;
      indexes?: {
        [indexName: string]: {
          keyPath: string | string[];
          unique?: boolean;
          multiEntry?: boolean;
        };
      };
    };
  };
}

/**
 * Mobile SQLite Client (TODO)
 *
 * TODO: Implement for React Native using react-native-sqlite-storage
 * or other mobile SQLite solution
 */
export class MobileSqliteClient implements LocalDbClient {
  async isAvailable(): Promise<boolean> {
    // TODO: Check if react-native-sqlite-storage is available
    console.warn('[MobileSqliteClient] Not implemented yet');
    return false;
  }

  async initialize(): Promise<void> {
    // TODO: Initialize SQLite connection in React Native
    throw new Error('MobileSqliteClient not implemented yet');
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    // TODO: Implement SQLite query for React Native
    throw new Error('MobileSqliteClient not implemented yet');
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    // TODO: Implement SQLite execute for React Native
    throw new Error('MobileSqliteClient not implemented yet');
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    // TODO: Implement SQLite transaction for React Native
    throw new Error('MobileSqliteClient not implemented yet');
  }

  async close(): Promise<void> {
    // TODO: Close SQLite connection
    console.warn('[MobileSqliteClient] Not implemented yet');
  }
}

/**
 * Factory function to create the appropriate local DB client
 * based on the current platform
 */
export function createLocalDbClient(platform: 'desktop' | 'web' | 'mobile', config: any): LocalDbClient {
  switch (platform) {
    case 'desktop':
      return new DesktopSqliteClient(config.dbPath);
    case 'web':
      return new WebIndexedDbClient(config.dbName, config.dbVersion, config.schema);
    case 'mobile':
      // TODO: Return MobileSqliteClient when implemented
      console.warn('[createLocalDbClient] Mobile platform not fully implemented');
      return new MobileSqliteClient();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
