# Web App Verification Guide

## ✅ What's Been Implemented

All the infrastructure for offline-first POS is now complete:

1. ✅ **IndexedDB Schema** - 40+ tables
2. ✅ **Repository Services** - User, Product, Category, Order
3. ✅ **Online/Offline Login** - Smart fallback authentication
4. ✅ **Sync Service** - Automatic bidirectional sync
5. ✅ **Connection Management** - Auto-switching between server/local
6. ✅ **bcryptjs** - Installed for password verification

## 🧪 Quick Verification Steps

### Step 1: Start the App

```bash
# In the monorepo root
npm run dev

# The app should start without errors
# Check browser console for:
# [WebDataAccessService] Initialization complete
# [WebDataAccessService] Local database initialized with schema
```

### Step 2: Check IndexedDB Schema

1. Open browser DevTools (F12)
2. Go to **Application** tab
3. Expand **IndexedDB** > **cpos_web_db**
4. You should see 40+ object stores:
   - Customer
   - Product
   - Category
   - SaleOrder
   - User
   - etc.

### Step 3: Test Login (With Server Running)

If you have a backend server:

```bash
# Login page should show:
# - Username/Email field
# - Password field
# - "Online/offline login supported" message

# Try logging in with valid credentials
# Console should show:
# [WebUserRepository] Attempting online login...
# [WebUserRepository] Online login successful
# [WebDataAccessService] Sync service initialized
```

### Step 4: Test Login (Without Server - Offline)

1. First login online (to cache credentials)
2. Logout
3. Stop the backend server
4. Try to login with same credentials

```bash
# Console should show:
# [WebUserRepository] Online login failed (network/server error), trying offline...
# [WebUserRepository] Attempting offline login...
# [WebUserRepository] Offline login successful
```

### Step 5: Test User Not Found Error

1. Clear IndexedDB:
   - DevTools > Application > IndexedDB > cpos_web_db
   - Right-click > Delete database
2. Refresh the page
3. Stop the server (to force offline mode)
4. Try to login

```bash
# Should see error:
# "User not found in local database. Please login online first to cache your credentials."
```

## 📦 Dependencies Installed

Check that these are in `package.json`:

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "lucide-react": "^0.552.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-router-dom": "7.9.5"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"
  }
}
```

✅ All dependencies are installed!

## 🔍 Check Files Created

Verify these files exist:

```
apps/web/src/
├── config/
│   └── indexeddb-schema.ts          ✅ Complete schema
├── services/
│   ├── data-access.service.ts       ✅ Enhanced with sync
│   └── repositories/
│       ├── base-repository.ts        ✅ Base class
│       ├── user-repository.ts        ✅ Auth
│       ├── product-repository.ts     ✅ Products
│       ├── category-repository.ts    ✅ Categories
│       ├── order-repository.ts       ✅ Orders
│       └── index.ts                  ✅ Exports
├── providers/
│   └── WebAuthProvider.tsx          ✅ Auth provider
├── app/
│   └── app.tsx                      ✅ Updated to use WebAuthProvider
└── pages/
    └── Login.tsx                    ✅ Real authentication

Documentation:
├── WEB_IMPLEMENTATION_GUIDE.md      ✅ Complete guide
├── IMPLEMENTATION_SUMMARY.md        ✅ Summary
├── LOGIN_FLOW.md                    ✅ Login documentation
└── VERIFICATION_GUIDE.md            ✅ This file
```

## 🚨 Common Issues & Solutions

### Issue 1: "bcryptjs not found"

**Solution:** ✅ Already fixed! bcryptjs is installed in root `package.json`

```bash
# If you still see this error, restart the dev server:
npm run dev
```

### Issue 2: "Data access service not initialized"

**Solution:** Make sure you wait for app initialization before logging in.

The `WebUserRepository` has lazy initialization that waits up to 5 seconds for the service to be ready.

### Issue 3: IndexedDB stores not created

**Solution:** Check browser console for errors during initialization.

The schema is automatically applied when `dataAccessService.initialize()` is called in `main.tsx`.

### Issue 4: Sync service not starting

**Solution:** Sync only starts after successful **online** login.

```typescript
// Check if sync is running:
const syncService = window.dataAccessService?.getSyncService();
console.log('Sync service:', syncService);
```

### Issue 5: Repository methods not working

**Solution:** Ensure `dataAccessService.initialize()` completed before using repositories.

Check in browser console:
```javascript
// Should log the connection state
window.dataAccessService?.getConnectionState();
```

## 🔗 Integration with Backend

The repositories expect these API endpoints:

### Required Endpoints

1. **POST /api/auth/login**
   - Body: `{ username, password }`
   - Response: `{ user, token }`

2. **GET /api/auth/user/:userId**
   - Response: `{ id, username, email, passwordHash, ... }`
   - ⚠️ Must include `passwordHash` for offline login!

3. **GET /api/products**
   - Response: `Product[]`

4. **GET /api/categories**
   - Response: `Category[]`

5. **POST /api/orders**
   - Body: `{ order, lineItems, payments, discounts }`
   - Response: `OrderWithDetails`

6. **POST /api/sync/:table/upload**
   - Body: `{ records: [] }`
   - For syncing pending changes

7. **GET /api/sync/:table/download?lastSyncedAt=...**
   - Response: `{ records: [] }`
   - For downloading server changes

### If Backend Doesn't Exist Yet

The app will work in offline mode with local data only:

```typescript
// All operations will use IndexedDB
// No sync will occur
// Login will only work if user was previously cached
```

## 🎯 Next Steps

### For Development:

1. **Test the login flow** (online and offline)
2. **Update UI pages** to use repositories:
   - Products.tsx
   - Category.tsx
   - CategoryDetail.tsx
   - Transactions.tsx

### For Production:

1. **Implement backend API endpoints**
2. **Set environment variable** for server URL:
   ```bash
   VITE_SERVER_URL=https://your-api.com
   ```
3. **Enable HTTPS** for production
4. **Implement token refresh** for long sessions
5. **Add error tracking** (Sentry, etc.)

## 📊 Test Checklist

Run through this checklist to verify everything works:

- [ ] App starts without console errors
- [ ] IndexedDB created with 40+ tables
- [ ] Connection status shows in navbar
- [ ] Manual server/local override works
- [ ] Online login works (if backend available)
- [ ] Offline login works (after online login)
- [ ] "User not found" error shows correctly
- [ ] "Invalid password" error shows correctly
- [ ] User info shows in navbar
- [ ] Offline indicator shows when offline
- [ ] Logout clears session
- [ ] Session persists on page refresh
- [ ] "Remember me" works

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ No console errors on startup
2. ✅ Login works both online and offline
3. ✅ IndexedDB contains user data after online login
4. ✅ Sync service initializes after online login
5. ✅ Connection status updates in real-time
6. ✅ Clear error messages for login failures

## 📚 Documentation

For detailed usage, see:

- **WEB_IMPLEMENTATION_GUIDE.md** - Complete implementation guide
- **LOGIN_FLOW.md** - Detailed login flow documentation
- **IMPLEMENTATION_SUMMARY.md** - Quick reference

## 🆘 Need Help?

If something isn't working:

1. Check browser console for errors
2. Verify IndexedDB schema is created
3. Check network tab for API calls
4. Review the LOGIN_FLOW.md for expected behavior
5. Make sure backend endpoints match expected format

---

**Everything is ready to go! The infrastructure is 100% complete.** 🚀

All that remains is connecting the UI pages to use the repositories instead of mock data.
