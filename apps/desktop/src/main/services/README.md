# Desktop Data Access Service

This directory contains the data access service that integrates the shared `@monorepo/shared-data-access` library with the desktop Electron app.

## Setup

### 1. Install Dependencies

Add `better-sqlite3` to the desktop app:

```bash
cd apps/desktop
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

### 2. Initialize the Service

In your main process (`main.ts`), initialize the data access service:

```typescript
import { app } from 'electron';
import { dataAccessService } from './services/data-access.service';

app.whenReady().then(async () => {
  // Initialize data access service
  try {
    await dataAccessService.initialize();
    console.log('Data access service ready');
  } catch (error) {
    console.error('Failed to initialize data access service:', error);
  }

  // Your other initialization code...
});

// Clean up on app quit
app.on('will-quit', async () => {
  await dataAccessService.destroy();
});
```

### 3. Use the Service

#### Get Connection State

```typescript
const state = dataAccessService.getConnectionState();
console.log('Status:', state.status); // online, offline, checking, unknown
console.log('Data Source:', state.dataSource); // server, local
```

#### Subscribe to Connection Changes

```typescript
dataAccessService.onConnectionChange((state) => {
  console.log('Connection changed:', state);

  // Send to renderer process via IPC
  mainWindow.webContents.send('connection-state-changed', state);
});
```

#### Use Local Database

```typescript
const db = dataAccessService.getLocalDb();

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
```

#### Use API Client

```typescript
const api = dataAccessService.getApiClient();

// Set auth token
dataAccessService.setAuthToken('your-jwt-token');

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
```

#### Automatic Data Source Switching

```typescript
// Get the current data client based on connectivity
const { source, db, api } = dataAccessService.getCurrentDataClient();

if (source === 'server' && api) {
  // Use API
  const data = await api.get('/api/products');
} else if (source === 'local' && db) {
  // Use local database
  const data = await db.query('SELECT * FROM products');
}
```

## Environment Variables

Create a `.env` file in the desktop app root:

```env
SERVER_URL=http://localhost:4000
```

## Database Path

The database is located at:
```
apps/desktop/libsdb/cpos.db
```

This path is automatically resolved relative to the app's userData directory.

## IPC Communication

To expose the data access service to the renderer process, add IPC handlers in `preload/index.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('dataAccess', {
  getConnectionState: () => ipcRenderer.invoke('data-access:get-state'),
  onConnectionChange: (callback) => {
    ipcRenderer.on('connection-state-changed', (_, state) => callback(state));
  },
  checkConnectivity: () => ipcRenderer.invoke('data-access:check'),
});
```

And in `main.ts`:

```typescript
import { ipcMain } from 'electron';

ipcMain.handle('data-access:get-state', () => {
  return dataAccessService.getConnectionState();
});

ipcMain.handle('data-access:check', async () => {
  return await dataAccessService.checkConnectivity();
});
```

## Features

- ✅ Automatic server connectivity detection
- ✅ Seamless switching between server and local database
- ✅ SQLite for offline storage
- ✅ RESTful API client with retry logic
- ✅ Real-time connection state updates
- ✅ Transaction support
- ✅ Authentication token management

## Troubleshooting

### Database not found

Make sure the database file exists at `apps/desktop/libsdb/cpos.db`. You can create it by running:

```bash
cd apps/desktop/libsdb
sqlite3 cpos.db < schema.sql
```

### Server not reachable

Check that:
1. The server is running at `http://localhost:4000`
2. The `/health` endpoint is accessible
3. CORS is configured if needed

### better-sqlite3 installation issues

On Windows, you may need to install build tools:

```bash
npm install --global windows-build-tools
```

On Linux:

```bash
sudo apt-get install build-essential
```

On macOS:

```bash
xcode-select --install
```
