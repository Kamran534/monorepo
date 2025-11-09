# Connection & Switching Integration Module

## Overview

The connection and switching module has been organized into the `integration` folder for better structure and maintainability.

## Folder Structure

```
libs/shared/data-access/src/lib/
├── integration/                    # Connection & Switching Module
│   ├── connectivity-checker.ts     # Server connectivity checking
│   ├── data-source-manager.ts      # Data source switching logic
│   ├── index.ts                   # Module exports
│   └── README.md                  # Module documentation
├── repos/                          # Data Repositories
│   ├── userRepository.ts         # User authentication repository
│   └── index.ts
├── sync/                           # Database Sync Module
│   ├── sync-service.ts
│   ├── types.ts
│   └── ...
├── local-db-client.ts              # Local database clients
├── remote-api-client.ts            # Remote API client
└── types.ts                        # Shared types
```

## Integration Module Contents

### 1. ConnectivityChecker (`integration/connectivity-checker.ts`)

**Purpose:** Checks if the server is online/offline

**Features:**
- Single connectivity check
- Retry logic with configurable attempts
- Periodic connectivity monitoring
- Latency measurement
- Configurable timeouts and intervals

**Usage:**
```typescript
import { ConnectivityChecker } from '@monorepo/shared-data-access';

const checker = new ConnectivityChecker({
  serverUrl: 'http://localhost:4000',
  checkInterval: 30000,
  timeout: 5000,
});

const result = await checker.checkConnectivity();
console.log('Server online:', result.isOnline);
```

### 2. DataSourceManager (`integration/data-source-manager.ts`)

**Purpose:** Manages switching between server and local database

**Features:**
- Automatic switching based on connectivity
- Manual override capability
- Connection state tracking
- Event notifications for state changes
- Periodic connectivity monitoring

**Usage:**
```typescript
import { DataSourceManager, DataSource } from '@monorepo/shared-data-access';

const manager = new DataSourceManager({
  serverUrl: 'http://localhost:4000',
});

await manager.initialize();

// Get current state
const state = manager.getConnectionState();
console.log('Status:', state.status); // ONLINE, OFFLINE, CHECKING
console.log('Data Source:', state.dataSource); // SERVER or LOCAL

// Subscribe to changes
manager.onConnectionChange((state) => {
  console.log('Connection changed:', state);
});

// Manual switch
manager.switchDataSource(DataSource.LOCAL);
```

## Exports

All integration module exports are available from the main package:

```typescript
import {
  // Connectivity Checker
  ConnectivityChecker,
  getConnectivityChecker,
  resetConnectivityChecker,
  
  // Data Source Manager
  DataSourceManager,
  getDataSourceManager,
  resetDataSourceManager,
  
  // Types
  ConnectionStatus,
  DataSource,
  ConnectionState,
  ConnectivityConfig,
} from '@monorepo/shared-data-access';
```

## Integration with Desktop App

The desktop app uses these modules via `DataAccessService`:

```typescript
// In main process
import { getDataSourceManager } from '@monorepo/shared-data-access';

const manager = getDataSourceManager({
  serverUrl: 'http://localhost:4000',
  checkInterval: 30000,
});

await manager.initialize();

// Get connection state
const state = manager.getConnectionState();

// Subscribe to changes
manager.onConnectionChange((state) => {
  // Notify renderer via IPC
  mainWindow.webContents.send('connection:state-changed', state);
});
```

## Connection States

### ConnectionStatus Enum
- `ONLINE` - Server is reachable and responding
- `OFFLINE` - Server is unreachable
- `CHECKING` - Currently checking connectivity
- `UNKNOWN` - Initial state, not yet checked

### DataSource Enum
- `SERVER` - Using remote server API (PostgreSQL)
- `LOCAL` - Using local SQLite database

## Auto-Switching Behavior

**When Enabled (Default):**
- Server Online → Automatically switches to `SERVER` data source
- Server Offline → Automatically switches to `LOCAL` data source

**When Disabled:**
- Data source remains as manually set
- Connectivity is still checked and status updated
- Useful for forcing offline mode or testing

## Configuration

```typescript
interface ConnectivityConfig {
  serverUrl?: string;        // Server URL (default: http://localhost:4000)
  checkInterval?: number;    // Check interval in ms (default: 30000)
  timeout?: number;          // Request timeout in ms (default: 5000)
  retryAttempts?: number;    // Number of retries (default: 3)
  retryDelay?: number;       // Delay between retries in ms (default: 1000)
}
```

## Benefits of New Structure

1. **Better Organization**: Connection-related code is grouped together
2. **Clear Separation**: Integration logic separate from core data access
3. **Easier Maintenance**: Related files in one folder
4. **Better Documentation**: Module-specific README
5. **Cleaner Imports**: Clear module boundaries

## Migration Notes

All existing imports continue to work - the module exports from the main index file remain the same. The internal structure has been reorganized for better maintainability.

