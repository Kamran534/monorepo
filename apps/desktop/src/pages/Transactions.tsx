import { Transactions as SharedTransactions } from '@monorepo/shared-ui';
import { getDesktopProductRepository } from '../renderer/repositories/DesktopProductRepository.js';
import {
  getDesktopSalesOrderRepository,
  getDesktopParkedOrderRepository,
  getDesktopPaymentMethodRepository,
} from '../renderer/repositories/DesktopOrderRepositories.js';
import { getDesktopSalesPersonRepository } from '../renderer/repositories/DesktopSalesPersonRepository.js';

const productRepository = getDesktopProductRepository();

// Use IPC-based repositories that communicate with main process
// Main process has SQLite access and properly initialized data-access service
const salesOrderRepo = getDesktopSalesOrderRepository();
const parkedOrderRepo = getDesktopParkedOrderRepository();
const paymentMethodRepo = getDesktopPaymentMethodRepository();
const salesPersonRepo = getDesktopSalesPersonRepository();

export function Transactions() {
  // Use IDs that exist in both local SQLite and server PostgreSQL databases
  // These match the seed data created by prisma/seed.ts
  // IMPORTANT: Don't use undefined, as it will trigger default '1' values
  const currentUserId = 'd1c633de-7adc-4eec-87fc-ce4232bf0858'; // cashier user
  const currentLocationId = '3ffcbd8a-703b-4b37-9f31-30ec61546e98'; // Main Store

  console.log('[Desktop Transactions] Using IDs:', {
    currentUserId,
    currentLocationId,
    usingIPCRepositories: true,
  });

  return (
    <SharedTransactions
      productRepository={productRepository}
      salesOrderRepo={salesOrderRepo}
      parkedOrderRepo={parkedOrderRepo}
      paymentMethodRepo={paymentMethodRepo}
      salesPersonRepo={salesPersonRepo}
      currentUserId={currentUserId}
      currentLocationId={currentLocationId}
    />
  );
}

export default Transactions;
