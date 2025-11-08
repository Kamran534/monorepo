# Connection Status Testing Guide

## Prerequisites

1. **Server is running** at `http://localhost:4000`
   ```bash
   cd monorepo/pos-server
   npm run start:dev
   ```

2. **Database exists** at `apps/desktop/libsdb/cpos.db`
   - Should have been created earlier with the schema

3. **Dependencies installed**
   ```bash
   cd monorepo/apps/desktop
   npm install
   ```

## How to Test

### 1. Start the Desktop App

```bash
cd monorepo/apps/desktop
npm run dev
```

### 2. Check Console Logs

You should see logs like this in the terminal:

```
[DataAccessService] Initializing...
[DataAccessService] Server URL: http://localhost:4000
[DataAccessService] Database Path: C:\...\apps\desktop\libsdb\cpos.db
[DataAccessService] Local database initialized
[DataAccessService] API client initialized
[DataSourceManager] Initializing...
[DataSourceManager] Server URL: http://localhost:4000
🟢 [CONNECTION STATUS] 🟢
   Status: online
   Data Source: 🌐 SERVER
   Server URL: http://localhost:4000
   Last Checked: 11/8/2025, 8:13:58 PM
```

### 3. Test the UI

Look for the connection indicator in the top-right navbar:

- **Green WiFi icon + "Server"** = Connected to server ✅
- **Red WiFi icon + "Local"** = Using local database ⚠️
- **Amber/Yellow WiFi icon + "Local"** = Status unknown ⚠️

### 4. Click the Connection Icon

A dropdown menu should appear with:

1. **Connection Status section:**
   - Current status (with colored dot)
   - Data source (Server/Local Database icons)
   - Last checked time
   - Manual override indicator (if active)

2. **Manual Control section:**
   - "Connect to Server" button
   - "Use Local Database" button
   - "Enable Auto-Switch" button (if manual mode is active)

### 5. Test Manual Switch

Click "Use Local Database":
- Icon should turn red/amber
- Text should change to "Local"
- Status should update

Click "Connect to Server":
- If server is running: Icon should turn green, text shows "Server"
- If server is offline: Should stay on local with error message

## Troubleshooting

### Issue: "Connection API not available"

**Solution 1: Restart the app**
```bash
# Stop the app (Ctrl+C)
# Rebuild
npm run build
# Start again
npm run dev
```

**Solution 2: Check Console**
Open DevTools in the app (it should open automatically) and check console for errors:
- Press `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac)
- Look for any errors in the Console tab

**Solution 3: Verify preload script**
Check that `dist/preload/preload.mjs` exists after build:
```bash
ls dist/preload/
```

### Issue: Status shows "unknown"

**Possible causes:**
1. Server is not running at `http://localhost:4000`
2. Server `/api/health` endpoint is not responding
3. Network connectivity issue

**Test server manually:**
```bash
curl http://localhost:4000/api/health
```
Should return `200 OK`

### Issue: Database errors

**Solution: Verify database exists**
```bash
ls libsdb/cpos.db
# If missing, recreate it:
cd libsdb
sqlite3 cpos.db < schema.sql
```

### Issue: Can't switch between server and local

**Check:**
1. Settings are being saved: Look for `connection-settings.json` in app's userData directory
2. Manual override is working: Check console logs for "[DataAccessService] Manual override enabled"

## Expected Behavior

### When Server is Online
- Automatic mode: Uses server (green icon)
- Manual "Local" mode: Uses local database despite server being online
- Manual "Server" mode: Uses server

### When Server is Offline
- Automatic mode: Uses local database (red/amber icon)
- Manual "Local" mode: Uses local database
- Manual "Server" mode: Tries server, fails, shows error

### Settings Persistence
- Manual override setting is saved to disk
- Persists across app restarts
- Location: `%APPDATA%/desktop/connection-settings.json` (Windows)

## Advanced Debugging

### Enable Verbose Logging

The app already has extensive logging. Check terminal output for:
- `[DataAccessService]` - Main service logs
- `[DataSourceManager]` - Connection manager logs
- `[IPC]` - Communication between main and renderer
- `[ConnectionStatus]` - UI component logs

### Test IPC Manually

In the DevTools console (renderer process), try:
```javascript
// Check if API is available
console.log('electronAPI:', window.electronAPI);

// Get current state
window.electronAPI.connection.getState().then(console.log);

// Manual check
window.electronAPI.connection.check().then(console.log);

// Switch to server
window.electronAPI.connection.setManual('server').then(console.log);

// Switch to local
window.electronAPI.connection.setManual('local').then(console.log);

// Enable auto-switch
window.electronAPI.connection.setManual(null).then(console.log);
```

### Check Main Process Logs

Look at the terminal where you ran `npm run dev` for main process logs.

## Connection State Diagram

```
┌─────────────┐
│   APP START │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│ Load saved settings          │
│ - Manual override?           │
│ - Preferred data source?     │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Check server connectivity    │
│ GET /api/health              │
└──────┬───────────────────────┘
       │
       ├─── Online ────┐
       │               ▼
       │         ┌──────────────────┐
       │         │ Use SERVER       │
       │         │ (if no manual    │
       │         │  override)       │
       │         └──────────────────┘
       │
       └─── Offline ───┐
                       ▼
                 ┌──────────────────┐
                 │ Use LOCAL DB     │
                 │ (fallback)       │
                 └──────────────────┘
```

## Files Involved

1. **Main Process:**
   - `src/main/main.ts` - IPC handlers
   - `src/main/services/data-access.service.ts` - Connection logic

2. **Preload:**
   - `src/preload/preload.ts` - Exposes API to renderer

3. **Renderer:**
   - `src/renderer/components/ConnectionStatus.tsx` - UI component
   - `src/renderer/electron.d.ts` - TypeScript types

4. **Shared Library:**
   - `libs/shared/data-access/` - Core connection management

## Success Criteria

✅ Green icon shows when server is online
✅ Red/amber icon shows when server is offline
✅ Can manually switch between server and local
✅ Settings persist across app restarts
✅ Dropdown menu shows current status
✅ Auto-switch can be enabled/disabled
✅ No errors in console

## Next Steps

If everything works:
1. The connection indicator is now functional
2. You can manually control data source
3. Settings are persisted
4. Ready to implement actual data operations using the selected source
