# Database Sync Module

Synchronizes data between local SQLite database (cpos.db) and remote PostgreSQL server database.

## Features

- ✅ **User Login Online First**: Authenticates user with server before syncing
- ✅ **Bidirectional Sync**: Uploads local changes and downloads server changes
- ✅ **Periodic Sync**: Automatically syncs every 1 hour
- ✅ **Offline Support**: Works offline, queues changes for later sync
- ✅ **Conflict Resolution**: Handles conflicts with last-write-wins strategy
- ✅ **Batch Processing**: Syncs in batches for better performance

## Usage

### 1. Initialize Sync Service

```typescript
import { SyncService } from '@monorepo/shared/data-access';
import { DesktopSqliteClient } from '@monorepo/shared/data-access';
import { HttpApiClient } from '@monorepo/shared/data-access';

// Initialize local database
const localDb = new DesktopSqliteClient('./cpos.db');
await localDb.initialize();

// Initialize API client
const apiClient = new HttpApiClient({
  baseUrl: 'http://localhost:4000',
});

// Create sync service
const syncService = new SyncService(localDb, apiClient, {
  syncInterval: 3600000, // 1 hour
  batchSize: 100,
});

await syncService.initialize();
```

### 2. Login User Online

```typescript
// Login user first (required before sync)
const { token, user } = await syncService.loginUser('username', 'password');
console.log('Logged in as:', user);
```

### 3. Perform Initial Sync

```typescript
// Sync all tables
const summary = await syncService.syncAll();
console.log('Sync completed:', {
  success: summary.success,
  tablesSynced: summary.tablesSynced,
  recordsProcessed: summary.totalRecordsProcessed,
});
```

### 4. Start Periodic Sync

```typescript
// Start automatic sync every 1 hour
syncService.startPeriodicSync();

// Later, stop periodic sync
syncService.stopPeriodicSync();
```

### 5. Sync Individual Table

```typescript
// Sync a specific table
const result = await syncService.syncTable('Customer', SyncDirection.UPLOAD);
console.log('Uploaded:', result.recordsProcessed, 'records');
```

### 6. Get Sync Status

```typescript
// Get metadata for a table
const metadata = await syncService.getTableMetadata('Customer');
console.log('Table status:', {
  recordCount: metadata.recordCount,
  pendingChanges: metadata.pendingChanges,
  lastSyncedAt: metadata.lastSyncedAt,
});
```

## Sync Flow

1. **User Login**: User logs in online to get authentication token
2. **Upload Local Changes**: Local pending changes are uploaded to server
3. **Download Server Changes**: Server changes are downloaded to local
4. **Update Sync Status**: Records are marked as synced with timestamp
5. **Periodic Sync**: Process repeats every 1 hour automatically

## Database Schema Requirements

All tables must have the following sync fields:

- `sync_status` (TEXT): 'pending', 'synced', 'conflict', or 'error'
- `last_synced_at` (TEXT): ISO timestamp of last successful sync
- `is_deleted` (INTEGER): Soft delete flag (0 or 1)

The sync service will automatically add these fields if they don't exist.

## Tables Synced

The following tables are synced (in dependency order):

1. Core reference data: CustomerGroup, Location, Category, Brand, Supplier, etc.
2. Dependent tables: Customer, Product, ProductVariant, InventoryItem, User, etc.
3. Transaction tables: SaleOrder, OrderLineItem, ReturnOrder, Shift, etc.

## Error Handling

- Sync errors are logged but don't stop the entire sync process
- Failed records are tracked in the sync result
- Retry logic is built-in (3 attempts by default)
- Offline mode: Sync is skipped if server is unavailable

## Configuration

```typescript
interface SyncConfig {
  syncInterval?: number;    // Sync interval in ms (default: 3600000 = 1 hour)
  batchSize?: number;       // Records per batch (default: 100)
  retryAttempts?: number;   // Retry attempts (default: 3)
  retryDelay?: number;     // Delay between retries in ms (default: 1000)
  serverUrl?: string;      // Server API URL
  authToken?: string;      // Authentication token
}
```

