-- Migration: Add sync fields to order-related tables
-- This migration adds sync_status, last_synced_at, and is_deleted fields
-- to enable offline sync for orders

-- Add sync fields to SaleOrder
ALTER TABLE SaleOrder ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE SaleOrder ADD COLUMN last_synced_at TEXT;
ALTER TABLE SaleOrder ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Add sync fields to OrderLineItem
ALTER TABLE OrderLineItem ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE OrderLineItem ADD COLUMN last_synced_at TEXT;
ALTER TABLE OrderLineItem ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Add sync fields to OrderPayment
ALTER TABLE OrderPayment ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE OrderPayment ADD COLUMN last_synced_at TEXT;
ALTER TABLE OrderPayment ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Add sync fields to OrderDiscount
ALTER TABLE OrderDiscount ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE OrderDiscount ADD COLUMN last_synced_at TEXT;
ALTER TABLE OrderDiscount ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Add sync fields to ParkedOrder
ALTER TABLE ParkedOrder ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE ParkedOrder ADD COLUMN last_synced_at TEXT;
ALTER TABLE ParkedOrder ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Verify migration
SELECT 'Migration completed successfully. Sync fields added to:' as message
UNION ALL
SELECT '  - SaleOrder'
UNION ALL
SELECT '  - OrderLineItem'
UNION ALL
SELECT '  - OrderPayment'
UNION ALL
SELECT '  - OrderDiscount'
UNION ALL
SELECT '  - ParkedOrder';
