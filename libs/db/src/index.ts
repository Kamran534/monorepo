type IpcRenderer = {
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
};

declare global {
  interface Window {
    electron?: {
      ipcRenderer: IpcRenderer;
    };
  }
}

export type DatabaseConnection = {
  connect: () => Promise<void>;
  isConnected: () => boolean;
  getCounter: () => Promise<number>;
  increment: () => Promise<number>;
  decrement: () => Promise<number>;
};

/**
 * Custom error class for database operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

let cachedConnection: DatabaseConnection | null = null;

/**
 * Get or create a database connection instance
 * Automatically detects the platform and returns the appropriate driver
 * @returns {DatabaseConnection} Database connection instance
 * @throws {DatabaseError} If database connection cannot be established
 */
export function getDatabase(): DatabaseConnection {
  if (cachedConnection) return cachedConnection;

  // Electron renderer exposes window.electron via preload IPC
  if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
    // Electron renderer driver using IPC through preload
    const ipc = window.electron.ipcRenderer;
    cachedConnection = {
      connect: async () => {
        try {
          await ipc.invoke('db/connect');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new DatabaseError(
            `Failed to connect to database via IPC: ${errorMessage}`,
            'IPC_CONNECT_ERROR',
            error instanceof Error ? error : undefined
          );
        }
      },
      isConnected: () => true, // IPC connection is always available if window.electron exists
      getCounter: async () => {
        try {
          return await ipc.invoke<number>('db/getCounter');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new DatabaseError(
            `Failed to get counter: ${errorMessage}`,
            'IPC_GET_COUNTER_ERROR',
            error instanceof Error ? error : undefined
          );
        }
      },
      increment: async () => {
        try {
          return await ipc.invoke<number>('db/increment');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new DatabaseError(
            `Failed to increment counter: ${errorMessage}`,
            'IPC_INCREMENT_ERROR',
            error instanceof Error ? error : undefined
          );
        }
      },
      decrement: async () => {
        try {
          return await ipc.invoke<number>('db/decrement');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new DatabaseError(
            `Failed to decrement counter: ${errorMessage}`,
            'IPC_DECREMENT_ERROR',
            error instanceof Error ? error : undefined
          );
        }
      },
    };
    return cachedConnection;
  }

  // React Native driver using react-native-sqlite-storage
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  if (isReactNative) {
    let connected = false;
    // Hold DB handle after connect
    let db: { executeSql: (sql: string, params?: unknown[]) => Promise<Array<{ rows: { length: number; item: (index: number) => { value: number } } }>> } | null = null;
    
    const ensureSchema = async () => {
      if (!db) {
        throw new DatabaseError('Database not initialized', 'RN_DB_NOT_INITIALIZED');
      }
      
      try {
        await db.executeSql('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value INTEGER)');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new DatabaseError(
          `Failed to create schema: ${errorMessage}`,
          'RN_SCHEMA_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    };
    
    const readCounter = async (): Promise<number> => {
      if (!db) {
        throw new DatabaseError('Database not initialized', 'RN_DB_NOT_INITIALIZED');
      }
      
      try {
        const [res] = await db.executeSql('SELECT value FROM kv WHERE key = ?', ['counter']);
        if (res.rows.length > 0) {
          return Number(res.rows.item(0).value);
        }
        return 0;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new DatabaseError(
          `Failed to read counter: ${errorMessage}`,
          'RN_READ_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    };
    
    const writeCounter = async (value: number): Promise<number> => {
      if (!db) {
        throw new DatabaseError('Database not initialized', 'RN_DB_NOT_INITIALIZED');
      }
      
      try {
        await db.executeSql(
          'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
          ['counter', value]
        );
        return value;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new DatabaseError(
          `Failed to write counter: ${errorMessage}`,
          'RN_WRITE_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    };

    cachedConnection = {
      connect: async () => {
        try {
          // Dynamic import to avoid bundling for web/desktop
          const SQLiteMod = await import('react-native-sqlite-storage');
          const SQLiteAny = (SQLiteMod as { default?: unknown }).default ?? SQLiteMod;
          
          if (typeof SQLiteAny.enablePromise === 'function') {
            SQLiteAny.enablePromise(true);
          }
          
          // Open or create DB in app sandbox
          db = await SQLiteAny.openDatabase({ name: 'payflow.db', location: 'default' });
          
          if (!db) {
            throw new DatabaseError('Failed to open database', 'RN_OPEN_ERROR');
          }
          
          await ensureSchema();
          connected = true;
        } catch (error) {
          connected = false;
          if (error instanceof DatabaseError) {
            throw error;
          }
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new DatabaseError(
            `Failed to connect to database: ${errorMessage}`,
            'RN_CONNECT_ERROR',
            error instanceof Error ? error : undefined
          );
        }
      },
      isConnected: () => connected && db !== null,
      getCounter: async () => {
        if (!connected) {
          throw new DatabaseError('Database not connected', 'RN_NOT_CONNECTED');
        }
        return readCounter();
      },
      increment: async () => {
        if (!connected) {
          throw new DatabaseError('Database not connected', 'RN_NOT_CONNECTED');
        }
        const currentValue = await readCounter();
        return writeCounter(currentValue + 1);
      },
      decrement: async () => {
        if (!connected) {
          throw new DatabaseError('Database not connected', 'RN_NOT_CONNECTED');
        }
        const currentValue = await readCounter();
        return writeCounter(currentValue - 1);
      },
    };
    return cachedConnection;
  }

  // Web driver using sql.js (SQLite compiled to WebAssembly)
  let connected = false;
  let db: { prepare: (sql: string) => unknown; run: (sql: string, params?: unknown[]) => void; export: () => Uint8Array } | null = null; // sql.js Database instance
  const DB_NAME = 'payflow.db';
  const INDEXEDDB_STORE = 'sqlite-dbs';

  /**
   * IndexedDB helper to persist SQLite database
   */
  const openIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('payflow-sqlite', 1);
      
      request.onerror = () => reject(new DatabaseError(
        'Failed to open IndexedDB',
        'WEB_INDEXEDDB_OPEN_ERROR',
        request.error || undefined
      ));
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
          db.createObjectStore(INDEXEDDB_STORE);
        }
      };
    });
  };

  /**
   * Load database from IndexedDB
   */
  const loadDatabase = async (): Promise<Uint8Array | null> => {
    try {
      const idb = await openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(INDEXEDDB_STORE, 'readonly');
        const store = tx.objectStore(INDEXEDDB_STORE);
        const request = store.get(DB_NAME);
        
        request.onerror = () => reject(new DatabaseError(
          'Failed to load database from IndexedDB',
          'WEB_INDEXEDDB_LOAD_ERROR',
          request.error || undefined
        ));
        
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(
        'Failed to load database',
        'WEB_DB_LOAD_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  };

  /**
   * Save database to IndexedDB
   */
  const saveDatabase = async (data: Uint8Array): Promise<void> => {
    try {
      const idb = await openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(INDEXEDDB_STORE, 'readwrite');
        const store = tx.objectStore(INDEXEDDB_STORE);
        const request = store.put(data, DB_NAME);
        
        request.onerror = () => reject(new DatabaseError(
          'Failed to save database to IndexedDB',
          'WEB_INDEXEDDB_SAVE_ERROR',
          request.error || undefined
        ));
        
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(
        'Failed to save database',
        'WEB_DB_SAVE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  };

  /**
   * Execute a SQL query and return results
   */
  const executeSQL = (sql: string, params: unknown[] = []): Record<string, unknown>[] => {
    if (!db) {
      throw new DatabaseError('Database not initialized', 'WEB_DB_NOT_INITIALIZED');
    }
    
    try {
      const stmt = db.prepare(sql) as { bind: (params: unknown[]) => void; step: () => boolean; getAsObject: () => Record<string, unknown>; free: () => void };
      if (params.length > 0) {
        stmt.bind(params);
      }
      
      const results: Record<string, unknown>[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new DatabaseError(
        `SQL execution failed: ${errorMessage}`,
        'WEB_SQL_EXEC_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  };

  /**
   * Execute a SQL statement without returning results
   */
  const runSQL = (sql: string, params: unknown[] = []): void => {
    if (!db) {
      throw new DatabaseError('Database not initialized', 'WEB_DB_NOT_INITIALIZED');
    }
    
    try {
      db.run(sql, params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new DatabaseError(
        `SQL execution failed: ${errorMessage}`,
        'WEB_SQL_RUN_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  };

  /**
   * Persist database changes to IndexedDB
   */
  const persistDatabase = async (): Promise<void> => {
    if (!db) return;
    
    try {
      const data = db.export();
      await saveDatabase(data);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(
        'Failed to persist database',
        'WEB_DB_PERSIST_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  };

  cachedConnection = {
    connect: async () => {
      try {
        // Dynamic import to avoid bundling for desktop/mobile
        const initSqlJs = (await import('sql.js')).default;
        
        // Initialize sql.js with WASM file
        const SQL = await initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`
        });
        
        // Try to load existing database from IndexedDB
        const savedDb = await loadDatabase();
        
        if (savedDb) {
          // Load existing database
          db = new SQL.Database(savedDb);
        } else {
          // Create new database
          db = new SQL.Database();
          
          // Create schema
          runSQL('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value INTEGER)');
          
          // Save initial database
          await persistDatabase();
        }
        
        connected = true;
      } catch (error) {
        connected = false;
        if (error instanceof DatabaseError) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new DatabaseError(
          `Failed to connect to database: ${errorMessage}`,
          'WEB_DB_CONNECT_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    },
    
    isConnected: () => connected && db !== null,
    
    getCounter: async () => {
      if (!connected) {
        throw new DatabaseError('Database not connected', 'WEB_NOT_CONNECTED');
      }
      
      try {
        const results = executeSQL('SELECT value FROM kv WHERE key = ?', ['counter']);
        return results.length > 0 ? Number(results[0].value) : 0;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(
          'Failed to get counter',
          'WEB_GET_COUNTER_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    },
    
    increment: async () => {
      if (!connected) {
        throw new DatabaseError('Database not connected', 'WEB_NOT_CONNECTED');
      }
      
      try {
        if (!cachedConnection) {
          throw new DatabaseError('Connection not initialized', 'WEB_CONNECTION_NOT_INITIALIZED');
        }
        const current = await cachedConnection.getCounter();
        const next = current + 1;
        
        runSQL(
          'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
          ['counter', next]
        );
        
        await persistDatabase();
        return next;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(
          'Failed to increment counter',
          'WEB_INCREMENT_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    },
    
    decrement: async () => {
      if (!connected) {
        throw new DatabaseError('Database not connected', 'WEB_NOT_CONNECTED');
      }
      
      try {
        if (!cachedConnection) {
          throw new DatabaseError('Connection not initialized', 'WEB_CONNECTION_NOT_INITIALIZED');
        }
        const current = await cachedConnection.getCounter();
        const next = current - 1;
        
        runSQL(
          'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
          ['counter', next]
        );
        
        await persistDatabase();
        return next;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(
          'Failed to decrement counter',
          'WEB_DECREMENT_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    },
  };
  return cachedConnection;
}
