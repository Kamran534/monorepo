-- SQLite Schema for CPOS (Complete Point of Sale)
-- Generated from Prisma schema

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================
-- 1. CUSTOMER MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS CustomerGroup (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    discountPercent REAL DEFAULT 0 CHECK(discountPercent >= 0 AND discountPercent <= 100),
    description TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Customer (
    id TEXT PRIMARY KEY NOT NULL,
    customerCode TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobilePhone TEXT,
    dateOfBirth TEXT,
    gender TEXT,
    taxId TEXT,
    customerType TEXT DEFAULT 'Regular' CHECK(customerType IN ('Regular', 'VIP', 'Wholesale', 'Employee')),
    loyaltyPoints INTEGER DEFAULT 0,
    lifetimeValue REAL DEFAULT 0,
    totalSpent REAL DEFAULT 0,
    notes TEXT,
    tags TEXT, -- JSON array stored as text
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    lastVisitDate TEXT,
    defaultPaymentMethod TEXT,
    creditLimit REAL,
    currentBalance REAL DEFAULT 0,
    marketingOptIn INTEGER DEFAULT 0,
    emailOptIn INTEGER DEFAULT 0,
    smsOptIn INTEGER DEFAULT 0,
    customerGroupId TEXT,
    FOREIGN KEY (customerGroupId) REFERENCES CustomerGroup(id)
);

CREATE INDEX idx_customer_customerCode ON Customer(customerCode);
CREATE INDEX idx_customer_email ON Customer(email);
CREATE INDEX idx_customer_phone ON Customer(phone);
CREATE INDEX idx_customer_customerGroupId ON Customer(customerGroupId);

CREATE TABLE IF NOT EXISTS CustomerAddress (
    id TEXT PRIMARY KEY NOT NULL,
    customerId TEXT NOT NULL,
    addressType TEXT NOT NULL CHECK(addressType IN ('Billing', 'Shipping', 'Both')),
    street1 TEXT NOT NULL,
    street2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postalCode TEXT NOT NULL,
    country TEXT NOT NULL,
    isDefault INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE
);

CREATE INDEX idx_customerAddress_customerId ON CustomerAddress(customerId);

-- ============================================
-- 2. LOCATION/STORE MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS Location (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Store', 'Warehouse', 'Mobile')),
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postalCode TEXT,
    phone TEXT,
    email TEXT,
    timezone TEXT DEFAULT 'UTC',
    taxRate REAL DEFAULT 0,
    taxSettings TEXT, -- JSON
    isActive INTEGER DEFAULT 1,
    openingHours TEXT, -- JSON
    defaultCashAccountId TEXT,
    defaultBankAccountId TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_location_code ON Location(code);
CREATE INDEX idx_location_isActive ON Location(isActive);

-- ============================================
-- 3. PRODUCT & INVENTORY MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS Category (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    parentCategoryId TEXT,
    description TEXT,
    image TEXT,
    sortOrder INTEGER DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parentCategoryId) REFERENCES Category(id)
);

CREATE INDEX idx_category_parentCategoryId ON Category(parentCategoryId);
CREATE INDEX idx_category_isActive ON Category(isActive);

CREATE TABLE IF NOT EXISTS Brand (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    contactInfo TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Supplier (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    contactInfo TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS TaxCategory (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    taxRates TEXT, -- JSON array of tax rate IDs
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Product (
    id TEXT PRIMARY KEY NOT NULL,
    productCode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    categoryId TEXT,
    brandId TEXT,
    supplierId TEXT,
    hasVariants INTEGER DEFAULT 0,
    trackInventory INTEGER DEFAULT 1,
    isTaxable INTEGER DEFAULT 1,
    taxCategoryId TEXT,
    images TEXT, -- JSON array
    tags TEXT, -- JSON array
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (categoryId) REFERENCES Category(id),
    FOREIGN KEY (brandId) REFERENCES Brand(id),
    FOREIGN KEY (supplierId) REFERENCES Supplier(id),
    FOREIGN KEY (taxCategoryId) REFERENCES TaxCategory(id)
);

CREATE INDEX idx_product_productCode ON Product(productCode);
CREATE INDEX idx_product_categoryId ON Product(categoryId);
CREATE INDEX idx_product_brandId ON Product(brandId);
CREATE INDEX idx_product_supplierId ON Product(supplierId);
CREATE INDEX idx_product_isActive ON Product(isActive);

CREATE TABLE IF NOT EXISTS ProductVariant (
    id TEXT PRIMARY KEY NOT NULL,
    productId TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT,
    upc TEXT,
    variantName TEXT NOT NULL,
    options TEXT, -- JSON
    retailPrice REAL NOT NULL,
    wholesalePrice REAL,
    cost REAL,
    compareAtPrice REAL,
    weight REAL,
    dimensions TEXT, -- JSON
    image TEXT,
    position INTEGER DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
);

CREATE INDEX idx_productVariant_productId ON ProductVariant(productId);
CREATE INDEX idx_productVariant_sku ON ProductVariant(sku);
CREATE INDEX idx_productVariant_barcode ON ProductVariant(barcode);

CREATE TABLE IF NOT EXISTS InventoryItem (
    id TEXT PRIMARY KEY NOT NULL,
    variantId TEXT NOT NULL,
    locationId TEXT NOT NULL,
    quantityOnHand INTEGER DEFAULT 0,
    quantityAvailable INTEGER DEFAULT 0,
    quantityCommitted INTEGER DEFAULT 0,
    quantityIncoming INTEGER DEFAULT 0,
    reorderPoint INTEGER,
    reorderQuantity INTEGER,
    lastCountedAt TEXT,
    lastReceivedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (variantId) REFERENCES ProductVariant(id) ON DELETE CASCADE,
    FOREIGN KEY (locationId) REFERENCES Location(id) ON DELETE CASCADE,
    UNIQUE(variantId, locationId)
);

CREATE INDEX idx_inventoryItem_variantId ON InventoryItem(variantId);
CREATE INDEX idx_inventoryItem_locationId ON InventoryItem(locationId);

CREATE TABLE IF NOT EXISTS Barcode (
    id TEXT PRIMARY KEY NOT NULL,
    variantId TEXT NOT NULL,
    barcodeValue TEXT NOT NULL,
    barcodeType TEXT NOT NULL,
    isPrimary INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (variantId) REFERENCES ProductVariant(id) ON DELETE CASCADE
);

CREATE INDEX idx_barcode_variantId ON Barcode(variantId);
CREATE INDEX idx_barcode_barcodeValue ON Barcode(barcodeValue);

CREATE TABLE IF NOT EXISTS SerialNumber (
    id TEXT PRIMARY KEY NOT NULL,
    variantId TEXT NOT NULL,
    serialNumber TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'InStock' CHECK(status IN ('InStock', 'Sold', 'Returned', 'Defective')),
    orderId TEXT,
    orderLineItemId TEXT,
    locationId TEXT,
    receivedDate TEXT,
    soldDate TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (variantId) REFERENCES ProductVariant(id) ON DELETE CASCADE
);

CREATE INDEX idx_serialNumber_variantId ON SerialNumber(variantId);
CREATE INDEX idx_serialNumber_serialNumber ON SerialNumber(serialNumber);
CREATE INDEX idx_serialNumber_status ON SerialNumber(status);

-- ============================================
-- 4. USERS & PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS Role (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    permissions TEXT NOT NULL, -- JSON array
    description TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_role_name ON Role(name);
CREATE INDEX idx_role_isActive ON Role(isActive);

CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    pin TEXT,
    passwordHash TEXT NOT NULL,
    roleId TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    hireDate TEXT,
    terminationDate TEXT,
    phone TEXT,
    employeeCode TEXT UNIQUE,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (roleId) REFERENCES Role(id)
);

CREATE INDEX idx_user_username ON User(username);
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_user_roleId ON User(roleId);
CREATE INDEX idx_user_isActive ON User(isActive);

CREATE TABLE IF NOT EXISTS UserLocation (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    locationId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (locationId) REFERENCES Location(id) ON DELETE CASCADE,
    UNIQUE(userId, locationId)
);

CREATE INDEX idx_userLocation_userId ON UserLocation(userId);
CREATE INDEX idx_userLocation_locationId ON UserLocation(locationId);

-- ============================================
-- 5. STOCK MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS StockAdjustment (
    id TEXT PRIMARY KEY NOT NULL,
    locationId TEXT NOT NULL,
    adjustmentType TEXT NOT NULL CHECK(adjustmentType IN ('Increase', 'Decrease', 'StockTake')),
    reason TEXT NOT NULL CHECK(reason IN ('NEW_PRODUCTS', 'RETURN', 'SALES_RETURN', 'DAMAGE', 'SHRINKAGE', 'STOCK_TAKE', 'PROMOTION', 'EXPIRED', 'THEFT', 'BREAKAGE', 'SPOILAGE', 'CUSTOMER_RETURN', 'SUPPLIER_CREDIT', 'WRITE_OFF', 'CORRECTION')),
    referenceNumber TEXT,
    notes TEXT,
    adjustedBy TEXT NOT NULL,
    adjustedAt TEXT NOT NULL DEFAULT (datetime('now')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (locationId) REFERENCES Location(id),
    FOREIGN KEY (adjustedBy) REFERENCES User(id)
);

CREATE INDEX idx_stockAdjustment_locationId ON StockAdjustment(locationId);
CREATE INDEX idx_stockAdjustment_adjustedBy ON StockAdjustment(adjustedBy);
CREATE INDEX idx_stockAdjustment_adjustedAt ON StockAdjustment(adjustedAt);

CREATE TABLE IF NOT EXISTS StockAdjustmentLine (
    id TEXT PRIMARY KEY NOT NULL,
    adjustmentId TEXT NOT NULL,
    variantId TEXT NOT NULL,
    quantityBefore INTEGER NOT NULL,
    quantityAfter INTEGER NOT NULL,
    quantityChange INTEGER NOT NULL,
    FOREIGN KEY (adjustmentId) REFERENCES StockAdjustment(id) ON DELETE CASCADE,
    FOREIGN KEY (variantId) REFERENCES ProductVariant(id)
);

CREATE INDEX idx_stockAdjustmentLine_adjustmentId ON StockAdjustmentLine(adjustmentId);
CREATE INDEX idx_stockAdjustmentLine_variantId ON StockAdjustmentLine(variantId);

CREATE TABLE IF NOT EXISTS StockTransfer (
    id TEXT PRIMARY KEY NOT NULL,
    fromLocationId TEXT NOT NULL,
    toLocationId TEXT NOT NULL,
    transferNumber TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Draft' CHECK(status IN ('Draft', 'InTransit', 'Received', 'Cancelled')),
    transferDate TEXT NOT NULL,
    notes TEXT,
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (fromLocationId) REFERENCES Location(id),
    FOREIGN KEY (toLocationId) REFERENCES Location(id),
    FOREIGN KEY (createdBy) REFERENCES User(id)
);

CREATE INDEX idx_stockTransfer_transferNumber ON StockTransfer(transferNumber);
CREATE INDEX idx_stockTransfer_fromLocationId ON StockTransfer(fromLocationId);
CREATE INDEX idx_stockTransfer_toLocationId ON StockTransfer(toLocationId);
CREATE INDEX idx_stockTransfer_status ON StockTransfer(status);

CREATE TABLE IF NOT EXISTS StockTransferLine (
    id TEXT PRIMARY KEY NOT NULL,
    transferId TEXT NOT NULL,
    variantId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    received INTEGER,
    FOREIGN KEY (transferId) REFERENCES StockTransfer(id) ON DELETE CASCADE,
    FOREIGN KEY (variantId) REFERENCES ProductVariant(id)
);

CREATE INDEX idx_stockTransferLine_transferId ON StockTransferLine(transferId);
CREATE INDEX idx_stockTransferLine_variantId ON StockTransferLine(variantId);

-- ============================================
-- 6. SHIFT MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS CashRegister (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    locationId TEXT NOT NULL,
    currentShiftId TEXT UNIQUE,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (locationId) REFERENCES Location(id)
);

CREATE INDEX idx_cashRegister_code ON CashRegister(code);
CREATE INDEX idx_cashRegister_locationId ON CashRegister(locationId);
CREATE INDEX idx_cashRegister_isActive ON CashRegister(isActive);

CREATE TABLE IF NOT EXISTS Shift (
    id TEXT PRIMARY KEY NOT NULL,
    shiftNumber TEXT UNIQUE NOT NULL,
    registerId TEXT NOT NULL,
    locationId TEXT NOT NULL,
    userId TEXT NOT NULL,
    openedAt TEXT NOT NULL DEFAULT (datetime('now')),
    closedAt TEXT,
    status TEXT DEFAULT 'Open' CHECK(status IN ('Open', 'Closed', 'Reconciled')),
    openingCash REAL NOT NULL,
    expectedCash REAL DEFAULT 0,
    actualCash REAL,
    cashDifference REAL,
    totalSales REAL DEFAULT 0,
    totalReturns REAL DEFAULT 0,
    totalPayouts REAL DEFAULT 0,
    notes TEXT,
    closedBy TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (registerId) REFERENCES CashRegister(id),
    FOREIGN KEY (locationId) REFERENCES Location(id),
    FOREIGN KEY (userId) REFERENCES User(id),
    FOREIGN KEY (closedBy) REFERENCES User(id)
);

CREATE INDEX idx_shift_shiftNumber ON Shift(shiftNumber);
CREATE INDEX idx_shift_registerId ON Shift(registerId);
CREATE INDEX idx_shift_userId ON Shift(userId);
CREATE INDEX idx_shift_status ON Shift(status);
CREATE INDEX idx_shift_openedAt ON Shift(openedAt);

CREATE TABLE IF NOT EXISTS CashMovement (
    id TEXT PRIMARY KEY NOT NULL,
    shiftId TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Addition', 'Removal')),
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    addedBy TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (shiftId) REFERENCES Shift(id) ON DELETE CASCADE,
    FOREIGN KEY (addedBy) REFERENCES User(id)
);

CREATE INDEX idx_cashMovement_shiftId ON CashMovement(shiftId);
CREATE INDEX idx_cashMovement_type ON CashMovement(type);

-- ============================================
-- 7. PAYMENT METHODS
-- ============================================

CREATE TABLE IF NOT EXISTS PaymentMethod (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Cash', 'Card', 'BankTransfer', 'Check', 'GiftCard', 'StoreCredit', 'OnAccount')),
    isActive INTEGER DEFAULT 1,
    requiresAuthorization INTEGER DEFAULT 0,
    accountId TEXT,
    sortOrder INTEGER DEFAULT 0,
    icon TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_paymentMethod_code ON PaymentMethod(code);
CREATE INDEX idx_paymentMethod_isActive ON PaymentMethod(isActive);

CREATE TABLE IF NOT EXISTS GiftCard (
    id TEXT PRIMARY KEY NOT NULL,
    cardNumber TEXT UNIQUE NOT NULL,
    pin TEXT,
    customerId TEXT,
    initialValue REAL NOT NULL,
    currentBalance REAL NOT NULL,
    issuedDate TEXT NOT NULL DEFAULT (datetime('now')),
    expiryDate TEXT,
    isActive INTEGER DEFAULT 1,
    issuedOrderId TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customerId) REFERENCES Customer(id)
);

CREATE INDEX idx_giftCard_cardNumber ON GiftCard(cardNumber);
CREATE INDEX idx_giftCard_customerId ON GiftCard(customerId);
CREATE INDEX idx_giftCard_isActive ON GiftCard(isActive);

CREATE TABLE IF NOT EXISTS StoreCredit (
    id TEXT PRIMARY KEY NOT NULL,
    customerId TEXT NOT NULL,
    amount REAL NOT NULL,
    balance REAL NOT NULL,
    reason TEXT,
    issuedDate TEXT NOT NULL DEFAULT (datetime('now')),
    expiryDate TEXT,
    issuedBy TEXT NOT NULL,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE,
    FOREIGN KEY (issuedBy) REFERENCES User(id)
);

CREATE INDEX idx_storeCredit_customerId ON StoreCredit(customerId);
CREATE INDEX idx_storeCredit_issuedBy ON StoreCredit(issuedBy);

-- ============================================
-- 8. SALES & ORDERS
-- ============================================

CREATE TABLE IF NOT EXISTS SaleOrder (
    id TEXT PRIMARY KEY NOT NULL,
    orderNumber TEXT UNIQUE NOT NULL,
    orderType TEXT DEFAULT 'Sale' CHECK(orderType IN ('Sale', 'Return', 'Exchange')),
    locationId TEXT NOT NULL,
    customerId TEXT,
    cashierId TEXT NOT NULL,
    orderDate TEXT NOT NULL DEFAULT (datetime('now')),
    completedAt TEXT,
    status TEXT DEFAULT 'Open' CHECK(status IN ('Open', 'Completed', 'Voided', 'Parked', 'OnHold')),
    subtotal REAL NOT NULL,
    taxAmount REAL NOT NULL,
    discountAmount REAL DEFAULT 0,
    totalAmount REAL NOT NULL,
    amountPaid REAL DEFAULT 0,
    changeAmount REAL DEFAULT 0,
    amountDue REAL DEFAULT 0,
    notes TEXT,
    customerNotes TEXT,
    internalNotes TEXT,
    referenceOrderId TEXT,
    source TEXT DEFAULT 'POS' CHECK(source IN ('POS', 'Online', 'Mobile')),
    receiptNumber TEXT,
    receiptEmailedAt TEXT,
    receiptPrintedAt TEXT,
    shiftId TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (locationId) REFERENCES Location(id),
    FOREIGN KEY (customerId) REFERENCES Customer(id),
    FOREIGN KEY (cashierId) REFERENCES User(id),
    FOREIGN KEY (shiftId) REFERENCES Shift(id)
);

CREATE INDEX idx_saleOrder_orderNumber ON SaleOrder(orderNumber);
CREATE INDEX idx_saleOrder_customerId ON SaleOrder(customerId);
CREATE INDEX idx_saleOrder_locationId ON SaleOrder(locationId);
CREATE INDEX idx_saleOrder_cashierId ON SaleOrder(cashierId);
CREATE INDEX idx_saleOrder_orderDate ON SaleOrder(orderDate);
CREATE INDEX idx_saleOrder_status ON SaleOrder(status);
CREATE INDEX idx_saleOrder_shiftId ON SaleOrder(shiftId);

CREATE TABLE IF NOT EXISTS OrderLineItem (
    id TEXT PRIMARY KEY NOT NULL,
    orderId TEXT NOT NULL,
    variantId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unitPrice REAL NOT NULL,
    lineDiscount REAL DEFAULT 0,
    lineTax REAL DEFAULT 0,
    lineTotal REAL NOT NULL,
    cost REAL,
    isRefunded INTEGER DEFAULT 0,
    refundedQuantity INTEGER DEFAULT 0,
    notes TEXT,
    customizations TEXT, -- JSON
    serialNumbers TEXT, -- JSON array
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (orderId) REFERENCES SaleOrder(id) ON DELETE CASCADE,
    FOREIGN KEY (variantId) REFERENCES ProductVariant(id)
);

CREATE INDEX idx_orderLineItem_orderId ON OrderLineItem(orderId);
CREATE INDEX idx_orderLineItem_variantId ON OrderLineItem(variantId);

-- Update SerialNumber table to add foreign keys to SaleOrder and OrderLineItem
-- These were forward referenced earlier
CREATE INDEX idx_serialNumber_orderId ON SerialNumber(orderId);
CREATE INDEX idx_serialNumber_orderLineItemId ON SerialNumber(orderLineItemId);

CREATE TABLE IF NOT EXISTS OrderPayment (
    id TEXT PRIMARY KEY NOT NULL,
    orderId TEXT NOT NULL,
    paymentMethodId TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    transactionId TEXT,
    authorizationCode TEXT,
    cardLast4 TEXT,
    cardBrand TEXT,
    processedAt TEXT NOT NULL DEFAULT (datetime('now')),
    refundedAmount REAL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (orderId) REFERENCES SaleOrder(id) ON DELETE CASCADE,
    FOREIGN KEY (paymentMethodId) REFERENCES PaymentMethod(id)
);

CREATE INDEX idx_orderPayment_orderId ON OrderPayment(orderId);
CREATE INDEX idx_orderPayment_paymentMethodId ON OrderPayment(paymentMethodId);
CREATE INDEX idx_orderPayment_status ON OrderPayment(status);

CREATE TABLE IF NOT EXISTS ShiftTransaction (
    id TEXT PRIMARY KEY NOT NULL,
    shiftId TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Sale', 'Return', 'CashIn', 'CashOut', 'Payout')),
    amount REAL NOT NULL,
    paymentMethodId TEXT,
    orderId TEXT,
    notes TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (shiftId) REFERENCES Shift(id) ON DELETE CASCADE,
    FOREIGN KEY (paymentMethodId) REFERENCES PaymentMethod(id),
    FOREIGN KEY (orderId) REFERENCES SaleOrder(id)
);

CREATE INDEX idx_shiftTransaction_shiftId ON ShiftTransaction(shiftId);
CREATE INDEX idx_shiftTransaction_type ON ShiftTransaction(type);
CREATE INDEX idx_shiftTransaction_timestamp ON ShiftTransaction(timestamp);

-- ============================================
-- 9. RETURNS & EXCHANGES
-- ============================================

CREATE TABLE IF NOT EXISTS ReturnOrder (
    id TEXT PRIMARY KEY NOT NULL,
    returnNumber TEXT UNIQUE NOT NULL,
    originalOrderId TEXT NOT NULL,
    locationId TEXT NOT NULL,
    customerId TEXT,
    processedBy TEXT NOT NULL,
    returnDate TEXT NOT NULL DEFAULT (datetime('now')),
    returnType TEXT NOT NULL CHECK(returnType IN ('Full', 'Partial')),
    returnReason TEXT,
    notes TEXT,
    refundMethod TEXT,
    refundAmount REAL NOT NULL,
    restockFee REAL DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Completed', 'Rejected')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (originalOrderId) REFERENCES SaleOrder(id),
    FOREIGN KEY (locationId) REFERENCES Location(id),
    FOREIGN KEY (customerId) REFERENCES Customer(id),
    FOREIGN KEY (processedBy) REFERENCES User(id)
);

CREATE INDEX idx_returnOrder_returnNumber ON ReturnOrder(returnNumber);
CREATE INDEX idx_returnOrder_originalOrderId ON ReturnOrder(originalOrderId);
CREATE INDEX idx_returnOrder_customerId ON ReturnOrder(customerId);
CREATE INDEX idx_returnOrder_status ON ReturnOrder(status);

CREATE TABLE IF NOT EXISTS ReturnLineItem (
    id TEXT PRIMARY KEY NOT NULL,
    returnId TEXT NOT NULL,
    originalLineItemId TEXT NOT NULL,
    variantId TEXT NOT NULL,
    quantityReturned INTEGER NOT NULL,
    refundAmount REAL NOT NULL,
    condition TEXT NOT NULL CHECK(condition IN ('New', 'Used', 'Damaged')),
    restockable INTEGER DEFAULT 1,
    FOREIGN KEY (returnId) REFERENCES ReturnOrder(id) ON DELETE CASCADE,
    FOREIGN KEY (originalLineItemId) REFERENCES OrderLineItem(id),
    FOREIGN KEY (variantId) REFERENCES ProductVariant(id)
);

CREATE INDEX idx_returnLineItem_returnId ON ReturnLineItem(returnId);
CREATE INDEX idx_returnLineItem_originalLineItemId ON ReturnLineItem(originalLineItemId);
CREATE INDEX idx_returnLineItem_variantId ON ReturnLineItem(variantId);

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
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (originalOrderId) REFERENCES SaleOrder(id),
    FOREIGN KEY (newOrderId) REFERENCES SaleOrder(id),
    FOREIGN KEY (processedBy) REFERENCES User(id)
);

CREATE INDEX idx_exchangeOrder_exchangeNumber ON ExchangeOrder(exchangeNumber);
CREATE INDEX idx_exchangeOrder_originalOrderId ON ExchangeOrder(originalOrderId);
CREATE INDEX idx_exchangeOrder_newOrderId ON ExchangeOrder(newOrderId);

-- ============================================
-- 10. DISCOUNTS & PROMOTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS Promotion (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Percentage', 'FixedAmount', 'BuyXGetY', 'FreeShipping')),
    value REAL NOT NULL,
    applicableTo TEXT NOT NULL CHECK(applicableTo IN ('EntireOrder', 'Category', 'Product', 'Customer')),
    minPurchaseAmount REAL,
    maxDiscountAmount REAL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    usageLimit INTEGER,
    usageCount INTEGER DEFAULT 0,
    customerGroupIds TEXT, -- JSON array
    categoryIds TEXT, -- JSON array
    productIds TEXT, -- JSON array
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_promotion_code ON Promotion(code);
CREATE INDEX idx_promotion_isActive ON Promotion(isActive);
CREATE INDEX idx_promotion_startDate ON Promotion(startDate);
CREATE INDEX idx_promotion_endDate ON Promotion(endDate);

-- Join table for Promotion and Category many-to-many relationship
CREATE TABLE IF NOT EXISTS PromotionCategory (
    promotionId TEXT NOT NULL,
    categoryId TEXT NOT NULL,
    FOREIGN KEY (promotionId) REFERENCES Promotion(id) ON DELETE CASCADE,
    FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE CASCADE,
    PRIMARY KEY (promotionId, categoryId)
);

CREATE TABLE IF NOT EXISTS OrderDiscount (
    id TEXT PRIMARY KEY NOT NULL,
    orderId TEXT NOT NULL,
    discountId TEXT,
    discountAmount REAL NOT NULL,
    appliedBy TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (orderId) REFERENCES SaleOrder(id) ON DELETE CASCADE,
    FOREIGN KEY (discountId) REFERENCES Promotion(id),
    FOREIGN KEY (appliedBy) REFERENCES User(id)
);

CREATE INDEX idx_orderDiscount_orderId ON OrderDiscount(orderId);
CREATE INDEX idx_orderDiscount_discountId ON OrderDiscount(discountId);

-- ============================================
-- 11. TAXES
-- ============================================

CREATE TABLE IF NOT EXISTS TaxRate (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    rate REAL NOT NULL,
    type TEXT DEFAULT 'Percentage' CHECK(type IN ('Percentage', 'Fixed')),
    applicableLocations TEXT, -- JSON array
    isCompound INTEGER DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    effectiveDate TEXT NOT NULL DEFAULT (datetime('now')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_taxRate_name ON TaxRate(name);
CREATE INDEX idx_taxRate_isActive ON TaxRate(isActive);
CREATE INDEX idx_taxRate_effectiveDate ON TaxRate(effectiveDate);

-- ============================================
-- 12. EXPENSES & ACCOUNTING
-- ============================================

CREATE TABLE IF NOT EXISTS ExpenseAccount (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('COGS', 'Operating', 'Utilities', 'Payroll', 'Marketing', 'Rent', 'Insurance', 'Supplies', 'Maintenance', 'Other')),
    parentAccountId TEXT,
    isActive INTEGER DEFAULT 1,
    description TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parentAccountId) REFERENCES ExpenseAccount(id)
);

CREATE INDEX idx_expenseAccount_code ON ExpenseAccount(code);
CREATE INDEX idx_expenseAccount_parentAccountId ON ExpenseAccount(parentAccountId);
CREATE INDEX idx_expenseAccount_isActive ON ExpenseAccount(isActive);

CREATE TABLE IF NOT EXISTS BankAccount (
    id TEXT PRIMARY KEY NOT NULL,
    accountNumber TEXT UNIQUE NOT NULL,
    bankName TEXT NOT NULL,
    accountType TEXT NOT NULL CHECK(accountType IN ('Checking', 'Savings', 'CreditCard')),
    currentBalance REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    isActive INTEGER DEFAULT 1,
    locationId TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (locationId) REFERENCES Location(id)
);

CREATE INDEX idx_bankAccount_accountNumber ON BankAccount(accountNumber);
CREATE INDEX idx_bankAccount_locationId ON BankAccount(locationId);
CREATE INDEX idx_bankAccount_isActive ON BankAccount(isActive);

CREATE TABLE IF NOT EXISTS Expense (
    id TEXT PRIMARY KEY NOT NULL,
    expenseNumber TEXT UNIQUE NOT NULL,
    expenseAccountId TEXT NOT NULL,
    locationId TEXT NOT NULL,
    amount REAL NOT NULL,
    expenseDate TEXT NOT NULL,
    paidDate TEXT,
    paymentMethodId TEXT,
    bankAccountId TEXT,
    vendorId TEXT,
    description TEXT NOT NULL,
    notes TEXT,
    receiptImage TEXT,
    createdBy TEXT NOT NULL,
    approvedBy TEXT,
    status TEXT DEFAULT 'Draft' CHECK(status IN ('Draft', 'Approved', 'Paid', 'Rejected')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (expenseAccountId) REFERENCES ExpenseAccount(id),
    FOREIGN KEY (locationId) REFERENCES Location(id),
    FOREIGN KEY (paymentMethodId) REFERENCES PaymentMethod(id),
    FOREIGN KEY (bankAccountId) REFERENCES BankAccount(id),
    FOREIGN KEY (createdBy) REFERENCES User(id),
    FOREIGN KEY (approvedBy) REFERENCES User(id)
);

CREATE INDEX idx_expense_expenseNumber ON Expense(expenseNumber);
CREATE INDEX idx_expense_expenseAccountId ON Expense(expenseAccountId);
CREATE INDEX idx_expense_locationId ON Expense(locationId);
CREATE INDEX idx_expense_status ON Expense(status);
CREATE INDEX idx_expense_expenseDate ON Expense(expenseDate);

CREATE TABLE IF NOT EXISTS BankDeposit (
    id TEXT PRIMARY KEY NOT NULL,
    depositNumber TEXT UNIQUE NOT NULL,
    bankAccountId TEXT NOT NULL,
    locationId TEXT NOT NULL,
    depositDate TEXT NOT NULL,
    amount REAL NOT NULL,
    depositedBy TEXT NOT NULL,
    shiftIds TEXT, -- JSON array
    notes TEXT,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Completed', 'Cancelled')),
    referenceNumber TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (bankAccountId) REFERENCES BankAccount(id),
    FOREIGN KEY (locationId) REFERENCES Location(id),
    FOREIGN KEY (depositedBy) REFERENCES User(id)
);

CREATE INDEX idx_bankDeposit_depositNumber ON BankDeposit(depositNumber);
CREATE INDEX idx_bankDeposit_bankAccountId ON BankDeposit(bankAccountId);
CREATE INDEX idx_bankDeposit_locationId ON BankDeposit(locationId);
CREATE INDEX idx_bankDeposit_status ON BankDeposit(status);
CREATE INDEX idx_bankDeposit_depositDate ON BankDeposit(depositDate);

-- Join table for BankDeposit and Shift many-to-many relationship
CREATE TABLE IF NOT EXISTS BankDepositShift (
    depositId TEXT NOT NULL,
    shiftId TEXT NOT NULL,
    FOREIGN KEY (depositId) REFERENCES BankDeposit(id) ON DELETE CASCADE,
    FOREIGN KEY (shiftId) REFERENCES Shift(id) ON DELETE CASCADE,
    PRIMARY KEY (depositId, shiftId)
);

CREATE TABLE IF NOT EXISTS CashAccount (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    locationId TEXT NOT NULL,
    registerId TEXT,
    currentBalance REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Register', 'PettyCash')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (locationId) REFERENCES Location(id),
    FOREIGN KEY (registerId) REFERENCES CashRegister(id)
);

CREATE INDEX idx_cashAccount_locationId ON CashAccount(locationId);
CREATE INDEX idx_cashAccount_registerId ON CashAccount(registerId);

-- ============================================
-- 13. ADDITIONAL FEATURES
-- ============================================

CREATE TABLE IF NOT EXISTS ParkedOrder (
    id TEXT PRIMARY KEY NOT NULL,
    parkNumber TEXT UNIQUE NOT NULL,
    customerId TEXT,
    orderId TEXT UNIQUE NOT NULL,
    parkedAt TEXT NOT NULL DEFAULT (datetime('now')),
    parkedBy TEXT NOT NULL,
    expiryDate TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customerId) REFERENCES Customer(id),
    FOREIGN KEY (orderId) REFERENCES SaleOrder(id),
    FOREIGN KEY (parkedBy) REFERENCES User(id)
);

CREATE INDEX idx_parkedOrder_parkNumber ON ParkedOrder(parkNumber);
CREATE INDEX idx_parkedOrder_customerId ON ParkedOrder(customerId);
CREATE INDEX idx_parkedOrder_parkedAt ON ParkedOrder(parkedAt);
CREATE INDEX idx_parkedOrder_expiryDate ON ParkedOrder(expiryDate);

CREATE TABLE IF NOT EXISTS AuditLog (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT,
    action TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT NOT NULL,
    oldValue TEXT, -- JSON
    newValue TEXT, -- JSON
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    ipAddress TEXT,
    deviceInfo TEXT,
    FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE INDEX idx_auditLog_userId ON AuditLog(userId);
CREATE INDEX idx_auditLog_entityType ON AuditLog(entityType);
CREATE INDEX idx_auditLog_entityId ON AuditLog(entityId);
CREATE INDEX idx_auditLog_timestamp ON AuditLog(timestamp);
CREATE INDEX idx_auditLog_action ON AuditLog(action);

CREATE TABLE IF NOT EXISTS SystemSetting (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL, -- JSON
    category TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_systemSetting_key ON SystemSetting(key);
CREATE INDEX idx_systemSetting_category ON SystemSetting(category);
