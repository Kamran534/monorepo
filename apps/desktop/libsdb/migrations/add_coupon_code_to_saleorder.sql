-- Migration: Add couponCode column to SaleOrder
-- Required for offline orders to store coupon or gift card references

ALTER TABLE SaleOrder ADD COLUMN couponCode TEXT;

-- Verify migration
PRAGMA table_info(SaleOrder);

