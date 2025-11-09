# Connection & Switching Integration Module

This module handles server connectivity checking and automatic switching between online (server) and offline (local database) modes.

## Overview

The integration module provides:
- **Connectivity Checking**: Monitors server availability
- **Data Source Switching**: Automatically switches between server and local database
- **Connection State Management**: Tracks and notifies about connection changes
- **Manual Override**: Allows manual control of data source

## Components

### 1. ConnectivityChecker

Checks if the server is online by pinging the health endpoint.

**Features:**
- Periodic connectivity checks
- Retry logic for transient failures
- Latency measurement
- Configurable check intervals

**Usage:**
```typescript
import { ConnectivityChecker } from '@monorepo/shared-data-access';

const checker = new ConnectivityChecker({
  serverUrl: 'http://localhost:4000',
  checkInterval: 30000, // 30 seconds
  timeout: 5000,
  retryAttempts: 3,
});

// Single check
const result = await checker.checkConnectivity();
console.log('Server online:', result.isOnline);

// Periodic checks
checker.startPeriodicCheck((result) => {
  console.log('Connection status:', result.isOnline);
});
```

### 2. DataSourceManager

Manages switching between server and local database based on connectivity.

**Features:**
- Automatic switching based on connectivity
- Manual override capability
- Connection state tracking
- Event notifications for state changes

**Usage:**
```typescript
import { DataSourceManager } from '@monorepo/shared-data-access';

const manager = new DataSourceManager({
  serverUrl: 'http://localhost:4000',
  checkInterval: 30000,
});

await manager.initialize();

// Get current state
const state = manager.getConnectionState();
console.log('Status:', state.status); // ONLINE, OFFLINE, CHECKING, UNKNOWN
console.log('Data Source:', state.dataSource); // SERVER or LOCAL

// Subscribe to changes
manager.onConnectionChange((state) => {
  console.log('Connection changed:', state);
});

// Manual switch
manager.switchDataSource(DataSource.LOCAL);

// Disable auto-switch
manager.setAutoSwitch(false);
```

## Connection States

### ConnectionStatus
- `ONLINE` - Server is reachable
- `OFFLINE` - Server is unreachable
- `CHECKING` - Currently checking connectivity
- `UNKNOWN` - Initial state, not yet checked

### DataSource
- `SERVER` - Using remote server API
- `LOCAL` - Using local SQLite database

## Auto-Switching Behavior

When auto-switch is enabled (default):
- **Server Online** → Automatically switches to `SERVER` data source
- **Server Offline** → Automatically switches to `LOCAL` data source

When auto-switch is disabled:
- Data source remains as manually set
- Connectivity is still checked and status updated
- Useful for forcing offline mode or server mode

## Integration with Desktop App

The desktop app uses this module via `DataAccessService`:

```typescript
// In main process
import { getDataSourceManager } from '@monorepo/shared-data-access';

const manager = getDataSourceManager({
  serverUrl: 'http://localhost:4000',
});

await manager.initialize();

// Get connection state
const state = manager.getConnectionState();

// Subscribe to changes
manager.onConnectionChange((state) => {
  // Notify renderer process via IPC
  mainWindow.webContents.send('connection:state-changed', state);
});
```

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

## Best Practices

1. **Initialize Early**: Initialize DataSourceManager at app startup
2. **Monitor Changes**: Subscribe to connection changes to update UI
3. **Handle Offline**: Always have fallback logic for offline mode
4. **Manual Override**: Provide UI for users to manually switch if needed
5. **Error Handling**: Handle connection errors gracefully

## Examples

### Basic Usage

```typescript
import { 
  getDataSourceManager, 
  DataSource, 
  ConnectionStatus 
} from '@monorepo/shared-data-access';

const manager = getDataSourceManager();
await manager.initialize();

// Check if online
const state = manager.getConnectionState();
if (state.status === ConnectionStatus.ONLINE) {
  // Use server API
} else {
  // Use local database
}
```

### With Event Listeners

```typescript
const unsubscribe = manager.onConnectionChange((state) => {
  if (state.status === ConnectionStatus.ONLINE) {
    console.log('🟢 Server is online - using server API');
  } else {
    console.log('🔴 Server is offline - using local database');
  }
});

// Later, unsubscribe
unsubscribe();
```

### Manual Override

```typescript
// Force offline mode
manager.setAutoSwitch(false);
manager.switchDataSource(DataSource.LOCAL);

// Re-enable auto-switch
manager.setAutoSwitch(true);
```

