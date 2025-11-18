-- Migration: Add lineDiscountPercent column to OrderLineItem
-- Required so offline line items can store percentage discounts

ALTER TABLE OrderLineItem ADD COLUMN lineDiscountPercent REAL DEFAULT 0;

-- Verify migration
PRAGMA table_info(OrderLineItem);

