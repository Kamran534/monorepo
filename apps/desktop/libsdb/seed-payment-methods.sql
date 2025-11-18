-- Payment Methods Seed Data
-- Insert default payment methods for POS system

-- Cash
INSERT OR IGNORE INTO PaymentMethod (id, code, name, type, isActive, requiresAuthorization, sortOrder, createdAt, updatedAt)
VALUES (
  '1',
  'CASH',
  'Cash',
  'Cash',
  1,
  0,
  1,
  datetime('now'),
  datetime('now')
);

-- Credit/Debit Card
INSERT OR IGNORE INTO PaymentMethod (id, code, name, type, isActive, requiresAuthorization, sortOrder, createdAt, updatedAt)
VALUES (
  '2',
  'CARD',
  'Credit/Debit Card',
  'Card',
  1,
  1,
  2,
  datetime('now'),
  datetime('now')
);

-- Bank Transfer
INSERT OR IGNORE INTO PaymentMethod (id, code, name, type, isActive, requiresAuthorization, sortOrder, createdAt, updatedAt)
VALUES (
  '3',
  'BANK_TRANSFER',
  'Bank Transfer',
  'BankTransfer',
  1,
  0,
  3,
  datetime('now'),
  datetime('now')
);

-- Check
INSERT OR IGNORE INTO PaymentMethod (id, code, name, type, isActive, requiresAuthorization, sortOrder, createdAt, updatedAt)
VALUES (
  '4',
  'CHECK',
  'Check',
  'Check',
  1,
  1,
  4,
  datetime('now'),
  datetime('now')
);

-- Gift Card
INSERT OR IGNORE INTO PaymentMethod (id, code, name, type, isActive, requiresAuthorization, sortOrder, createdAt, updatedAt)
VALUES (
  '5',
  'GIFT_CARD',
  'Gift Card',
  'GiftCard',
  1,
  0,
  5,
  datetime('now'),
  datetime('now')
);

-- Store Credit
INSERT OR IGNORE INTO PaymentMethod (id, code, name, type, isActive, requiresAuthorization, sortOrder, createdAt, updatedAt)
VALUES (
  '6',
  'STORE_CREDIT',
  'Store Credit',
  'StoreCredit',
  1,
  0,
  6,
  datetime('now'),
  datetime('now')
);

-- On Account (Customer Account)
INSERT OR IGNORE INTO PaymentMethod (id, code, name, type, isActive, requiresAuthorization, sortOrder, createdAt, updatedAt)
VALUES (
  '7',
  'ON_ACCOUNT',
  'On Account',
  'OnAccount',
  1,
  1,
  7,
  datetime('now'),
  datetime('now')
);
