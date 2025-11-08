# CPOS Desktop Database

SQLite database for the offline-first desktop POS application.

## Database Information

- **Database Name**: `cpos.db`
- **Database Type**: SQLite 3
- **Location**: `monorepo/apps/desktop/libsdb/`
- **Size**: ~1.2 MB (initial state with schema and seed data)

## Schema Overview

The database contains **50 tables** organized into the following modules:

### 1. Customer Management
- `customers` - Customer information
- `customer_groups` - Customer grouping for discounts
- `customer_addresses` - Customer shipping/billing addresses

### 2. Location/Store Management
- `locations` - Store/warehouse locations

### 3. Product & Inventory Management
- `products` - Product master data
- `product_variants` - Product SKUs/variants
- `categories` - Product categories
- `brands` - Product brands
- `suppliers` - Supplier information
- `tax_categories` - Tax category definitions
- `inventory_items` - Stock levels per location
- `stock_adjustments` - Inventory adjustments
- `stock_adjustment_lines` - Adjustment line items
- `stock_transfers` - Stock transfers between locations
- `stock_transfer_lines` - Transfer line items
- `barcodes` - Product barcodes
- `serial_numbers` - Serial number tracking

### 4. Users & Permissions
- `users` - User accounts
- `roles` - User roles
- `user_locations` - User-location assignments

### 5. Payment Methods
- `payment_methods` - Payment method configurations
- `gift_cards` - Gift card tracking
- `store_credits` - Store credit management

### 6. Shift Management
- `cash_registers` - Cash register definitions
- `shifts` - Cashier shifts
- `shift_transactions` - Shift transaction log
- `cash_movements` - Cash in/out operations

### 7. Sales & Orders
- `sale_orders` - Sales orders
- `order_line_items` - Order line items
- `order_payments` - Order payments

### 8. Returns & Exchanges
- `return_orders` - Return orders
- `return_line_items` - Return line items
- `exchange_orders` - Exchange orders

### 9. Expenses & Accounting
- `expense_accounts` - Expense account chart
- `expenses` - Expense records
- `bank_accounts` - Bank account tracking
- `bank_deposits` - Bank deposit records
- `bank_deposit_shifts` - Deposit-shift junction table
- `cash_accounts` - Cash account tracking

### 10. Discounts & Promotions
- `promotions` - Promotion definitions
- `promotion_categories` - Promotion-category junction
- `order_discounts` - Applied discounts

### 11. Taxes
- `tax_rates` - Tax rate definitions

### 12. Additional Features
- `parked_orders` - Parked/held orders
- `audit_logs` - Audit trail
- `system_settings` - System configuration

### 13. Offline Sync Management
- `sync_queue` - Pending sync operations
- `sync_logs` - Sync operation history
- `sync_conflicts` - Sync conflict resolution

## Views (6 analytical views)

1. `v_inventory_levels` - Current inventory with product details
2. `v_low_stock_alerts` - Products below reorder point
3. `v_daily_sales_summary` - Daily sales aggregates
4. `v_open_shifts` - Currently open shifts
5. `v_customer_purchase_summary` - Customer lifetime value
6. `v_pending_sync_items` - Pending sync queue status

## Triggers (8 automatic triggers)

### Timestamp Update Triggers
- `update_customers_timestamp`
- `update_products_timestamp`
- `update_product_variants_timestamp`
- `update_sale_orders_timestamp`
- `update_locations_timestamp`
- `update_users_timestamp`

### Sync Queue Triggers
- `sync_queue_after_insert_sale_orders`
- `sync_queue_after_update_sale_orders`

## Initial Data

The database comes pre-populated with:

### Payment Methods (5 default methods)
- `pm_cash` - Cash
- `pm_card` - Credit/Debit Card
- `pm_giftcard` - Gift Card
- `pm_credit` - Store Credit
- `pm_account` - On Account

### Roles (2 default roles)
- `role_admin` - Administrator (full access)
- `role_cashier` - Cashier (basic POS operations)

## Performance Optimizations

The database is configured with the following optimizations:

- **Journal Mode**: WAL (Write-Ahead Logging) for better concurrency
- **Synchronous**: NORMAL for balanced performance and data integrity
- **Temp Store**: MEMORY for faster temporary operations
- **Cache Size**: 64 MB for improved query performance
- **Memory-Mapped I/O**: 256 MB for faster file access

## Sync Architecture

All tables include sync-related fields:
- `sync_status` - Track sync state (synced, pending)
- `last_synced_at` - Last successful sync timestamp
- `is_deleted` - Soft delete flag for sync purposes

## Foreign Key Constraints

Foreign key constraints are **ENABLED** (`PRAGMA foreign_keys = ON`).

All relationships enforce referential integrity with appropriate cascade behaviors:
- `CASCADE` - For dependent data (e.g., line items with orders)
- `SET NULL` - For optional relationships
- `RESTRICT` - For critical relationships that should prevent deletion

## Schema File

The complete schema is available in `schema.sql` and can be used to:
- Recreate the database: `sqlite3 cpos.db < schema.sql`
- Review table definitions
- Understand relationships and constraints

## Usage

To access the database:

```bash
# Open database shell
sqlite3 cpos.db

# View tables
.tables

# View schema for a table
.schema customers

# Query data
SELECT * FROM payment_methods;
```

## Database Statistics

- **Tables**: 50
- **Views**: 6
- **Triggers**: 8
- **Indexes**: ~100+ (optimized for common queries)
- **Initial Size**: ~1.2 MB

## Notes

- All timestamps use ISO 8601 format in UTC
- JSON data is stored as TEXT strings
- UUIDs/IDs are stored as TEXT (lowercase hex)
- Money values use REAL type with 2 decimal precision in application logic
- All string comparisons are case-sensitive by default in SQLite
