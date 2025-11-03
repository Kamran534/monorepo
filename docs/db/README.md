# POS Database Setup - Phase 1

This document describes the database setup for the POS system Phase 1 MVP, which is configured to work consistently across Desktop (Electron), Mobile (React Native), and Web (Browser) applications.

## Overview

The database system uses SQLite with a **cross-platform abstraction layer** that automatically detects the environment and uses the appropriate driver:

- **Desktop (Electron)**: `better-sqlite3` (native SQLite)
- **Mobile (React Native)**: `react-native-sqlite-storage` (native SQLite)
- **Web (Browser)**: `sql.js` (SQLite compiled to WebAssembly with IndexedDB persistence)

## Database Schema

The Phase 1 schema includes the following main components:

### 1. User Authentication & Permissions
- `users` - User accounts with authentication
- `roles` - Role definitions (Administrator, Store Manager, Cashier, Stock Clerk)
- `permissions` - Granular permissions for different operations
- `role_permissions` - Many-to-many mapping between roles and permissions
- `user_sessions` - Active login session tracking

### 2. Products & Variants
- `categories` - Hierarchical product categories
- `products` - Parent product definitions
- `product_variants` - Actual sellable items (SKU level)
- `variant_options` - Variant attributes (color, size, etc.)
- `product_images` - Product and variant images

### 3. Inventory Tracking
- `locations` - Store/warehouse locations
- `inventory_items` - Stock levels per variant per location
- `inventory_adjustments` - Inventory adjustment headers
- `inventory_adjustment_details` - Adjustment line items
- `inventory_adjustment_types` - Lookup table for adjustment types

### 4. Sales & Checkout
- `sales_orders` - Sales order headers
- `order_line_items` - Order line details
- `order_types` - Lookup table (Sale, Return, Exchange)
- `order_statuses` - Lookup table (Draft, Open, Completed, Voided, Parked)

### 5. Cash/Card Payments
- `order_payments` - Payment records (supports multiple payments per order)
- `payment_methods` - Available payment methods
- `payment_method_types` - Lookup table (Cash, Card, Digital, Other)
- `payment_statuses` - Lookup table (Pending, Completed, Failed, Refunded)

### 6. Cash Register & Shifts
- `cash_registers` - Register definitions
- `shifts` - Cashier shift tracking
- `shift_statuses` - Lookup table (Open, Closed)

### 7. Tax & Receipts
- `tax_rates` - Tax configuration per location
- `receipt_templates` - Receipt formatting templates

### 8. Utility Tables
- `schema_migrations` - Migration version tracking

## Pre-loaded Data

The following lookup/reference data is automatically inserted during migration:

✅ **Included (Essential System Data)**:
- Shift statuses (Open, Closed)
- Order types (Sale, Return, Exchange)
- Order statuses (Draft, Open, Completed, Voided, Parked)
- Payment method types (Cash, Card, Digital, Other)
- Payment statuses (Pending, Completed, Failed, Refunded)
- Inventory adjustment types (Receive, Sale, Return, Damage, etc.)
- Basic permissions (View Products, Manage Products, Process Sales, etc.)
- Default roles (Administrator, Store Manager, Cashier, Stock Clerk)
- Role-permission mappings

❌ **NOT Included (User Data)**:
- No sample users
- No sample locations/stores
- No sample products, categories, or inventory
- No sample orders or payments
- No tax rates or receipt templates

## Migration System

### How Migrations Work

1. **Automatic Execution**: Migrations run automatically when each app starts
2. **Version Tracking**: The `schema_migrations` table tracks which migrations have been applied
3. **Idempotent**: Safe to run multiple times - already applied migrations are skipped
4. **Cross-Platform**: Same migration code works on Desktop, Mobile, and Web

### Migration Files

Located in `libs/db/src/migrations/`:

- `001-pos-phase1-schema.sql` - Core tables, indexes, and lookup data
- `002-pos-phase1-views-triggers.sql` - Views for common queries and auto-update triggers

### Adding New Migrations

To add a new migration:

1. Create a new `.sql` file in `libs/db/src/migrations/` with the next version number:
   ```
   003-your-migration-name.sql
   ```

2. Add the migration to `libs/db/src/migrations/index.ts`:
   ```typescript
   import migration003 from './003-your-migration-name.sql?raw';

   export const migrations: Migration[] = [
     // ... existing migrations
     {
       version: '003',
       description: 'Your migration description',
       sql: migration003,
     },
   ];
   ```

3. The migration will run automatically on next app start

## Database Locations

### Desktop (Electron)
- **Path**: `{app.userData}/desktop/payflow.db`
- **Example (Windows)**: `C:\Users\{username}\AppData\Roaming\desktop\payflow.db`
- **Example (Mac)**: `~/Library/Application Support/desktop/payflow.db`
- **Example (Linux)**: `~/.config/desktop/payflow.db`

### Mobile (React Native)
- **Name**: `payflow.db`
- **Location**: App sandbox (managed by React Native)
- **Platform-specific**: iOS and Android use their native SQLite

### Web (Browser)
- **Name**: `payflow.db`
- **Storage**: IndexedDB (`payflow-sqlite` database, `sqlite-dbs` store)
- **In-Memory**: Loaded into memory from IndexedDB on startup
- **Persistence**: Automatically saved back to IndexedDB after changes

## Database Consistency

The system ensures database consistency across platforms through:

1. **Single Schema Source**: All platforms use the same SQL migration files
2. **Automatic Migrations**: Migrations run on first launch and after updates
3. **Version Tracking**: `schema_migrations` table prevents duplicate migrations
4. **Foreign Key Constraints**: Enabled on all platforms (`PRAGMA foreign_keys = ON`)
5. **Triggers**: Auto-update timestamps and calculate order totals
6. **Indexes**: Performance indexes on frequently queried columns

## API Usage

### Connecting to Database

```typescript
import { getDatabase } from '@monorepo/db';

const db = getDatabase(); // Automatically detects platform

// Connect and run migrations
await db.connect();
await db.runMigrations(); // Run any pending migrations
```

### Example: Desktop (Electron Main Process)

```typescript
// apps/desktop/src/main/main.ts
import Database from 'better-sqlite3';
import { createDesktopExecutor, runMigrations } from '@monorepo/db/migrations';

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const executor = createDesktopExecutor(db);
await runMigrations(executor);
```

### Example: Mobile (React Native)

```typescript
// apps/mobile/src/app/App.tsx
import { getDatabase } from '@monorepo/db';

const db = getDatabase();
await db.connect();
await db.runMigrations(); // Automatically runs migrations
```

### Example: Web (Browser)

```typescript
// apps/web/src/main.tsx
import { getDatabase } from '@monorepo/db';

const db = getDatabase();
await db.connect();
await db.runMigrations(); // Automatically runs migrations
```

## Querying the Database

### Using Prepared Statements (Recommended)

```typescript
// Desktop
const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
const user = stmt.get('admin');

// Mobile
const [result] = await db.executeSql(
  'SELECT * FROM users WHERE username = ?',
  ['admin']
);
const user = result.rows.item(0);

// Web
const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
stmt.bind(['admin']);
const users = [];
while (stmt.step()) {
  users.push(stmt.getAsObject());
}
stmt.free();
```

### Using Views

Pre-built views are available for common queries:

```sql
-- Product catalog with pricing and inventory
SELECT * FROM v_product_catalog WHERE product_active = 1;

-- Inventory status across locations
SELECT * FROM v_inventory_status WHERE stock_status = 'Low Stock';

-- Sales order summaries
SELECT * FROM v_sales_order_summary WHERE order_status_name = 'Completed';

-- Order details with line items
SELECT * FROM v_order_details WHERE order_number = 'ORD-20241103-0001';

-- User permissions
SELECT * FROM v_user_permissions WHERE username = 'admin';

-- Daily sales summary
SELECT * FROM v_daily_sales_summary WHERE sale_date = '2024-11-03';

-- Payment summaries
SELECT * FROM v_payment_summary WHERE payment_status_name = 'Completed';
```

## Performance Considerations

### Indexes

The schema includes comprehensive indexes on:
- User authentication fields (username, email, pin_code)
- Product lookups (SKU, barcode, product_code)
- Inventory queries (variant_id, location_id)
- Order lookups (order_number, order_date, customer_phone)
- Payment tracking (order_id, payment_method_id)
- Shift management (register_id, user_id, status)

### Desktop Optimizations

- WAL mode enabled for better concurrency
- Prepared statements for repeated queries
- Foreign key constraints enforced

### Mobile Optimizations

- Native SQLite for maximum performance
- Batch operations supported
- Transactions for multi-step operations

### Web Optimizations

- Loaded into memory from IndexedDB
- Persistent across page reloads
- Automatic saving after changes

## Troubleshooting

### Migration Issues

If migrations fail:

1. Check console logs for error messages
2. Verify SQL syntax in migration files
3. Check for conflicting table/column names
4. Ensure all foreign key references are valid
5. Desktop only: ensure the target directory exists: `{app.userData}/desktop`. On Windows, create `C:\Users\{username}\AppData\Roaming\desktop` before first run
6. To force a clean rerun on Desktop, back up and delete the DB file `.../desktop/payflow.db` and restart the app

### Directory Does Not Exist (Desktop)

If you see `Cannot open database because the directory does not exist`, create the directory first and rerun:

```bash
# Git Bash / MSYS2 on Windows
APPDATA_UNIX="$(cygpath -u "$APPDATA")"
mkdir -p "$APPDATA_UNIX/desktop"
```

### Data Not Persisting (Web Only)

- Check browser IndexedDB support
- Verify IndexedDB quota not exceeded
- Check browser console for storage errors
- Clear IndexedDB and restart app if corrupted

### Performance Issues

- Check query plans with `EXPLAIN QUERY PLAN`
- Ensure indexes are being used
- Use prepared statements for repeated queries
- Consider denormalization for heavy read queries

## Security Considerations

1. **SQL Injection**: Always use parameterized queries/prepared statements
2. **Passwords**: Store bcrypt hashes only (see sample users in original schema for format)
3. **Sessions**: Implement session timeout and cleanup
4. **Permissions**: Check user permissions before operations
5. **Data Validation**: Validate all input before database insertion

## Future Enhancements (Phase 2+)

Planned for future phases:
- Customer management and loyalty programs
- Advanced reporting and analytics
- Multi-currency support
- Advanced inventory features (transfers, purchase orders)
- Employee time tracking
- Integration APIs
- Backup and restore functionality
- Database synchronization for offline mode

## Resources

- **Schema File**: `docs/db/pos_phase1_normalized_schema.sql` (reference with sample data)
- **Migration Files**: `libs/db/src/migrations/`
- **Database Library**: `libs/db/src/index.ts`
- **Migration Runner**: `libs/db/src/migrations/index.ts`

## Support

For issues or questions about the database setup:
1. Check this documentation
2. Review the schema file for data structure
3. Check migration logs in app console
4. Verify platform-specific setup (Desktop/Mobile/Web)
