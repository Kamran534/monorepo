# Database Testing Guide

This guide explains how to verify that your POS database is set up correctly across all platforms.

## Quick Test Methods

### 1. ✅ **Console Logs (Easiest)**

Simply run any app and check the console for migration logs.

#### Desktop App
```bash
npm run dev:desktop
```

**Expected Output:**
```
[Database] Opening database at C:\Users\...\payflow\payflow.db
[Database] Database opened successfully
[Database] Running migrations...
[Migration] Starting database migrations...
[Migration] Applying 001: Initial POS Phase 1 Schema
[Migration] Executing 150 SQL statements...
[Migration] ✓ Successfully applied 001
[Migration] Applying 002: POS Phase 1 Views and Triggers
[Migration] ✓ Successfully applied 002
[Migration] Complete. Applied: 2, Skipped: 0
[Database] Initialized successfully
```

#### Mobile App
```bash
npm run start:mobile
# Then run on device/emulator
```

**Expected Output:**
```
[DbStatus] Running database migrations...
[Migration] Starting database migrations...
[Migration] Complete. Applied: 2, Skipped: 0
[DbStatus] Migrations complete
```

#### Web App
```bash
npm run dev:web
```

Open browser DevTools (F12) → Console tab

**Expected Output:**
```
[Migration] Starting database migrations...
[Migration] Complete. Applied: 2, Skipped: 0
```

---

### 2. 🔍 **Database Test Script (Detailed)**

Run the automated test script for comprehensive verification:

```bash
npx tsx scripts/test-database.ts
```

**What it tests:**
- ✅ Applied migrations
- ✅ Table count (should be ~32 tables)
- ✅ View count (should be 7 views)
- ✅ Lookup data (roles, permissions, statuses)
- ✅ Empty user tables (no sample data)
- ✅ Indexes and triggers
- ✅ Foreign key constraints
- ✅ Views functionality

**Expected Output:**
```
🔍 Database Setup Test

Database path: C:\Users\...\payflow\payflow.db

✅ Database connection successful

📋 Test 1: Check Applied Migrations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 2 applied migrations:
  ✓ Version 001: Initial POS Phase 1 Schema
    Applied at: 2024-11-03 12:00:00
  ✓ Version 002: POS Phase 1 Views and Triggers
    Applied at: 2024-11-03 12:00:01

📊 Test 2: Database Tables
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tables: 32
Total Views: 7

... (more details)

📝 SUMMARY
═══════════════════════════════════════
Migrations:  ✅ 2/2 applied
Tables:      ✅ 32/32 created
Views:       ✅ 7/7 created
Indexes:     ✅ 45 created
Triggers:    ✅ 6 created
Foreign Keys:✅ Enabled

🎉 Database setup is COMPLETE and WORKING!
```

---

### 3. 🌐 **Web Test Page (Browser-based)**

Open the web test page directly in your browser:

1. Navigate to the file in browser:
   ```
   C:\Users\kamra\Desktop\monorepo\monorepo\scripts\test-db-web.html
   ```

2. Or copy to your web app's public folder:
   ```bash
   cp scripts/test-db-web.html apps/web/public/test-db.html
   ```
   Then visit: `http://localhost:4200/test-db.html`

3. Click "Run Database Test" button

**What it tests:**
- ✅ IndexedDB storage
- ✅ Database loading from IndexedDB
- ✅ Tables and views
- ✅ Lookup data
- ✅ Database size

---

### 4. 🗄️ **Database Browser (Manual Inspection)**

Use a SQLite database browser to inspect the database directly:

#### Option A: DB Browser for SQLite (Recommended)
1. Download from: https://sqlitebrowser.org/
2. Open database file:
   - **Desktop**: `C:\Users\{username}\AppData\Roaming\payflow\payflow.db`
   - **Mobile**: Use device file explorer or Android Studio Device File Explorer
   - **Web**: Export from IndexedDB (see instructions below)

#### Option B: VS Code Extension
1. Install "SQLite Viewer" extension
2. Right-click database file → "Open with SQLite Viewer"

---

## Platform-Specific Testing

### Desktop (Electron)

**Test 1: Check Database File Exists**
```bash
# Windows
dir "%APPDATA%\payflow\payflow.db"

# Mac/Linux
ls ~/Library/Application\ Support/payflow/payflow.db
```

**Test 2: Query Database Directly**
```bash
# Install sqlite3 if needed
sqlite3 "%APPDATA%\payflow\payflow.db" "SELECT version, description FROM schema_migrations"
```

**Expected Output:**
```
001|Initial POS Phase 1 Schema
002|POS Phase 1 Views and Triggers
```

---

### Mobile (React Native)

**Test 1: Check App Logs**
```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

Look for `[DbStatus]` and `[Migration]` logs.

**Test 2: Device File Explorer**

**Android:**
1. Open Android Studio
2. View → Tool Windows → Device File Explorer
3. Navigate to: `/data/data/{your.app.id}/databases/payflow.db`
4. Right-click → Save As
5. Open with DB Browser

**iOS:**
1. Connect device
2. Open Xcode → Window → Devices and Simulators
3. Select your device → Installed Apps
4. Download container → Show package contents
5. Navigate to: `Documents/payflow.db`

---

### Web (Browser)

**Test 1: Check IndexedDB**

1. Open DevTools (F12)
2. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Expand "IndexedDB" → "payflow-sqlite" → "sqlite-dbs"
4. You should see "payflow.db" entry

**Test 2: Export Database**

Open DevTools Console and run:
```javascript
async function exportDB() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('payflow-sqlite', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const data = await new Promise((resolve, reject) => {
    const tx = db.transaction('sqlite-dbs', 'readonly');
    const store = tx.objectStore('sqlite-dbs');
    const request = store.get('payflow.db');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // Download as file
  const blob = new Blob([data], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'payflow.db';
  a.click();
}

exportDB();
```

This will download `payflow.db` which you can inspect with DB Browser.

---

## Verification Checklist

Use this checklist to verify your database setup:

### Schema Structure
- [ ] **32 tables** created
- [ ] **7 views** created
- [ ] **45+ indexes** created
- [ ] **6 triggers** created
- [ ] **Foreign keys** enabled

### Migrations
- [ ] **2 migrations** applied
- [ ] Migration 001: POS Phase 1 Schema
- [ ] Migration 002: Views and Triggers
- [ ] `schema_migrations` table exists

### Lookup Data (Pre-loaded)
- [ ] **4 roles** (Administrator, Store Manager, Cashier, Stock Clerk)
- [ ] **10 permissions** (View Products, Manage Products, etc.)
- [ ] **2 shift statuses** (Open, Closed)
- [ ] **3 order types** (Sale, Return, Exchange)
- [ ] **5 order statuses** (Draft, Open, Completed, Voided, Parked)
- [ ] **4 payment types** (Cash, Card, Digital, Other)
- [ ] **4 payment statuses** (Pending, Completed, Failed, Refunded)
- [ ] **8 inventory adjustment types**

### User Data (Should be Empty)
- [ ] **0 users** (no sample users)
- [ ] **0 locations** (no sample stores)
- [ ] **0 products** (no sample products)
- [ ] **0 categories** (no sample categories)
- [ ] **0 orders** (no sample transactions)

### Views (Should Work)
- [ ] `v_product_catalog` - Query returns empty result
- [ ] `v_inventory_status` - Query returns empty result
- [ ] `v_sales_order_summary` - Query returns empty result
- [ ] `v_order_details` - Query returns empty result
- [ ] `v_user_permissions` - Query returns empty result
- [ ] `v_daily_sales_summary` - Query returns empty result
- [ ] `v_payment_summary` - Query returns empty result

---

## Common Issues & Solutions

### Issue: "No migrations applied"

**Symptoms:**
- App starts but no migration logs
- `schema_migrations` table doesn't exist

**Solutions:**
1. Check if `db.runMigrations()` is called after `db.connect()`
2. Verify migration files exist in `libs/db/src/migrations/`
3. Check console for errors
4. Delete database and restart app to trigger fresh migration

---

### Issue: "Migration failed: SQL error"

**Symptoms:**
- Migration starts but crashes partway through
- Some tables created, others missing

**Solutions:**
1. Check migration SQL syntax
2. Look for duplicate table/column names
3. Verify foreign key references exist
4. Delete database and restart for clean migration

---

### Issue: "Database not persisting (Web only)"

**Symptoms:**
- Migrations run on every page reload
- Data disappears after closing browser

**Solutions:**
1. Check IndexedDB is enabled in browser
2. Verify not in private/incognito mode
3. Check browser storage quota not exceeded
4. Look for IndexedDB errors in console

---

### Issue: "Foreign key constraint failed"

**Symptoms:**
- Cannot insert data
- Error: "FOREIGN KEY constraint failed"

**Solutions:**
1. Verify `PRAGMA foreign_keys = ON` is set
2. Check parent record exists before inserting child
3. Verify foreign key columns match data types
4. Check migration created foreign keys correctly

---

## Manual Queries for Testing

Here are some useful queries to test your database:

### Check All Tables
```sql
SELECT name, type
FROM sqlite_master
WHERE type IN ('table', 'view')
AND name NOT LIKE 'sqlite_%'
ORDER BY type, name;
```

### Check Migration Status
```sql
SELECT * FROM schema_migrations ORDER BY migration_id;
```

### Check Roles and Permissions
```sql
SELECT
  r.role_name,
  GROUP_CONCAT(p.permission_name, ', ') as permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.permission_id
GROUP BY r.role_id;
```

### Check Table Row Counts
```sql
SELECT
  'users' as table_name,
  COUNT(*) as row_count
FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'sales_orders', COUNT(*) FROM sales_orders
UNION ALL
SELECT 'locations', COUNT(*) FROM locations;
```

### Verify Foreign Keys
```sql
PRAGMA foreign_key_list(users);
PRAGMA foreign_key_list(sales_orders);
PRAGMA foreign_key_list(product_variants);
```

---

## Next Steps After Verification

Once your database tests pass:

1. **Add Your First User** (Administrator)
2. **Create Store Locations**
3. **Set Up Product Categories**
4. **Import Products and Inventory**
5. **Configure Tax Rates**
6. **Customize Receipt Templates**

See the main README.md for detailed setup instructions.
