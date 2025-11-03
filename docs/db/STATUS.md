# Database Setup & Data Persistence Status

> **Last Updated**: November 3, 2024
> **Status**: ✅ Fully Configured

This document explains the database setup status and data persistence behavior across all platforms.

---

## ✅ Database Setup Status

**YES**, the database is fully set up for **ALL 3 apps**:

- ✅ **Desktop** (Electron) - Uses `better-sqlite3`
- ✅ **Web** (Browser) - Uses `sql.js` + IndexedDB
- ✅ **Mobile** (React Native) - Uses `react-native-sqlite-storage`

All apps use the **same schema** and run migrations automatically on first launch/login.

---

## 📦 Data Persistence After Reinstall

### Desktop App ✅ **DATA PERSISTS**

**Location:**
- **Windows**: `C:\Users\{username}\AppData\Roaming\payflow\payflow.db`
- **Mac**: `~/Library/Application Support/payflow/payflow.db`
- **Linux**: `~/.config/payflow/payflow.db`

**Behavior:**
- ✅ **Data survives app reinstall** (stored in user data folder, not app folder)
- ✅ **Data survives app updates**
- ❌ **Data deleted only if user manually deletes folder**

**Example:**
```
User installs app → Adds 100 products → Uninstalls app
User reinstalls app → All 100 products still there! ✅
```

---

### Mobile App ❌ **DATA DELETED ON UNINSTALL**

**Location:**
- **iOS**: App Sandbox `/Documents/payflow.db`
- **Android**: App Sandbox `/data/data/{app.package}/databases/payflow.db`

**Behavior:**
- ✅ **Data persists during app updates** (iOS/Android preserve app data during updates)
- ❌ **Data deleted when app is uninstalled** (standard mobile OS behavior)
- ✅ **Data remains on device between app launches**

**Example:**
```
User installs app → Adds 100 products → Closes app
User opens app again → All 100 products still there! ✅

User uninstalls app → Data is deleted ❌
User reinstalls app → Fresh database (no products) ❌
```

---

### Web App ⚠️ **DATA PERSISTS (unless cleared by user)**

**Location:**
- Browser IndexedDB: `payflow-sqlite` database
- Stored in browser's profile folder

**Behavior:**
- ✅ **Data persists between page reloads**
- ✅ **Data persists when browser is closed and reopened**
- ✅ **Data persists when user clears cache** (IndexedDB is separate from cache)
- ❌ **Data deleted if user clears "browsing data" or "site data"**
- ❌ **Data deleted if browser storage quota exceeded**
- ⚠️ **Data is per-browser** (Chrome data ≠ Firefox data)

**Example:**
```
User opens web app → Adds 100 products → Closes browser
User opens browser again → All 100 products still there! ✅

User clears browser data → Products deleted ❌
User uses different browser → Fresh database (different browser) ❌
```

---

## 🔄 Summary Table

| Platform | First Install | After Reinstall | After Update | User Clears Data |
|----------|---------------|-----------------|--------------|------------------|
| **Desktop** | ✅ Creates DB | ✅ **Keeps data** | ✅ **Keeps data** | ❌ Deletes only if manual |
| **Mobile** | ✅ Creates DB | ❌ **Fresh DB** | ✅ **Keeps data** | ❌ Deletes on uninstall |
| **Web** | ✅ Creates DB | ✅ **Keeps data** | ✅ **Keeps data** | ❌ Deletes if cleared |

---

## 🛡️ Solutions for Mobile Data Persistence

Since mobile apps **lose data on uninstall**, here are solutions:

### Option 1: Cloud Backup/Sync (Recommended for Production)

Add backup functionality to periodically sync data to cloud:

```typescript
// Backup to cloud storage (Firebase, AWS, etc.)
async function backupDatabase() {
  const db = getDatabase();
  const data = await exportDatabaseData(db);
  await uploadToCloud(userId, data);
}

// Restore on reinstall
async function restoreDatabase() {
  const data = await downloadFromCloud(userId);
  await importDatabaseData(db, data);
}
```

### Option 2: Device Backup (iOS/Android built-in)

Configure app to include database in device backups:

**iOS (iCloud Backup):**
- Database in `Documents/` folder is backed up automatically
- Restore happens automatically when user restores from iCloud

**Android (Auto Backup):**
- Add to `AndroidManifest.xml`:
```xml
<application
  android:allowBackup="true"
  android:fullBackupContent="@xml/backup_rules">
```

Create `res/xml/backup_rules.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <include domain="database" path="payflow.db"/>
</full-backup-content>
```

### Option 3: Export/Import Feature

Allow users to manually export/import their data:

```typescript
// Export database to file
async function exportToFile() {
  const db = getDatabase();
  const data = await db.export();
  await saveToDownloads('payflow-backup.db', data);
}

// Import from file
async function importFromFile(file) {
  const data = await readFile(file);
  await db.import(data);
}
```

---

## 🚀 How It Works on First Install/Login

### Desktop App - First Launch

```
1. User installs and launches app
2. App creates: %APPDATA%/payflow/payflow.db
3. Migrations run automatically (001 and 002)
4. Database ready with schema (no user data)
5. User logs in or creates account
6. Data is saved to database
7. ✅ Data persists forever (even after reinstall)
```

### Mobile App - First Launch

```
1. User installs and launches app
2. App creates: /app/databases/payflow.db
3. Migrations run automatically (001 and 002)
4. Database ready with schema (no user data)
5. User logs in or creates account
6. Data is saved to database
7. ✅ Data persists until app is uninstalled
```

### Web App - First Visit

```
1. User visits web app in browser
2. App creates IndexedDB: payflow-sqlite
3. Migrations run automatically (001 and 002)
4. Database ready with schema (no user data)
5. User logs in or creates account
6. Data is saved to IndexedDB
7. ✅ Data persists in that browser until cleared
```

---

## 🎯 Current Setup Summary

Based on what we implemented:

✅ **Database initializes automatically** when each app starts
✅ **Migrations run once** on first launch (tracked via `schema_migrations` table)
✅ **Schema is identical** across all platforms
✅ **No sample data** included (fresh install has empty user tables)

**Data Persistence:**
- ✅ **Desktop**: Data survives reinstall
- ❌ **Mobile**: Data deleted on uninstall (need backup solution)
- ⚠️ **Web**: Data persists unless user clears browser data

---

## 💡 Recommendations

For a **production POS system**, I recommend:

### 1. Desktop: Current setup is perfect ✅
- Data persists automatically
- Stored in user data folder
- Survives reinstalls and updates

### 2. Mobile: Add cloud backup/sync 🔄
- Implement periodic cloud backup
- Auto-restore on reinstall/login
- Allow manual export/import

### 3. Web: Add cloud sync + local storage 💾
- Use IndexedDB for offline capability
- Sync to cloud for multi-device access
- Warn users about clearing browser data

---

## 🗂️ Database File Locations Reference

### Desktop (Electron)

**Windows:**
```
C:\Users\{username}\AppData\Roaming\payflow\payflow.db
```

**macOS:**
```
~/Library/Application Support/payflow/payflow.db
```

**Linux:**
```
~/.config/payflow/payflow.db
```

### Mobile (React Native)

**iOS:**
```
/var/mobile/Containers/Data/Application/{UUID}/Documents/payflow.db
```

**Android:**
```
/data/data/{package.name}/databases/payflow.db
```

### Web (Browser)

**IndexedDB:**
```
Database Name: payflow-sqlite
Object Store: sqlite-dbs
Key: payflow.db
```

**Browser Storage Locations:**

- **Chrome (Windows)**: `C:\Users\{username}\AppData\Local\Google\Chrome\User Data\Default\IndexedDB`
- **Chrome (Mac)**: `~/Library/Application Support/Google/Chrome/Default/IndexedDB`
- **Firefox (Windows)**: `C:\Users\{username}\AppData\Roaming\Mozilla\Firefox\Profiles\{profile}\storage\default`
- **Firefox (Mac)**: `~/Library/Application Support/Firefox/Profiles/{profile}/storage/default`

---

## 🛠️ Future Enhancements

### Planned Features for Data Persistence

1. **Cloud Backup/Sync**
   - Firebase Firestore integration
   - AWS S3 backup
   - Automatic sync on data changes
   - Conflict resolution

2. **Export/Import**
   - Manual database export to file
   - Import from backup file
   - CSV export for reporting
   - JSON export for integration

3. **Multi-Device Sync**
   - Real-time sync across devices
   - Offline-first architecture
   - Conflict resolution
   - Selective sync

4. **Backup Scheduling**
   - Automatic daily backups
   - Backup retention policies
   - Backup compression
   - Incremental backups

---

## 🔧 Implementation Status

| Feature | Desktop | Mobile | Web | Status |
|---------|---------|--------|-----|--------|
| Local Database | ✅ | ✅ | ✅ | Complete |
| Migrations | ✅ | ✅ | ✅ | Complete |
| Data Persistence | ✅ | ⚠️ | ⚠️ | Partial |
| Cloud Backup | ❌ | ❌ | ❌ | Planned |
| Export/Import | ❌ | ❌ | ❌ | Planned |
| Multi-Device Sync | ❌ | ❌ | ❌ | Planned |

**Legend:**
- ✅ Complete
- ⚠️ Partial (works but has limitations)
- ❌ Not implemented
- 🔄 In progress

---

## 📞 Need Help?

If you want to implement:
- ✅ Cloud backup/sync
- ✅ Export/import functionality
- ✅ Multi-device sync
- ✅ Automatic backup scheduling

Please refer to the implementation guides or contact the development team.

---

## 📚 Related Documentation

- [README.md](./README.md) - Complete database documentation
- [TESTING.md](./TESTING.md) - Testing guide
- [pos_phase1_normalized_schema.sql](./pos_phase1_normalized_schema.sql) - Full schema reference

---

**Document Version**: 1.0
**Last Updated**: November 3, 2024
**Maintained By**: Development Team
