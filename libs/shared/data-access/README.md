# Shared Data Access Library

A shared library for managing offline-first data access across desktop, web, and mobile applications in the POS system monorepo.

## Features

- **Automatic Connectivity Detection**: Continuously monitors server availability
- **Seamless Data Source Switching**: Automatically switches between server and local database based on connectivity
- **Platform Support**: Desktop (Electron/SQLite), Web (IndexedDB - TODO), Mobile (React Native/SQLite - TODO)
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Singleton Patterns**: Easy-to-use singleton instances for common use cases
- **Retry Logic**: Built-in retry mechanisms for network requests and connectivity checks

## Installation

This library is part of the monorepo and doesn't need separate installation.

Import it in your app:

```typescript
import {
  DataSourceManager,
  getDataSourceManager,
  ConnectionStatus,
  DataSource,
} from '@monorepo/shared-data-access';
```

## Quick Start

### Basic Setup (Desktop App)

```typescript
import { getDataSourceManager, createLocalDbClient, getApiClient } from '@monorepo/shared-data-access';
import path from 'path';

// Initialize the data source manager
// serverUrl can be provided via config, or it will use SERVER_URL environment variable
// Falls back to 'http://localhost:4000' if not set
const dataSourceManager = getDataSourceManager({
  serverUrl: process.env.SERVER_URL || 'http://localhost:4000', // Optional: can omit to use env var
  checkInterval: 30000, // Check every 30 seconds
  timeout: 5000,
});

// Initialize local database client (Desktop)
const localDb = createLocalDbClient('desktop', {
  dbPath: path.join(__dirname, '../libsdb/cpos.db'),
});
await localDb.initialize();

// Initialize remote API client
// baseUrl can be provided via config, or it will use SERVER_URL environment variable
// Falls back to 'http://localhost:4000' if not set
const apiClient = getApiClient({
  baseUrl: process.env.SERVER_URL || 'http://localhost:4000', // Optional: can omit to use env var
});
await apiClient.initialize();

// Start monitoring connectivity
await dataSourceManager.initialize();

// Listen for connection changes
dataSourceManager.onConnectionChange((state) => {
  console.log('Connection state changed:', state);

  if (state.dataSource === 'server') {
    console.log('Using server API');
  } else {
    console.log('Using local database');
  }
});
```

### Using the Data Source Manager

```typescript
// Get current connection state
const state = dataSourceManager.getConnectionState();
console.log('Status:', state.status); // online, offline, checking, unknown
console.log('Data Source:', state.dataSource); // server, local

// Manually check connectivity
const result = await dataSourceManager.checkConnectivity();
console.log('Is Online:', result.isOnline);
console.log('Latency:', result.latency);

// Manually switch data source (disable auto-switching)
dataSourceManager.setAutoSwitch(false);
dataSourceManager.switchDataSource('local');
```

### Using Local Database (Desktop)

```typescript
import { createLocalDbClient } from '@monorepo/shared-data-access';

const db = createLocalDbClient('desktop', {
  dbPath: './cpos.db',
});

await db.initialize();

// Query data
const customers = await db.query<Customer>(
  'SELECT * FROM customers WHERE is_deleted = 0 LIMIT ?',
  [10]
);

// Execute insert/update
await db.execute(
  'INSERT INTO customers (id, first_name, last_name) VALUES (?, ?, ?)',
  ['uuid-1', 'John', 'Doe']
);

// Transaction
await db.transaction(async () => {
  await db.execute('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?', ['item-1']);
  await db.execute('INSERT INTO sales (item_id, quantity) VALUES (?, ?)', ['item-1', 1]);
});

await db.close();
```

### Using Remote API Client

```typescript
import { getApiClient } from '@monorepo/shared-data-access';

const api = getApiClient({
  baseUrl: 'http://localhost:4000',
});

await api.initialize();

// Set auth token
api.setAuthToken('your-jwt-token');

// GET request
const customers = await api.get<Customer[]>('/api/customers', {
  limit: 10,
  offset: 0,
});

// POST request
const newCustomer = await api.post<Customer>('/api/customers', {
  firstName: 'John',
  lastName: 'Doe',
});

// PUT request
const updated = await api.put<Customer>('/api/customers/123', {
  firstName: 'Jane',
});

// DELETE request
await api.delete('/api/customers/123');
```

## Architecture

### Components

1. **ConnectivityChecker**: Monitors server availability
2. **DataSourceManager**: Orchestrates data source switching
3. **LocalDbClient**: Platform-specific local database access
4. **RemoteApiClient**: HTTP API client for server communication

### Data Flow

```
┌─────────────────────────────────────────────────┐
│         Your Application                        │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│      DataSourceManager                          │
│  ┌──────────────────────────────────────────┐   │
│  │  ConnectivityChecker                     │   │
│  │  - Ping server every 30s                 │   │
│  │  - Update connection status              │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Connection State:                               │
│  - Status: online/offline                        │
│  - Data Source: server/local                     │
└────────┬─────────────────────────────┬───────────┘
         │                             │
         │ If ONLINE                   │ If OFFLINE
         ▼                             ▼
┌──────────────────────┐      ┌──────────────────────┐
│  RemoteApiClient     │      │  LocalDbClient       │
│  (Server API)        │      │  (SQLite/IndexedDB)  │
└──────────────────────┘      └──────────────────────┘
```

## Platform Support

### Desktop (Implemented ✅)
- **Database**: SQLite via `better-sqlite3`
- **Location**: `apps/desktop/libsdb/cpos.db`
- **Features**: Full offline support with sync

### Web (TODO ⏳)
- **Database**: IndexedDB (browser storage)
- **Implementation**: `WebIndexedDbClient` needs to be completed
- **Features**: Offline-capable PWA support

### Mobile (TODO ⏳)
- **Database**: SQLite via `react-native-sqlite-storage`
- **Implementation**: `MobileSqliteClient` needs to be completed
- **Features**: Full offline support with sync

## Configuration

### DataSourceManager Config

```typescript
interface ConnectivityConfig {
  serverUrl: string;          // Server URL to check
  checkInterval?: number;     // How often to check (ms), default: 30000
  timeout?: number;           // Request timeout (ms), default: 5000
  retryAttempts?: number;     // Retry attempts, default: 3
  retryDelay?: number;        // Delay between retries (ms), default: 1000
}
```

### ApiClient Config

```typescript
interface ApiClientConfig {
  baseUrl: string;            // API base URL
  timeout?: number;           // Request timeout (ms), default: 30000
  headers?: Record<string, string>; // Custom headers
  retryAttempts?: number;     // Retry attempts, default: 3
  retryDelay?: number;        // Delay between retries (ms), default: 1000
}
```

## Best Practices

1. **Initialize Early**: Set up the DataSourceManager in your app's initialization phase
2. **Listen to Changes**: Subscribe to connection state changes to update UI accordingly
3. **Handle Both Sources**: Write code that can work with both server API and local database
4. **Sync Strategy**: Implement a sync queue for operations performed offline
5. **Error Handling**: Always handle errors for both data sources
6. **Cleanup**: Call `destroy()` on managers when unmounting/closing

## Examples

### React Hook (Desktop/Web)

```typescript
import { useEffect, useState } from 'react';
import { getDataSourceManager, ConnectionState } from '@monorepo/shared-data-access';

export function useConnectionState() {
  const [state, setState] = useState<ConnectionState | null>(null);

  useEffect(() => {
    const manager = getDataSourceManager();

    // Subscribe to changes
    const unsubscribe = manager.onConnectionChange((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}
```

### Conditional Data Fetching

```typescript
async function getCustomers(limit: number = 10) {
  const manager = getDataSourceManager();
  const state = manager.getConnectionState();

  if (state.dataSource === 'server') {
    // Fetch from server
    const api = getApiClient();
    return await api.get<Customer[]>('/api/customers', { limit });
  } else {
    // Fetch from local database
    const db = createLocalDbClient('desktop', { dbPath: './cpos.db' });
    await db.initialize();
    const customers = await db.query<Customer>(
      'SELECT * FROM customers LIMIT ?',
      [limit]
    );
    await db.close();
    return customers;
  }
}
```

## TODO

- [ ] Implement `WebIndexedDbClient` for browser-based apps
- [ ] Implement `MobileSqliteClient` for React Native apps
- [ ] Add sync queue management for offline operations
- [ ] Add conflict resolution for sync conflicts
- [ ] Add data migration utilities
- [ ] Add comprehensive unit tests
- [ ] Add E2E tests for connectivity switching

## License

MIT
