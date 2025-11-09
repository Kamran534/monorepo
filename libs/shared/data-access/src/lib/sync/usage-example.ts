/**
 * Sync Service Usage Example
 * 
 * Example of how to integrate the sync service into your application
 */

import { SyncService, SyncDirection } from './sync-service';
import { DesktopSqliteClient } from '../local-db-client';
import { HttpApiClient } from '../remote-api-client';

/**
 * Example: Initialize and use sync service in desktop app
 */
export async function initializeSyncService() {
  // 1. Initialize local database
  const localDb = new DesktopSqliteClient('./cpos.db');
  await localDb.initialize();

  // 2. Initialize API client
  const apiClient = new HttpApiClient({
    baseUrl: process.env.SERVER_URL || 'http://localhost:4000',
  });
  await apiClient.initialize();

  // 3. Create sync service
  const syncService = new SyncService(localDb, apiClient, {
    syncInterval: 3600000, // 1 hour
    batchSize: 100,
    retryAttempts: 3,
    retryDelay: 1000,
  });

  // 4. Initialize sync service (adds sync fields to tables)
  await syncService.initialize();

  return syncService;
}

/**
 * Example: Login and sync flow
 */
export async function loginAndSync(username: string, password: string) {
  const syncService = await initializeSyncService();

  try {
    // Step 1: Login user online
    console.log('Logging in user...');
    const { token, user } = await syncService.loginUser(username, password);
    console.log('Logged in as:', user.username);

    // Step 2: Perform initial sync
    console.log('Starting initial sync...');
    const summary = await syncService.syncAll();
    
    if (summary.success) {
      console.log('Sync completed successfully:', {
        tablesSynced: summary.tablesSynced,
        recordsProcessed: summary.totalRecordsProcessed,
        duration: `${summary.duration}ms`,
      });
    } else {
      console.warn('Sync completed with errors:', summary.errors);
    }

    // Step 3: Start periodic sync
    console.log('Starting periodic sync (every 1 hour)...');
    syncService.startPeriodicSync();

    return { syncService, user };
  } catch (error) {
    console.error('Login/sync failed:', error);
    throw error;
  }
}

/**
 * Example: Manual sync trigger
 */
export async function manualSync() {
  const syncService = await initializeSyncService();

  // Check if sync is in progress
  if (syncService.isSyncInProgress()) {
    console.log('Sync already in progress');
    return;
  }

  // Perform sync
  const summary = await syncService.syncAll();
  console.log('Manual sync completed:', summary);
}

/**
 * Example: Get sync status for all tables
 */
export async function getSyncStatus() {
  const syncService = await initializeSyncService();
  
  const tables = [
    'Customer',
    'Product',
    'SaleOrder',
    // ... other tables
  ];

  const statuses = await Promise.all(
    tables.map(table => syncService.getTableMetadata(table))
  );

  console.log('Sync Status:');
  statuses.forEach(status => {
    console.log(`  ${status.tableName}:`, {
      recordCount: status.recordCount,
      pendingChanges: status.pendingChanges,
      lastSyncedAt: status.lastSyncedAt,
      syncStatus: status.syncStatus,
    });
  });
}

/**
 * Example: Sync specific table
 */
export async function syncSpecificTable(tableName: string) {
  const syncService = await initializeSyncService();

  // Upload local changes
  const uploadResult = await syncService.syncTable(tableName, SyncDirection.UPLOAD);
  console.log(`Uploaded ${uploadResult.recordsProcessed} records from ${tableName}`);

  // Download server changes
  const downloadResult = await syncService.syncTable(tableName, SyncDirection.DOWNLOAD);
  console.log(`Downloaded ${downloadResult.recordsProcessed} records to ${tableName}`);
}

