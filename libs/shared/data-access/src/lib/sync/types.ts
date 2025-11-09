/**
 * Sync Types and Interfaces
 * 
 * Types for database synchronization between local SQLite and remote PostgreSQL
 */

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  CONFLICT = 'conflict',
  ERROR = 'error',
}

export enum SyncDirection {
  UPLOAD = 'upload',      // Local -> Server
  DOWNLOAD = 'download', // Server -> Local
  BIDIRECTIONAL = 'bidirectional',
}

export interface SyncConfig {
  syncInterval?: number; // milliseconds (default: 1 hour)
  batchSize?: number;    // number of records per batch (default: 100)
  retryAttempts?: number; // number of retry attempts (default: 3)
  retryDelay?: number;    // delay between retries in ms (default: 1000)
  serverUrl?: string;     // server API URL
  authToken?: string;     // authentication token
}

export interface SyncResult {
  table: string;
  direction: SyncDirection;
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: string[];
  duration: number; // milliseconds
}

export interface SyncSummary {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  tablesSynced: number;
  totalRecordsProcessed: number;
  results: SyncResult[];
  errors: string[];
}

export interface TableSyncMetadata {
  tableName: string;
  lastSyncedAt: Date | null;
  syncStatus: SyncStatus;
  recordCount: number;
  pendingChanges: number;
}

export interface SyncRecord {
  id: string;
  [key: string]: any;
  sync_status?: SyncStatus;
  last_synced_at?: string | Date;
  is_deleted?: boolean;
  updated_at?: string | Date;
  created_at?: string | Date;
}

export interface SyncRequest {
  table: string;
  direction: SyncDirection;
  lastSyncedAt?: string; // ISO date string
  limit?: number;
  offset?: number;
}

export interface SyncResponse {
  table: string;
  records: SyncRecord[];
  hasMore: boolean;
  totalCount: number;
  lastSyncedAt: string; // ISO date string
}

