-- Migration: Add adjustment fields to SaleOrder
-- Ensures desktop SQLite DB supports order-level adjustments

ALTER TABLE SaleOrder ADD COLUMN adjustmentAmount REAL DEFAULT 0;
ALTER TABLE SaleOrder ADD COLUMN adjustmentReason TEXT;

-- Verify migration
PRAGMA table_info(SaleOrder);

