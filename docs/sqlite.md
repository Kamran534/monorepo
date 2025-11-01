# SQLite Database Setup

Shared database abstraction in `libs/db` providing platform-appropriate SQLite drivers with error handling and resource management.

## Quick Start

```typescript
import { getDatabase, DatabaseError } from '@monorepo/db';

const db = getDatabase();
await db.connect();
const count = await db.getCounter();
```

**API:** `connect()`, `isConnected()`, `getCounter()`, `increment()`, `decrement()`

## Platform Drivers

| Platform | Driver | Location |
|----------|--------|----------|
| **Desktop** | `better-sqlite3` (main process via IPC) | `app.getPath('userData')/payflow.db` |
| **Mobile** | `react-native-sqlite-storage` | App sandbox (`payflow.db`) |
| **Web** | `sql.js` (SQLite compiled to WebAssembly) | IndexedDB (`payflow.db`) |

## Desktop (Electron)

**Architecture:**
- Database initialized once at app startup (outside `createWindow()`)
- WAL mode enabled for better concurrency
- IPC channels: `db/connect`, `db/getCounter`, `db/increment`, `db/decrement`
- Database closed gracefully on app quit

**Files:**
- Main: `apps/desktop/src/main/main.ts`
- Preload: `apps/desktop/src/preload/preload.ts`
- Renderer: `apps/desktop/src/renderer/main.tsx`

**Build Note:** Run `npx electron-rebuild -f -w better-sqlite3` after `npm install` to compile native module for Electron.

```sh
npm run start:desktop
```

## Web

**Architecture:**
- Real SQLite via `sql.js` (compiled to WebAssembly)
- Database persisted to IndexedDB for offline support
- Full SQL support (queries, transactions, indexes)
- WASM file loaded from CDN (can be served locally for full offline)

**Features:**
- ✅ Real SQLite database with full SQL support
- ✅ Persistent storage via IndexedDB (~50MB+ capacity)
- ✅ Works completely offline
- ✅ Automatic save after each operation
- ✅ Schema matching desktop/mobile (`kv` table)

```sh
npm run start:web
```

## Mobile

Uses `react-native-sqlite-storage` in app sandbox.

```sh
npm run start:mobile
npm run mobile:android  # or mobile:ios (macOS required)
```

## Error Handling

All operations throw `DatabaseError` with error codes:

**Electron:** `IPC_CONNECT_ERROR`, `IPC_GET_COUNTER_ERROR`, `IPC_INCREMENT_ERROR`, `IPC_DECREMENT_ERROR`

**React Native:** `RN_CONNECT_ERROR`, `RN_DB_NOT_INITIALIZED`, `RN_SCHEMA_ERROR`, `RN_READ_ERROR`, `RN_WRITE_ERROR`, `RN_NOT_CONNECTED`

**Web (sql.js):** `WEB_DB_CONNECT_ERROR`, `WEB_INDEXEDDB_OPEN_ERROR`, `WEB_INDEXEDDB_LOAD_ERROR`, `WEB_INDEXEDDB_SAVE_ERROR`, `WEB_DB_NOT_INITIALIZED`, `WEB_SQL_EXEC_ERROR`, `WEB_SQL_RUN_ERROR`, `WEB_DB_PERSIST_ERROR`, `WEB_GET_COUNTER_ERROR`, `WEB_INCREMENT_ERROR`, `WEB_DECREMENT_ERROR`, `WEB_NOT_CONNECTED`

**Best Practices:**
- Always wrap operations in try-catch blocks
- Display user-friendly error messages
- Handle loading states in UI
- Cleanup in `useEffect` to prevent memory leaks

## Troubleshooting

**Desktop:**
- Database locked → Close other instances
- Native module error → Run `npx electron-rebuild -f -w better-sqlite3`

**Mobile:**
- Import errors → Ensure `react-native-sqlite-storage` is installed/linked
- Connection errors → Check file system permissions

**Web:**
- IndexedDB unavailable → Check browser settings or private/incognito mode
- WASM loading error → Check network connection (WASM loaded from CDN)
- Database load error → Try clearing IndexedDB storage
