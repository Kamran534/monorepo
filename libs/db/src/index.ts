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
  runMigrations: () => Promise<void>;
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
      runMigrations: async () => {
        // Migrations are run on the main process during initialization
        // This is a no-op for the renderer process
        return Promise.resolve();
      },
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
    
    // In-memory counter for demo/testing; removed kv table usage
    let rnCounterValue = 0;
    const readCounter = async (): Promise<number> => rnCounterValue;
    const writeCounter = async (value: number): Promise<number> => {
      rnCounterValue = value;
      return rnCounterValue;
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
      runMigrations: async () => {
        if (!db) {
          throw new DatabaseError('Database not initialized', 'RN_DB_NOT_INITIALIZED');
        }
        try {
          const { createMobileExecutor, runMigrations } = await import('./migrations');
          const executor = createMobileExecutor(db);
          await runMigrations(executor);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new DatabaseError(
            `Failed to run migrations: ${errorMessage}`,
            'RN_MIGRATION_ERROR',
            error instanceof Error ? error : undefined
          );
        }
      },
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
  let db: {
    run: (sql: string, params?: unknown[]) => void;
    exec: (sql: string) => { columns: string[]; values: unknown[][] }[];
    prepare: (sql: string) => {
      bind: (params: unknown[]) => void;
      step: () => boolean;
      getAsObject: () => Record<string, unknown>;
      free: () => void;
    };
    export: () => Uint8Array;
  } | null = null; // sql.js Database instance
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

  // executeSQL helper removed as unused

  // runSQL helper removed as unused

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

    runMigrations: async () => {
      if (!db) {
        throw new DatabaseError('Database not initialized', 'WEB_DB_NOT_INITIALIZED');
      }
      try {
        const { createWebExecutor, runMigrations } = await import('./migrations');
        const executor = createWebExecutor(db);
        await runMigrations(executor);
        await persistDatabase();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new DatabaseError(
          `Failed to run migrations: ${errorMessage}`,
          'WEB_MIGRATION_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    },

    // In-memory counter for demo/testing; removed kv table usage
    getCounter: async () => {
      if (!connected) {
        throw new DatabaseError('Database not connected', 'WEB_NOT_CONNECTED');
      }

      try {
        if (!('webCounterValue' in (cachedConnection as unknown as Record<string, unknown>))) {
          (cachedConnection as unknown as Record<string, unknown>).webCounterValue = 0;
        }
        return Number((cachedConnection as unknown as Record<string, unknown>).webCounterValue);
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
        (cachedConnection as unknown as Record<string, unknown>).webCounterValue = next;
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
        (cachedConnection as unknown as Record<string, unknown>).webCounterValue = next;
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
