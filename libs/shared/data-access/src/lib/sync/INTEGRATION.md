# Sync Service Integration Guide

This guide explains how to integrate the database sync service into your desktop application.

## Overview

The sync service synchronizes data between:
- **Local**: SQLite database (`cpos.db`)
- **Remote**: PostgreSQL server database

## Integration Steps

### 1. Install Dependencies

The sync service is already included in `@monorepo/shared/data-access`. No additional installation needed.

### 2. Initialize in Main Process (Electron)

In your Electron main process (`apps/desktop/src/main/main.ts`):

```typescript
import { SyncService } from '@monorepo/shared/data-access';
import { DesktopSqliteClient } from '@monorepo/shared/data-access';
import { HttpApiClient } from '@monorepo/shared/data-access';
import { app } from 'electron';
import { join } from 'path';

let syncService: SyncService | null = null;

async function initializeSync() {
  // Get database path
  const dbPath = join(app.getPath('userData'), 'cpos.db');
  
  // Initialize local database
  const localDb = new DesktopSqliteClient(dbPath);
  await localDb.initialize();

  // Initialize API client
  const apiClient = new HttpApiClient({
    baseUrl: process.env.SERVER_URL || 'http://localhost:4000',
  });
  await apiClient.initialize();

  // Create sync service
  syncService = new SyncService(localDb, apiClient, {
    syncInterval: 3600000, // 1 hour
    batchSize: 100,
  });

  await syncService.initialize();
  
  return syncService;
}

// Initialize on app ready
app.whenReady().then(async () => {
  await initializeSync();
  // ... rest of app initialization
});
```

### 3. Add Login with Sync

Update your login flow to include sync:

```typescript
// In your login handler
async function handleLogin(username: string, password: string) {
  try {
    // Step 1: Login user online
    const { token, user } = await syncService!.loginUser(username, password);
    
    // Step 2: Perform initial sync
    console.log('Starting initial sync...');
    const summary = await syncService!.syncAll();
    
    if (summary.success) {
      console.log('Sync completed:', summary.totalRecordsProcessed, 'records');
    } else {
      console.warn('Sync completed with errors:', summary.errors);
    }

    // Step 3: Start periodic sync
    syncService!.startPeriodicSync();

    // Step 4: Store user session
    // ... your session management code

    return { success: true, user };
  } catch (error) {
    console.error('Login/sync failed:', error);
    return { success: false, error };
  }
}
```

### 4. Expose Sync via IPC (Optional)

If you want to trigger sync from renderer process:

```typescript
// In main process
import { ipcMain } from 'electron';

ipcMain.handle('sync:all', async () => {
  if (!syncService) {
    throw new Error('Sync service not initialized');
  }
  return await syncService.syncAll();
});

ipcMain.handle('sync:status', async (_, tableName: string) => {
  if (!syncService) {
    throw new Error('Sync service not initialized');
  }
  return await syncService.getTableMetadata(tableName);
});

ipcMain.handle('sync:table', async (_, tableName: string, direction: string) => {
  if (!syncService) {
    throw new Error('Sync service not initialized');
  }
  return await syncService.syncTable(tableName, direction as SyncDirection);
});
```

### 5. Handle Offline Mode

The sync service automatically handles offline mode:

```typescript
// Check if sync is possible
const isOnline = await apiClient.isAvailable();

if (!isOnline) {
  console.log('Server offline - working in offline mode');
  // App continues to work with local database
  // Changes will be synced when server comes online
}
```

### 6. Monitor Sync Status

```typescript
// Get sync status for a table
const metadata = await syncService.getTableMetadata('Customer');
console.log('Customer sync status:', {
  recordCount: metadata.recordCount,
  pendingChanges: metadata.pendingChanges,
  lastSyncedAt: metadata.lastSyncedAt,
});

// Check if sync is in progress
if (syncService.isSyncInProgress()) {
  console.log('Sync is currently running...');
}

// Get last sync time
const lastSync = syncService.getLastSyncTime();
console.log('Last sync:', lastSync);
```

## Sync Flow

1. **User Login**: User logs in online → gets auth token
2. **Initial Sync**: All tables are synced (upload + download)
3. **Periodic Sync**: Automatic sync every 1 hour
4. **Offline Operation**: App works offline, changes queued
5. **Auto Sync**: When server comes online, queued changes sync automatically

## Database Schema

The sync service automatically adds these fields to all tables:

- `sync_status` (TEXT): 'pending', 'synced', 'conflict', 'error'
- `last_synced_at` (TEXT): ISO timestamp
- `is_deleted` (INTEGER): 0 or 1

No manual schema changes needed!

## Error Handling

```typescript
try {
  const summary = await syncService.syncAll();
  if (!summary.success) {
    // Handle errors
    summary.errors.forEach(error => {
      console.error('Sync error:', error);
    });
  }
} catch (error) {
  // Handle critical errors
  console.error('Sync failed:', error);
}
```

## Best Practices

1. **Always login online first** before syncing
2. **Handle sync errors gracefully** - don't block user operations
3. **Show sync status in UI** - let users know when sync is happening
4. **Allow manual sync trigger** - give users control
5. **Monitor sync performance** - log sync times and record counts

## Troubleshooting

### Sync not working?

1. Check server is online: `await apiClient.isAvailable()`
2. Check auth token is set: `apiClient.setAuthToken(token)`
3. Check database connection: `await localDb.initialize()`
4. Check sync fields exist: Look for `sync_status` column in tables

### Records not syncing?

1. Check `sync_status` field - should be 'pending' for unsynced records
2. Check server logs for errors
3. Verify table name matches between local and server
4. Check foreign key constraints - sync in dependency order

### Performance issues?

1. Reduce `batchSize` in config
2. Sync fewer tables at once
3. Check network connection speed
4. Monitor server performance

