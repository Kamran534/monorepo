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

      this.db = new Database(this.dbPath, {
        // verbose: console.log, // Uncomment for debugging
      });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      this.isInitialized = true;
      console.log(`[DesktopSqliteClient] Initialized database at: ${this.dbPath}`);
    } catch (error) {
      console.error('[DesktopSqliteClient] Initialization failed:', error);
      throw error;
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
 * Web IndexedDB Client (TODO)
 *
 * TODO: Implement for web platform using IndexedDB
 * This should provide similar interface for browser-based applications
 */
export class WebIndexedDbClient implements LocalDbClient {
  async isAvailable(): Promise<boolean> {
    // TODO: Check if IndexedDB is available in browser
    console.warn('[WebIndexedDbClient] Not implemented yet');
    return false;
  }

  async initialize(): Promise<void> {
    // TODO: Initialize IndexedDB connection
    throw new Error('WebIndexedDbClient not implemented yet');
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    // TODO: Implement IndexedDB query
    // Note: IndexedDB doesn't use SQL, so we'll need to translate
    throw new Error('WebIndexedDbClient not implemented yet');
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    // TODO: Implement IndexedDB execute
    throw new Error('WebIndexedDbClient not implemented yet');
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    // TODO: Implement IndexedDB transaction
    throw new Error('WebIndexedDbClient not implemented yet');
  }

  async close(): Promise<void> {
    // TODO: Close IndexedDB connection
    console.warn('[WebIndexedDbClient] Not implemented yet');
  }
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
      // TODO: Return WebIndexedDbClient when implemented
      console.warn('[createLocalDbClient] Web platform not fully implemented');
      return new WebIndexedDbClient();
    case 'mobile':
      // TODO: Return MobileSqliteClient when implemented
      console.warn('[createLocalDbClient] Mobile platform not fully implemented');
      return new MobileSqliteClient();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
