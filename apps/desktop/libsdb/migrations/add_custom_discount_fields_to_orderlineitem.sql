-- Migration: Add custom discount fields to OrderLineItem
-- Keeps offline schema in sync with ability to store custom line discounts

ALTER TABLE OrderLineItem ADD COLUMN customDiscountAmount REAL DEFAULT 0;
ALTER TABLE OrderLineItem ADD COLUMN customDiscountPercent REAL DEFAULT 0;

-- Verify migration
PRAGMA table_info(OrderLineItem);

