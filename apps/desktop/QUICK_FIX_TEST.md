# Quick Test - Connection Status Fix

## What Was Fixed

1. ✅ Added extensive logging to preload script
2. ✅ Added API verification in HTML before React loads
3. ✅ Rebuilt app with all changes

## Test Now

### 1. Make sure server is running
```bash
# In terminal 1
cd monorepo/pos-server
npm run start:dev
```

### 2. Start desktop app with DevTools open
```bash
# In terminal 2
cd monorepo/apps/desktop
npm run dev
```

### 3. Check Console Logs (CRITICAL)

**The DevTools console should automatically open. Look for these logs:**

#### Preload Script Logs (should appear FIRST):
```
[Preload] Script starting...
[Preload] Exposed electron API
[Preload] Exposed electronAPI with connection API
[Preload] electronAPI.connection methods: [...]
[Preload] Script completed successfully
```

#### HTML Verification Logs (should appear SECOND):
```
[HTML] Document loaded, checking for electronAPI...
[HTML] ✅ electronAPI is available
[HTML] ✅ electronAPI.connection is available
[HTML] Connection methods: ['getState', 'setManual', 'getManualOverride', 'check', 'onStateChange']
[HTML] API Check: { hasElectronAPI: true, hasConnection: true, ... }
```

#### Main Process Logs (in terminal):
```
🟢 [CONNECTION STATUS] 🟢
   Status: online
   Data Source: 🌐 SERVER
   Server URL: http://localhost:4000
```

#### React Component Logs:
```
[ConnectionStatus] Waiting for electronAPI...
[ConnectionStatus] electronAPI is now available
[ConnectionStatus] Received state from IPC: { status: 'online', ... }
```

### 4. What to Look For

**✅ SUCCESS - If you see:**
- Green WiFi icon in navbar (top right)
- Text says "Server"
- No error dialog appears
- Console shows all the logs above

**❌ FAILURE - If you see:**
- Red/amber icon or "Error" text
- Dialog: "Connection API not available"
- Console shows: `[HTML] ❌ electronAPI is NOT available!`

### 5. If It Still Fails

**Check in DevTools Console:**

```javascript
// Run this in the console
console.log('API Check:', window.__electronAPICheck);
console.log('electronAPI:', window.electronAPI);
console.log('electronAPI.connection:', window.electronAPI?.connection);

// Try calling the API directly
window.electronAPI.connection.getState().then(console.log).catch(console.error);
```

**Expected output:**
```javascript
{
  hasElectronAPI: true,
  hasConnection: true,
  connectionMethods: ['getState', 'setManual', 'getManualOverride', 'check', 'onStateChange'],
  timestamp: '2025-11-08T...'
}
```

### 6. Manual Test

If the UI doesn't show it correctly, test manually in console:

```javascript
// Get current state
await window.electronAPI.connection.getState()
// Should return: { status: 'online', dataSource: 'server', ... }

// Switch to local
await window.electronAPI.connection.setManual('local')

// Switch to server
await window.electronAPI.connection.setManual('server')

// Enable auto-switch
await window.electronAPI.connection.setManual(null)
```

## Common Issues & Solutions

### Issue: No preload logs appear
**Cause:** Preload script not loading
**Solution:** Check `dist/preload/preload.mjs` exists
```bash
ls dist/preload/
```

### Issue: electronAPI is undefined
**Cause:** Context isolation issue or preload path wrong
**Solution:** Check main.ts has correct preload path:
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/preload.mjs'),
  contextIsolation: true,
  nodeIntegration: false,
}
```

### Issue: Connection API returns errors
**Cause:** Server not running or IPC handler issue
**Solution:**
1. Verify server: `curl http://localhost:4000/api/health`
2. Check terminal for main process errors

## Debugging Steps

1. **Check preload built correctly:**
   ```bash
   cat dist/preload/preload.mjs | grep "Preload"
   ```
   Should show the logging code.

2. **Check HTML has verification:**
   ```bash
   cat dist/renderer/index.html | grep "electronAPI"
   ```
   Should show the verification script.

3. **Check main process:**
   Look at terminal running `npm run dev` for any errors.

4. **Force refresh:**
   - Close app
   - Delete `dist` folder
   - Run `npm run build`
   - Run `npm run dev`

## Success Indicators

✅ Preload logs appear in console
✅ HTML verification passes
✅ No error dialogs
✅ Green icon shows when server is online
✅ Can click icon and see dropdown menu
✅ Can manually switch between server/local
✅ Settings persist after restart

If you see ALL these, the fix worked! 🎉
