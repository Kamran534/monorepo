/**
 * Seed Payment Methods
 *
 * Auto-seeds payment methods into the database if they don't exist
 * Works with both SQLite (desktop) and IndexedDB (web)
 */

import type { LocalDbClient } from '../types';

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
    console.log('[SeedPaymentMethods] Checking if payment methods need to be seeded...');

    // Check if any payment methods already exist
    const existingMethods = await localDb.query<PaymentMethod>('SELECT * FROM PaymentMethod LIMIT 1');

    if (existingMethods && existingMethods.length > 0) {
      console.log('[SeedPaymentMethods] Payment methods already exist, skipping seed');
      return;
    }

    console.log('[SeedPaymentMethods] No payment methods found, seeding defaults...');

    // Insert each payment method
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
            method.isActive ? 1 : 0, // Convert boolean to integer for SQLite
            method.createdAt,
            method.updatedAt,
          ]
        );
        console.log(`[SeedPaymentMethods] Inserted payment method: ${method.name} (${method.code})`);
      } catch (error: any) {
        // Ignore unique constraint errors (method already exists)
        if (error.message?.includes('UNIQUE constraint') || error.message?.includes('already exists')) {
          console.log(`[SeedPaymentMethods] Payment method ${method.code} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }

    console.log(`[SeedPaymentMethods] Successfully seeded ${DEFAULT_PAYMENT_METHODS.length} payment methods`);
  } catch (error) {
    console.error('[SeedPaymentMethods] Error seeding payment methods:', error);
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
    console.log(`[SeedPaymentMethods] Found ${count} payment methods in database`);
    return count;
  } catch (error) {
    console.error('[SeedPaymentMethods] Error verifying payment methods:', error);
    return 0;
  }
}
