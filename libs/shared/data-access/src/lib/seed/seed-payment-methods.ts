/**
 * Seed Payment Methods
 *
 * Auto-seeds payment methods into the database if they don't exist
 * Works with both SQLite (desktop) and IndexedDB (web)
 */

import type { LocalDbClient } from '../types';

const SQLITE_TABLE_MISSING_MESSAGE = 'no such table: PaymentMethod';

const PAYMENT_METHOD_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS PaymentMethod (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Cash', 'Card', 'BankTransfer', 'Check', 'GiftCard', 'StoreCredit', 'OnAccount')),
  currency TEXT DEFAULT 'USD' CHECK(currency IN ('USD', 'EUR', 'GBP', 'PKR', 'INR', 'CAD', 'AUD')),
  isActive INTEGER DEFAULT 1,
  requiresAuthorization INTEGER DEFAULT 0,
  accountId TEXT,
  sortOrder INTEGER DEFAULT 0,
  icon TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);`.trim();

const PAYMENT_METHOD_CODE_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_paymentMethod_code ON PaymentMethod(code);`.trim();

const PAYMENT_METHOD_ACTIVE_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_paymentMethod_isActive ON PaymentMethod(isActive);`.trim();

const PAYMENT_METHOD_TABLE_CHECK_SQL = 'SELECT 1 FROM PaymentMethod LIMIT 1';

async function ensurePaymentMethodTable(localDb: LocalDbClient) {
  try {
    await localDb.query(PAYMENT_METHOD_TABLE_CHECK_SQL);
    return;
  } catch (error: any) {
    const message: string = error?.message ?? '';
    if (!message.includes(SQLITE_TABLE_MISSING_MESSAGE)) {
      throw error;
    }
    // console.warn('[SeedPaymentMethods] PaymentMethod table missing. Creating schema...');
    try {
      await localDb.execute(PAYMENT_METHOD_TABLE_SQL);
      await localDb.execute(PAYMENT_METHOD_CODE_INDEX_SQL);
      await localDb.execute(PAYMENT_METHOD_ACTIVE_INDEX_SQL);
      // console.log('[SeedPaymentMethods] PaymentMethod table created successfully.');
    } catch (schemaError) {
      // console.error('[SeedPaymentMethods] Failed to create PaymentMethod table:', schemaError);
      throw schemaError;
    }
  }
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean | number;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: '1',
    code: 'CASH',
    name: 'Cash',
    type: 'Cash',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    code: 'CARD',
    name: 'Credit/Debit Card',
    type: 'Card',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    code: 'BANK_TRANSFER',
    name: 'Bank Transfer',
    type: 'BankTransfer',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    code: 'CHECK',
    name: 'Check',
    type: 'Check',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    code: 'GIFT_CARD',
    name: 'Gift Card',
    type: 'GiftCard',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    code: 'STORE_CREDIT',
    name: 'Store Credit',
    type: 'StoreCredit',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '7',
    code: 'ON_ACCOUNT',
    name: 'On Account',
    type: 'OnAccount',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Seed payment methods into the database
 * @param localDb - Local database client (SQLite or IndexedDB)
 * @returns Promise that resolves when seeding is complete
 */
export async function seedPaymentMethods(localDb: LocalDbClient): Promise<void> {
  try {
    // console.log('[SeedPaymentMethods] Checking if payment methods need to be seeded...');

    await ensurePaymentMethodTable(localDb);

    // Always ensure default payment methods exist (by code)
    // This ensures payment methods are available even if server has different ones
    // console.log('[SeedPaymentMethods] Ensuring default payment methods exist...');

    // Insert each payment method using upsert logic (insert or update by code)
    for (const method of DEFAULT_PAYMENT_METHODS) {
      try {
        // Check if payment method with this code already exists
        const existing = await localDb.query<PaymentMethod>(
          `SELECT * FROM PaymentMethod WHERE code = ?`,
          [method.code]
        );

        if (existing && existing.length > 0) {
          // Update existing payment method (preserve server ID if it exists)
          const existingMethod = existing[0];
          await localDb.execute(
            `UPDATE PaymentMethod SET name = ?, type = ?, isActive = ?, updatedAt = ? WHERE code = ?`,
            [
              method.name,
              method.type,
              method.isActive ? 1 : 0,
              method.updatedAt,
              method.code,
            ]
          );
          // console.log(`[SeedPaymentMethods] Updated payment method: ${method.name} (${method.code})`);
        } else {
          // Insert new payment method
          await localDb.execute(
            `INSERT INTO PaymentMethod (id, code, name, type, isActive, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              method.id,
              method.code,
              method.name,
              method.type,
              method.isActive ? 1 : 0, // Convert boolean to integer for SQLite
              method.createdAt,
              method.updatedAt,
            ]
          );
          // console.log(`[SeedPaymentMethods] Inserted payment method: ${method.name} (${method.code})`);
        }
      } catch (error: any) {
        // Ignore unique constraint errors (method already exists)
        if (error.message?.includes('UNIQUE constraint') || error.message?.includes('already exists')) {
          // console.log(`[SeedPaymentMethods] Payment method ${method.code} already exists, skipping`);
        } else {
          // console.error(`[SeedPaymentMethods] Error processing payment method ${method.code}:`, error);
          // Continue with next method instead of throwing
        }
      }
    }

    // console.log(`[SeedPaymentMethods] Successfully seeded ${DEFAULT_PAYMENT_METHODS.length} payment methods`);
  } catch (error) {
    // console.error('[SeedPaymentMethods] Error seeding payment methods:', error);
    throw error;
  }
}

/**
 * Verify payment methods exist in the database
 * @param localDb - Local database client
 * @returns Count of payment methods
 */
export async function verifyPaymentMethods(localDb: LocalDbClient): Promise<number> {
  try {
    const methods = await localDb.query<PaymentMethod>('SELECT * FROM PaymentMethod');
    const count = methods?.length || 0;
    // console.log(`[SeedPaymentMethods] Found ${count} payment methods in database`);
    return count;
  } catch (error) {
    // console.error('[SeedPaymentMethods] Error verifying payment methods:', error);
    return 0;
  }
}
