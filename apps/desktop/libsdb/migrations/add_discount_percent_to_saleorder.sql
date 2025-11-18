-- Migration: Add discountPercent column to SaleOrder
-- Ensures offline desktop DB can store order-level percentage discounts

ALTER TABLE SaleOrder ADD COLUMN discountPercent REAL DEFAULT 0;

-- Verify migration
PRAGMA table_info(SaleOrder);

