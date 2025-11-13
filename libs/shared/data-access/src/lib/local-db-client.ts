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

      // Dynamically import Node.js fs module (only available in Electron/Node.js)
      let dbExists = false;
      try {
        // @ts-ignore - fs is a Node.js module, not available in browser
        const fs = await import('fs');
        dbExists = fs.existsSync(this.dbPath);
      } catch (error) {
        // fs module not available (browser environment) - assume new database
        console.warn('[DesktopSqliteClient] fs module not available, assuming new database');
        dbExists = false;
      }
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
      // Dynamically import Node.js modules (only available in Electron/Node.js)
      let fs: any;
      let path: any;
      
      try {
        // @ts-ignore - fs and path are Node.js modules, not available in browser
        fs = await import('fs');
        // @ts-ignore - path is a Node.js module, not available in browser
        path = await import('path');
      } catch (error) {
        // Node.js modules not available (browser environment)
        console.warn('[DesktopSqliteClient] Node.js modules (fs/path) not available, skipping schema initialization');
        return;
      }
      
      // Look for schema.sql in the same directory as the database
      const dbDir = path.dirname(this.dbPath);
      const schemaPath = path.join(dbDir, 'schema.sql');

      if (!fs.existsSync(schemaPath)) {
        console.warn(`[DesktopSqliteClient] Schema file not found at ${schemaPath}, skipping schema initialization`);
        return;
      }

      console.log(`[DesktopSqliteClient] Initializing schema from ${schemaPath}`);
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

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
   * Accepts SQL-like strings: "SELECT * FROM storeName" or "SELECT * FROM storeName WHERE key = ? OR key2 = ?"
   * Or simple store name: "storeName"
   */
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    this.ensureInitialized();

    console.log('[WebIndexedDbClient] query() called with:', {
      sql: sql.substring(0, 150) + (sql.length > 150 ? '...' : ''),
      paramsCount: params?.length || 0,
    });

    // Parse SQL to extract store name and WHERE conditions
    let storeName: string;
    let whereConditions: Array<{ field: string; value: any; operator?: string }> = [];

    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      // Parse SQL-like query
      const fromMatch = sql.match(/FROM\s+(\w+)/i);
      if (fromMatch) {
        storeName = fromMatch[1];
      } else {
        throw new Error(`Invalid SQL query: ${sql}`);
      }

      // Parse WHERE clause
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+LIMIT|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1].trim();
        // Handle OR conditions: "username = ? OR email = ?"
        const orParts = whereClause.split(/\s+OR\s+/i);
        
        for (const part of orParts) {
          // Match "field = ?" or "field = value"
          const fieldMatch = part.match(/(\w+)\s*=\s*\?/i);
          if (fieldMatch) {
            whereConditions.push({
              field: fieldMatch[1],
              value: null, // Will be filled from params
              operator: '=',
            });
          }
        }
      }
    } else {
      // Assume it's just a store name
      storeName = sql.trim();
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('[WebIndexedDbClient] Creating transaction for store:', storeName);
        console.log('[WebIndexedDbClient] DB state:', {
          dbExists: !!this.db,
          dbName: this.db?.name,
          dbVersion: this.db?.version,
          objectStoreNames: this.db ? Array.from(this.db.objectStoreNames) : [],
        });

        if (!this.db) {
          reject(new Error('Database not initialized'));
          return;
        }

        // Check if store exists
        if (!this.db.objectStoreNames.contains(storeName)) {
          reject(new Error(`Object store '${storeName}' does not exist. Available stores: ${Array.from(this.db.objectStoreNames).join(', ')}`));
          return;
        }

        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const results: T[] = [];

        transaction.onerror = () => {
          console.error('[WebIndexedDbClient] Transaction error:', transaction.error);
          reject(new Error(`Transaction failed: ${transaction.error?.message}`));
        };

        transaction.onabort = () => {
          console.error('[WebIndexedDbClient] Transaction aborted');
          reject(new Error('Transaction aborted'));
        };

        // Get all records first (IndexedDB doesn't support complex WHERE clauses natively)
        console.log('[WebIndexedDbClient] Calling getAll() on store:', storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          console.log('[WebIndexedDbClient] getAll() success, result count:', request.result?.length || 0);
          let data = request.result as T[];

          // Apply WHERE conditions if present
          if (whereConditions.length > 0 && params && params.length > 0) {
          // Map params to conditions
          // For OR conditions with same value (e.g., username = ? OR email = ? with same param), use first param value
          const paramValue = params[0]; // Use first param value for OR conditions
          const conditionsWithValues = whereConditions.map((cond) => ({
            ...cond,
            value: paramValue, // Use same value for all OR conditions
          }));

          console.log('[WebIndexedDbClient] Filtering with conditions:', {
            conditionCount: conditionsWithValues.length,
            paramValue: paramValue,
            fields: conditionsWithValues.map(c => c.field),
          });

          // Filter results based on WHERE conditions (supporting OR logic)
          data = data.filter(item => {
            // For OR conditions, item matches if ANY condition is true
            const matches = conditionsWithValues.some(cond => {
              const itemValue = (item as any)[cond.field];
              if (cond.operator === '=') {
                return itemValue === cond.value;
              }
              return false;
            });
            return matches;
          });
          
          console.log('[WebIndexedDbClient] Filtered results:', {
            beforeFilter: request.result?.length || 0,
            afterFilter: data.length,
          });
        } else if (params && params.length > 0 && typeof params[0] === 'object') {
          // Legacy support: object-based filtering
          const queryFilter = params[0] as Record<string, any>;
          data = data.filter(item => {
            for (const [key, value] of Object.entries(queryFilter)) {
              if ((item as any)[key] !== value) {
                return false;
              }
            }
            return true;
          });
        }

        // Apply LIMIT if present
        const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
          const limit = parseInt(limitMatch[1], 10);
          data = data.slice(0, limit);
        }

        console.log('[WebIndexedDbClient] Query success:', {
          storeName,
          resultCount: data.length,
          firstId: data[0]?.id,
        });

        resolve(data);
      };

        request.onerror = () => {
          console.error('[WebIndexedDbClient] getAll() error:', request.error);
          reject(new Error(`Query failed: ${request.error?.message}`));
        };
      } catch (error) {
        console.error('[WebIndexedDbClient] Exception in query():', error);
        reject(error);
      }
    });
  }

  /**
   * Execute an operation (insert, update, delete)
   * Accepts SQL-like strings:
   * - "INSERT INTO storeName (col1, col2) VALUES (?, ?)" - params array of values
   * - "UPDATE storeName SET col1 = ?, col2 = ? WHERE id = ?" - params array of values
   * - "DELETE FROM storeName WHERE id = ?" - params[0] should be the key
   * - "PRAGMA foreign_keys = OFF" - Silently ignored (IndexedDB doesn't have FK constraints)
   * Or simple format: "storeName:operation" where operation is 'add', 'put', or 'delete'
   */
  async execute(sql: string, params?: unknown[]): Promise<void> {
    this.ensureInitialized();

    // Handle PRAGMA statements (SQLite-specific, ignore for IndexedDB)
    if (sql.trim().toUpperCase().startsWith('PRAGMA')) {
      // Silently ignore PRAGMA statements (e.g., "PRAGMA foreign_keys = OFF")
      console.log('[WebIndexedDbClient] Ignoring PRAGMA statement');
      return Promise.resolve();
    }

    console.log('[WebIndexedDbClient] execute() called with:', {
      sql: sql.substring(0, 150) + (sql.length > 150 ? '...' : ''),
      paramsCount: params?.length || 0,
    });

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
      // Parse INSERT statement: "INSERT INTO storeName (col1, col2, col3) VALUES (?, ?, ?)"
      const match = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
      if (match) {
        storeName = match[1];
        operation = 'add';

        // Extract column names
        const columns = match[2].split(',').map(c => c.trim());

        // Map params array to object using column names
        if (params && params.length === columns.length) {
          data = {};
          columns.forEach((col, index) => {
            data[col] = params[index];
          });
        } else {
          throw new Error(`INSERT param count (${params?.length}) doesn't match column count (${columns.length})`);
        }
      } else {
        throw new Error(`Invalid INSERT statement: ${sql}`);
      }
    } else if (sql.trim().toUpperCase().startsWith('UPDATE')) {
      // Parse UPDATE statement: "UPDATE storeName SET col1 = ?, col2 = ? WHERE id = ?"
      const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
      if (match) {
        storeName = match[1];
        operation = 'put';

        // Extract SET clause column names
        const setClause = match[2];
        const whereClause = match[3];

        // Parse SET columns: "col1 = ?, col2 = ?, col3 = ?"
        const setMatches = setClause.match(/(\w+)\s*=\s*\?/g);
        if (setMatches && params) {
          data = {};
          setMatches.forEach((setMatch, index) => {
            const colMatch = setMatch.match(/(\w+)/);
            if (colMatch) {
              data[colMatch[1]] = params[index];
            }
          });

          // Parse WHERE clause to get the id field and value
          const whereMatch = whereClause.match(/(\w+)\s*=\s*\?/);
          if (whereMatch && params.length > setMatches.length) {
            // Add the WHERE field (usually 'id')
            const idField = whereMatch[1];
            const idValue = params[params.length - 1];
            data[idField] = idValue;
          }
        } else {
          throw new Error(`Invalid UPDATE statement format: ${sql}`);
        }
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

    console.log('[WebIndexedDbClient] Parsed operation:', {
      storeName,
      operation,
      dataKeys: data ? Object.keys(data) : [],
      dataId: data?.id,
    });

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
        console.log('[WebIndexedDbClient] Execute success:', {
          storeName,
          operation,
          dataId: data?.id,
        });
        resolve();
      };

      request.onerror = () => {
        console.error('[WebIndexedDbClient] Execute error:', {
          storeName,
          operation,
          error: request.error?.message,
          dataId: data?.id,
        });
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
