/**
 * Database Sync Service
 * 
 * Handles synchronization between local SQLite and remote PostgreSQL databases
 * - User login online first
 * - Bidirectional sync for all tables
 * - Periodic sync every 1 hour
 * - Offline operation support
 */

import { LocalDbClient } from '../types';
import { HttpApiClient } from '../remote-api-client';
import {
  SyncConfig,
  SyncStatus,
  SyncDirection,
  SyncResult,
  SyncSummary,
  SyncRecord,
  TableSyncMetadata,
} from './types';

// List of tables to sync (in dependency order)
const SYNC_TABLES = [
  // Core reference data (no dependencies)
  'CustomerGroup',
  'Location',
  'Category',
  'Brand',
  'Supplier',
  'TaxCategory',
  'PaymentMethod',
  'Role',
  'TaxRate',
  'ExpenseAccount',
  'CashRegister',
  
  // Dependent tables
  'Customer',
  'CustomerAddress',
  'Product',
  'ProductVariant',
  'InventoryItem',
  'User',
  'UserLocation',
  
  // Transaction tables
  'StockAdjustment',
  'StockAdjustmentLine',
  'StockTransfer',
  'StockTransferLine',
  'Barcode',
  'SerialNumber',
  'SaleOrder',
  'OrderLineItem',
  'OrderPayment',
  'OrderDiscount',
  'ReturnOrder',
  'ReturnLineItem',
  'ExchangeOrder',
  'GiftCard',
  'StoreCredit',
  'Shift',
  'ShiftTransaction',
  'CashMovement',
  'Expense',
  'BankAccount',
  'BankDeposit',
  'CashAccount',
  'Promotion',
  'ParkedOrder',
  'AuditLog',
  'SystemSetting',
];

const DEFAULT_CONFIG: Required<Omit<SyncConfig, 'serverUrl' | 'authToken'>> = {
  syncInterval: 3600000, // 1 hour
  batchSize: 100,
  retryAttempts: 3,
  retryDelay: 1000,
};

export class SyncService {
  private localDb: LocalDbClient;
  private apiClient: HttpApiClient;
  private config: Required<Omit<SyncConfig, 'serverUrl' | 'authToken'>> & {
    serverUrl?: string;
    authToken?: string;
  };
  private syncIntervalId: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSyncTime: Date | null = null;

  constructor(
    localDb: LocalDbClient,
    apiClient: HttpApiClient,
    config?: SyncConfig
  ) {
    this.localDb = localDb;
    this.apiClient = apiClient;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Initialize sync service
   */
  async initialize(): Promise<void> {
    // Ensure sync fields exist in local database
    await this.ensureSyncFields();
    
    console.log('[SyncService] Initialized');
  }

  /**
   * Ensure sync fields exist in all tables
   */
  private async ensureSyncFields(): Promise<void> {
    try {
      for (const table of SYNC_TABLES) {
        // Check if sync fields exist, if not add them
        // This is a simplified check - in production, you'd want proper migration
        try {
          await this.localDb.query(
            `SELECT sync_status, last_synced_at, is_deleted FROM ${table} LIMIT 1`
          );
        } catch (error: any) {
          // Table might not have sync fields, add them
          if (error.message?.includes('no such column')) {
            console.log(`[SyncService] Adding sync fields to ${table}`);
            try {
              await this.localDb.execute(
                `ALTER TABLE ${table} ADD COLUMN sync_status TEXT DEFAULT 'pending'`
              );
            } catch (e) {
              // Column might already exist
            }
            try {
              await this.localDb.execute(
                `ALTER TABLE ${table} ADD COLUMN last_synced_at TEXT`
              );
            } catch (e) {
              // Column might already exist
            }
            try {
              await this.localDb.execute(
                `ALTER TABLE ${table} ADD COLUMN is_deleted INTEGER DEFAULT 0`
              );
            } catch (e) {
              // Column might already exist
            }
          }
        }
      }
    } catch (error) {
      console.error('[SyncService] Error ensuring sync fields:', error);
    }
  }

  /**
   * Login user online and get auth token
   */
  async loginUser(username: string, password: string): Promise<{ token: string; user: any }> {
    try {
      const response = await this.apiClient.post<{
        success: boolean;
        data: { token: string; user: any };
      }>('/api/auth/login', { username, password });

      if (response.success && response.data.token) {
        this.config.authToken = response.data.token;
        this.apiClient.setAuthToken(response.data.token);
        return response.data;
      }

      throw new Error('Login failed: Invalid response');
    } catch (error) {
      console.error('[SyncService] Login failed:', error);
      throw error;
    }
  }

  /**
   * Perform full sync (all tables)
   */
  async syncAll(): Promise<SyncSummary> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const startTime = new Date();
    const results: SyncResult[] = [];
    const errors: string[] = [];

    try {
      // Check if server is online
      const isOnline = await this.apiClient.isAvailable();
      if (!isOnline) {
        throw new Error('Server is offline. Cannot sync.');
      }

      // Sync each table
      for (const table of SYNC_TABLES) {
        try {
          // Upload local changes first
          const uploadResult = await this.syncTable(table, SyncDirection.UPLOAD);
          results.push(uploadResult);

          // Then download server changes
          const downloadResult = await this.syncTable(table, SyncDirection.DOWNLOAD);
          results.push(downloadResult);
        } catch (error) {
          const errorMsg = `Error syncing table ${table}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(`[SyncService] ${errorMsg}`);
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const summary: SyncSummary = {
        success: errors.length === 0,
        startTime,
        endTime,
        duration,
        tablesSynced: results.length / 2, // Each table has upload + download
        totalRecordsProcessed: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
        results,
        errors,
      };

      this.lastSyncTime = endTime;
      return summary;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single table
   */
  async syncTable(
    tableName: string,
    direction: SyncDirection
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      table: tableName,
      direction,
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [],
      duration: 0,
    };

    try {
      if (direction === SyncDirection.UPLOAD) {
        // Upload local changes to server
        await this.uploadTable(tableName, result);
      } else if (direction === SyncDirection.DOWNLOAD) {
        // Download server changes to local
        await this.downloadTable(tableName, result);
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Upload local changes to server
   */
  private async uploadTable(
    tableName: string,
    result: SyncResult
  ): Promise<void> {
    try {
      // Get pending changes from local DB
      const pendingRecords = await this.localDb.query<SyncRecord>(
        `SELECT * FROM ${tableName} WHERE sync_status = 'pending' OR sync_status IS NULL LIMIT ?`,
        [this.config.batchSize]
      );

      if (pendingRecords.length === 0) {
        return;
      }

      // Upload to server
      const response = await this.apiClient.post<{
        success: boolean;
        data: { created: number; updated: number; errors: string[] };
      }>(`/api/sync/${tableName}/upload`, {
        records: pendingRecords,
      });

      if (response.success && response.data) {
        result.recordsProcessed = pendingRecords.length;
        result.recordsCreated = response.data.created || 0;
        result.recordsUpdated = response.data.updated || 0;
        result.errors.push(...(response.data.errors || []));

        // Update sync status in local DB
        const now = new Date().toISOString();
        for (const record of pendingRecords) {
          await this.localDb.execute(
            `UPDATE ${tableName} SET sync_status = 'synced', last_synced_at = ? WHERE id = ?`,
            [now, record.id]
          );
        }
      } else {
        throw new Error('Upload failed: Invalid response');
      }
    } catch (error) {
      result.errors.push(
        `Upload error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Download server changes to local
   */
  private async downloadTable(
    tableName: string,
    result: SyncResult
  ): Promise<void> {
    try {
      // Get last sync time for this table
      const metadata = await this.getTableMetadata(tableName);
      const lastSyncedAt = metadata.lastSyncedAt
        ? metadata.lastSyncedAt.toISOString()
        : null;

      // Download from server
      const response = await this.apiClient.get<{
        success: boolean;
        data: {
          records: SyncRecord[];
          hasMore: boolean;
          totalCount: number;
        };
      }>(`/api/sync/${tableName}/download`, {
        lastSyncedAt,
        limit: this.config.batchSize,
      });

      if (response.success && response.data) {
        const records = response.data.records || [];
        result.recordsProcessed = records.length;

        // Upsert records in local DB
        for (const record of records) {
          try {
            // Check if record exists
            const existing = await this.localDb.query<SyncRecord>(
              `SELECT id FROM ${tableName} WHERE id = ?`,
              [record.id]
            );

            const now = new Date().toISOString();
            if (existing.length > 0) {
              // Update existing record
              await this.updateLocalRecord(tableName, record, now);
              result.recordsUpdated++;
            } else {
              // Insert new record
              await this.insertLocalRecord(tableName, record, now);
              result.recordsCreated++;
            }

            // Handle soft deletes
            if (record.is_deleted) {
              await this.localDb.execute(
                `UPDATE ${tableName} SET is_deleted = 1, sync_status = 'synced', last_synced_at = ? WHERE id = ?`,
                [now, record.id]
              );
              result.recordsDeleted++;
            }
          } catch (error) {
            result.errors.push(
              `Error processing record ${record.id}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      } else {
        throw new Error('Download failed: Invalid response');
      }
    } catch (error) {
      result.errors.push(
        `Download error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Sanitize a value for SQLite binding (convert to valid SQLite types)
   * SQLite3 can only bind: numbers, strings, bigints, buffers, and null
   */
  private sanitizeValueForSqlite(value: any): string | number | bigint | Buffer | null {
    // Handle null/undefined - return null explicitly
    if (value === null || value === undefined) {
      return null;
    }

    // Handle Date objects - convert to ISO string
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle boolean - convert to 0 or 1 (SQLite doesn't have native boolean)
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    // Handle valid SQLite types - return as-is
    if (typeof value === 'number') {
      // Check for NaN or Infinity
      if (isNaN(value) || !isFinite(value)) {
        return null;
      }
      return value;
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'bigint') {
      return value;
    }
    
    if (Buffer.isBuffer(value)) {
      return value;
    }

    // Handle objects/arrays - convert to JSON string
    if (typeof value === 'object') {
      // Check if it's already a Date (shouldn't happen after Date check, but just in case)
      if (value instanceof Date) {
        return value.toISOString();
      }
      try {
        return JSON.stringify(value);
      } catch (error) {
        console.warn(`[SyncService] Failed to stringify object:`, error);
        return null;
      }
    }

    // For any other type (symbol, function, etc.), convert to string or return null
    try {
      return String(value);
    } catch {
      return null;
    }
  }

  /**
   * Insert a record into local database
   */
  private async insertLocalRecord(
    tableName: string,
    record: SyncRecord,
    syncedAt: string
  ): Promise<void> {
    // Remove sync-specific fields and sanitize all values
    const cleanRecord: any = {};
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'sync_status' && key !== 'last_synced_at') {
        const sanitized = this.sanitizeValueForSqlite(value);
        // Include the value (even if null, as SQLite can handle null)
        // But we'll only include the key if the value is not undefined
        if (value !== undefined) {
          cleanRecord[key] = sanitized;
        }
      }
    }

    const keys = Object.keys(cleanRecord);
    if (keys.length === 0) {
      // If no fields to insert, just insert sync fields
      await this.localDb.execute(
        `INSERT INTO ${tableName} (sync_status, last_synced_at) VALUES (?, ?)`,
        ['synced', syncedAt]
      );
      return;
    }

    const values = keys.map(k => cleanRecord[k]);
    const placeholders = keys.map(() => '?').join(', ');

    // Build INSERT statement with sync fields
    const allKeys = [...keys, 'sync_status', 'last_synced_at'];
    const allPlaceholders = [...placeholders.split(', '), '?', '?'].join(', ');

    // Final sanitization check - ensure all values are valid SQLite types
    const sanitizedValues = values.map((v, index) => {
      // Double-check the value is valid
      if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint' || Buffer.isBuffer(v)) {
        return v;
      }
      // If somehow we still have an invalid type, log and convert to string
      const key = keys[index];
      console.error(`[SyncService] Invalid SQLite type for ${tableName}.${key}:`, {
        type: typeof v,
        value: v,
        key,
        recordId: record.id,
      });
      return String(v);
    });

    // Final check on sync values too
    const finalParams = [...sanitizedValues, 'synced', syncedAt].map((v, index) => {
      if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint' || Buffer.isBuffer(v)) {
        return v;
      }
      console.error(`[SyncService] Invalid SQLite type in final params at index ${index}:`, typeof v, v);
      return String(v);
    });

    try {
      await this.localDb.execute(
        `INSERT INTO ${tableName} (${allKeys.join(', ')}) VALUES (${allPlaceholders})`,
        finalParams
      );
    } catch (error) {
      console.error(`[SyncService] Failed to insert record into ${tableName}:`, {
        error: error instanceof Error ? error.message : String(error),
        recordId: record.id,
        keys: allKeys,
        paramTypes: finalParams.map(p => typeof p),
        paramValues: finalParams.map(p => {
          if (typeof p === 'string' && p.length > 100) {
            return p.substring(0, 100) + '...';
          }
          return p;
        }),
      });
      throw error;
    }
  }

  /**
   * Update a record in local database
   */
  private async updateLocalRecord(
    tableName: string,
    record: SyncRecord,
    syncedAt: string
  ): Promise<void> {
    // Remove sync-specific fields, id, and sanitize all values
    const cleanRecord: any = {};
    for (const [key, value] of Object.entries(record)) {
      if (
        key !== 'id' &&
        key !== 'sync_status' &&
        key !== 'last_synced_at'
      ) {
        const sanitized = this.sanitizeValueForSqlite(value);
        // Only include non-null values (null means the field should be omitted)
        if (sanitized !== null) {
          cleanRecord[key] = sanitized;
        }
      }
    }

    const keys = Object.keys(cleanRecord);
    if (keys.length === 0) {
      // Only update sync fields if no other fields to update
      await this.localDb.execute(
        `UPDATE ${tableName} SET sync_status = 'synced', last_synced_at = ? WHERE id = ?`,
        [syncedAt, record.id]
      );
      return;
    }

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => cleanRecord[k]);

    await this.localDb.execute(
      `UPDATE ${tableName} SET ${setClause}, sync_status = 'synced', last_synced_at = ? WHERE id = ?`,
      [...values, syncedAt, record.id]
    );
  }

  /**
   * Get table sync metadata
   */
  async getTableMetadata(tableName: string): Promise<TableSyncMetadata> {
    try {
      const [recordCount] = await this.localDb.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );

      const [pendingCount] = await this.localDb.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE sync_status = 'pending' OR sync_status IS NULL`
      );

      const [lastSync] = await this.localDb.query<{ last_synced_at: string }>(
        `SELECT MAX(last_synced_at) as last_synced_at FROM ${tableName} WHERE last_synced_at IS NOT NULL`
      );

      return {
        tableName,
        lastSyncedAt: lastSync?.last_synced_at
          ? new Date(lastSync.last_synced_at)
          : null,
        syncStatus: pendingCount.count > 0 ? SyncStatus.PENDING : SyncStatus.SYNCED,
        recordCount: recordCount?.count || 0,
        pendingChanges: pendingCount?.count || 0,
      };
    } catch (error) {
      console.error(`[SyncService] Error getting metadata for ${tableName}:`, error);
      return {
        tableName,
        lastSyncedAt: null,
        syncStatus: SyncStatus.ERROR,
        recordCount: 0,
        pendingChanges: 0,
      };
    }
  }

  /**
   * Start periodic sync (every 1 hour)
   */
  startPeriodicSync(): void {
    if (this.syncIntervalId) {
      console.warn('[SyncService] Periodic sync already started');
      return;
    }

    console.log(`[SyncService] Starting periodic sync (interval: ${this.config.syncInterval}ms)`);
    
    this.syncIntervalId = setInterval(async () => {
      try {
        console.log('[SyncService] Running periodic sync...');
        await this.syncAll();
        console.log('[SyncService] Periodic sync completed');
      } catch (error) {
        console.error('[SyncService] Periodic sync failed:', error);
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('[SyncService] Periodic sync stopped');
    }
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Sync User table specifically (for immediate sync after login)
   * This ensures user data with passwordHash is available for offline login
   * Forces a full download to ensure all users are synced
   */
  async syncUserTable(): Promise<{ success: boolean; error?: string; recordsDownloaded?: number }> {
    try {
      console.log('[SyncService] Syncing User table (forced full download)...');
      
      // Check if server is online
      const isOnline = await this.apiClient.isAvailable();
      if (!isOnline) {
        return { success: false, error: 'Server is offline' };
      }

      // Upload local changes first
      const uploadResult = await this.syncTable('User', SyncDirection.UPLOAD);
      console.log('[SyncService] User table upload:', {
        success: uploadResult.success,
        recordsProcessed: uploadResult.recordsProcessed,
        errors: uploadResult.errors,
      });

      // Force full download by passing null for lastSyncedAt
      // This ensures we get all users, especially the one who just logged in
      console.log('[SyncService] Downloading all users from server...');
      const downloadResult = await this.downloadUserTableForced();
      
      const success = uploadResult.success && downloadResult.success;
      if (success) {
        console.log('[SyncService] User table synced successfully:', {
          recordsDownloaded: downloadResult.recordsDownloaded,
        });
      } else {
        console.warn('[SyncService] User table sync had errors:', {
          upload: uploadResult.errors,
          download: downloadResult.errors,
        });
      }

      return {
        success,
        error: success ? undefined : 'User table sync failed',
        recordsDownloaded: downloadResult.recordsDownloaded,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[SyncService] Error syncing User table:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Force download all users from server (ignores lastSyncedAt)
   */
  private async downloadUserTableForced(): Promise<{ success: boolean; recordsDownloaded: number; errors: string[] }> {
    const result = {
      success: false,
      recordsDownloaded: 0,
      errors: [] as string[],
    };

    try {
      // Download ALL users (no lastSyncedAt filter)
      // Don't pass lastSyncedAt to get all users
      console.log('[SyncService] Downloading all users from server (no lastSyncedAt filter)...');
      const response = await this.apiClient.get<{
        success: boolean;
        data: {
          records: SyncRecord[];
          hasMore: boolean;
          totalCount: number;
        };
      }>(`/api/sync/User/download`, {
        limit: 1000, // Large limit to get all users
        offset: 0,
        // Explicitly don't pass lastSyncedAt
      });

      if (response.success && response.data) {
        const records = response.data.records || [];
        console.log('[SyncService] Downloaded', records.length, 'users from server');
        result.recordsDownloaded = records.length;

        // Upsert records in local DB
        const now = new Date().toISOString();
        for (const record of records) {
          try {
            // Check if record exists
            const existing = await this.localDb.query<SyncRecord>(
              `SELECT id FROM User WHERE id = ?`,
              [record.id]
            );

            if (existing.length > 0) {
              // Update existing record
              await this.updateLocalRecord('User', record, now);
            } else {
              // Insert new record
              await this.insertLocalRecord('User', record, now);
            }
          } catch (error) {
            const errorMsg = `Error processing user ${record.id}: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            console.error('[SyncService]', errorMsg);
          }
        }

        result.success = result.errors.length === 0;
      } else {
        throw new Error('Download failed: Invalid response');
      }
    } catch (error) {
      const errorMsg = `Download error: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      console.error('[SyncService]', errorMsg);
    }

    return result;
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Close sync service
   */
  async close(): Promise<void> {
    this.stopPeriodicSync();
    console.log('[SyncService] Closed');
  }
}

