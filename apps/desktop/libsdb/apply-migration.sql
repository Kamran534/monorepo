-- SQLite Migration Script
-- Apply this to update existing SQLite databases with new schema changes

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================
-- 1. Add currency column to PaymentMethod
-- ============================================
-- Check if column exists, if not add it
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- This will fail if column already exists, which is fine
BEGIN TRANSACTION;

-- Try to add currency column (will fail silently if exists in some SQLite versions)
-- For SQLite 3.35.0+, we can use ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- For older versions, we need to check first or handle the error

-- Add currency column to PaymentMethod
-- If you get an error that column exists, that's okay - skip this
ALTER TABLE PaymentMethod ADD COLUMN currency TEXT DEFAULT 'USD' CHECK(currency IN ('USD', 'EUR', 'GBP', 'PKR', 'INR', 'CAD', 'AUD'));

-- ============================================
-- 2. Create ExchangeOrder table
-- ============================================
CREATE TABLE IF NOT EXISTS ExchangeOrder (
    id TEXT PRIMARY KEY NOT NULL,
    exchangeNumber TEXT UNIQUE NOT NULL,
    originalOrderId TEXT NOT NULL,
    newOrderId TEXT NOT NULL,
    priceDifference REAL NOT NULL,
    additionalPayment REAL DEFAULT 0,
    refundAmount REAL DEFAULT 0,
    exchangeDate TEXT NOT NULL DEFAULT (datetime('now')),
    processedBy TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Completed', 'Cancelled')),
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (originalOrderId) REFERENCES SaleOrder(id),
    FOREIGN KEY (newOrderId) REFERENCES SaleOrder(id),
    FOREIGN KEY (processedBy) REFERENCES User(id)
);

CREATE INDEX IF NOT EXISTS idx_exchangeOrder_exchangeNumber ON ExchangeOrder(exchangeNumber);
CREATE INDEX IF NOT EXISTS idx_exchangeOrder_originalOrderId ON ExchangeOrder(originalOrderId);
CREATE INDEX IF NOT EXISTS idx_exchangeOrder_newOrderId ON ExchangeOrder(newOrderId);
CREATE INDEX IF NOT EXISTS idx_exchangeOrder_status ON ExchangeOrder(status);

-- ============================================
-- 3. Create ExchangeLineItem table
-- ============================================
CREATE TABLE IF NOT EXISTS ExchangeLineItem (
    id TEXT PRIMARY KEY NOT NULL,
    exchangeId TEXT NOT NULL,
    returnedVariantId TEXT NOT NULL,
    returnedQuantity INTEGER NOT NULL,
    returnedUnitPrice REAL NOT NULL,
    exchangedVariantId TEXT NOT NULL,
    exchangedQuantity INTEGER NOT NULL,
    exchangedUnitPrice REAL NOT NULL,
    priceDifference REAL NOT NULL,
    FOREIGN KEY (exchangeId) REFERENCES ExchangeOrder(id) ON DELETE CASCADE,
    FOREIGN KEY (returnedVariantId) REFERENCES ProductVariant(id),
    FOREIGN KEY (exchangedVariantId) REFERENCES ProductVariant(id)
);

CREATE INDEX IF NOT EXISTS idx_exchangeLineItem_exchangeId ON ExchangeLineItem(exchangeId);
CREATE INDEX IF NOT EXISTS idx_exchangeLineItem_returnedVariantId ON ExchangeLineItem(returnedVariantId);
CREATE INDEX IF NOT EXISTS idx_exchangeLineItem_exchangedVariantId ON ExchangeLineItem(exchangedVariantId);

-- ============================================
-- 4. Create StoreConfig table
-- ============================================
CREATE TABLE IF NOT EXISTS StoreConfig (
    id TEXT PRIMARY KEY NOT NULL,
    organizationName TEXT NOT NULL,
    organizationCode TEXT UNIQUE NOT NULL,
    defaultCurrency TEXT DEFAULT 'USD' CHECK(defaultCurrency IN ('USD', 'EUR', 'GBP', 'PKR', 'INR', 'CAD', 'AUD')),
    returnPolicy TEXT DEFAULT 'RefundAndExchange' CHECK(returnPolicy IN ('NoReturns', 'ExchangeOnly', 'RefundAndExchange')),
    allowReturns INTEGER DEFAULT 1,
    allowRefunds INTEGER DEFAULT 1,
    allowExchanges INTEGER DEFAULT 1,
    returnWindowDays INTEGER DEFAULT 30,
    requireOriginalReceipt INTEGER DEFAULT 1,
    allowExchangeSameAmount INTEGER DEFAULT 1,
    allowExchangeGreaterAmount INTEGER DEFAULT 1,
    allowExchangeLowerAmount INTEGER DEFAULT 0,
    restockFeePercentage REAL DEFAULT 0 CHECK(restockFeePercentage >= 0 AND restockFeePercentage <= 100),
    taxId TEXT,
    registrationNumber TEXT,
    contactEmail TEXT,
    contactPhone TEXT,
    address TEXT,
    logo TEXT,
    website TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_storeConfig_organizationCode ON StoreConfig(organizationCode);

-- ============================================
-- 5. Add lineDiscountType to OrderLineItem
-- ============================================
-- Add new columns to store discount type and original percent value
-- This allows proper reconstruction of discounts when recalling orders
ALTER TABLE OrderLineItem ADD COLUMN lineDiscountType TEXT; -- 'amount' or 'percent'

COMMIT;

-- Verify changes
SELECT 'Migration completed successfully!' AS status;
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ExchangeOrder', 'ExchangeLineItem', 'StoreConfig');

