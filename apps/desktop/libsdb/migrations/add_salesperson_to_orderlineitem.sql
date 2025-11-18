-- Migration: Add salesPersonId column to OrderLineItem
-- Ensures desktop SQLite orders can capture salesperson info per item

ALTER TABLE OrderLineItem ADD COLUMN salesPersonId TEXT;

-- Optional: maintain referential expectation (no FK since SQLite ALTER limited)
-- Foreign key reference already defined in schema for fresh DBs.

-- Verify migration
PRAGMA table_info(OrderLineItem);

