import { Transactions as SharedTransactions } from '@monorepo/shared-ui';
import { getDesktopProductRepository } from '../renderer/repositories/DesktopProductRepository.js';
import { DesktopSqliteClient } from '../../../../libs/shared/data-access/src/lib/local-db-client.ts';
import {
  SalesOrderRepository,
} from '../../../../libs/shared/data-access/src/lib/repos/sales-order-repository.ts';
import {
  ParkedOrderRepository,
} from '../../../../libs/shared/data-access/src/lib/repos/parked-order-repository.ts';
import {
  PaymentMethodRepository,
} from '../../../../libs/shared/data-access/src/lib/repos/payment-method-repository.ts';
import { HttpApiClient } from '../../../../libs/shared/data-access/src/lib/remote-api-client.ts';

const productRepository = getDesktopProductRepository();

// Initialize database client and repositories
const isDesktopRuntime =
  typeof process !== 'undefined' &&
  typeof process.versions === 'object' &&
  !!process.versions?.electron;

const cwd =
  isDesktopRuntime && typeof process.cwd === 'function'
    ? process.cwd()
    : '';
const dbPath = cwd ? `${cwd}/apps/desktop/libsdb/cpos.db` : 'apps/desktop/libsdb/cpos.db';

const apiClient = isDesktopRuntime ? new HttpApiClient() : undefined;
const dbClient = isDesktopRuntime ? new DesktopSqliteClient(dbPath) : undefined;

if (isDesktopRuntime && dbClient) {
  dbClient.initialize().catch((err) => {
    console.error('[Desktop Transactions] Failed to initialize database:', err);
  });
}

const salesOrderRepo =
  isDesktopRuntime && dbClient && apiClient
    ? new SalesOrderRepository(dbClient, apiClient)
    : undefined;
const parkedOrderRepo =
  isDesktopRuntime && dbClient && apiClient
    ? new ParkedOrderRepository(dbClient, apiClient)
    : undefined;
const paymentMethodRepo =
  isDesktopRuntime && dbClient && apiClient
    ? new PaymentMethodRepository(dbClient, apiClient)
    : undefined;

export function Transactions() {
  // Use IDs that exist in both local SQLite and server PostgreSQL databases
  // These match the seed data created by prisma/seed.ts
  // IMPORTANT: Don't use undefined, as it will trigger default '1' values
  const currentUserId = 'd1c633de-7adc-4eec-87fc-ce4232bf0858'; // cashier user
  const currentLocationId = '3ffcbd8a-703b-4b37-9f31-30ec61546e98'; // Main Store

  console.log('[Desktop Transactions] Using IDs:', {
    currentUserId,
    currentLocationId,
    isDesktopRuntime,
  });

  return (
    <SharedTransactions
      productRepository={productRepository}
      salesOrderRepo={salesOrderRepo}
      parkedOrderRepo={parkedOrderRepo}
      paymentMethodRepo={paymentMethodRepo}
      currentUserId={currentUserId}
      currentLocationId={currentLocationId}
    />
  );
}

export default Transactions;
