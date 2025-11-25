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

interface PaymentMethodSeed {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodSeed[] = [
  {
    id: 'default-cash',
    code: 'CASH',
    name: 'Cash',
    type: 'Cash',
    isActive: true,
  },
  {
    id: 'default-card',
    code: 'CARD',
    name: 'Card',
    type: 'Card',
    isActive: true,
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

    // Check if any payment methods already exist
    const existingCountResult = await localDb.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM PaymentMethod`,
    );
    const existingCount = existingCountResult?.[0]?.count ?? 0;

    if (existingCount > 0) {
      // console.log('[SeedPaymentMethods] Payment methods already exist, skipping seed');
      return;
    }

    const timestamp = new Date().toISOString();

    for (const method of DEFAULT_PAYMENT_METHODS) {
      try {
        await localDb.execute(
          `INSERT INTO PaymentMethod (id, code, name, type, isActive, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            method.id,
            method.code,
            method.name,
            method.type,
            method.isActive ? 1 : 0,
            timestamp,
            timestamp,
          ],
        );
      } catch (error: any) {
        if (error.message?.includes('UNIQUE constraint') || error.message?.includes('already exists')) {
          // console.log(`[SeedPaymentMethods] Payment method ${method.code} already exists, skipping`);
          continue;
        }
        throw error;
      }
    }

    // console.log(`[SeedPaymentMethods] Seeded ${DEFAULT_PAYMENT_METHODS.length} default payment methods`);
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
