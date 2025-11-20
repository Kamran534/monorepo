import { Payments as SharedPayments } from '@monorepo/shared-ui';
import {
  getDesktopSalesOrderRepository,
  getDesktopParkedOrderRepository,
} from '../renderer/repositories/DesktopOrderRepositories.js';

const salesOrderRepo = getDesktopSalesOrderRepository();
const parkedOrderRepo = getDesktopParkedOrderRepository();

export function Payments() {
  // Use IDs that exist in both local SQLite and server PostgreSQL databases
  // These match the seed data created by prisma/seed.ts
  const currentUserId = 'd1c633de-7adc-4eec-87fc-ce4232bf0858'; // cashier user
  const currentLocationId = '3ffcbd8a-703b-4b37-9f31-30ec61546e98'; // Main Store

  return (
    <SharedPayments
      salesOrderRepo={salesOrderRepo}
      parkedOrderRepo={parkedOrderRepo}
      currentUserId={currentUserId}
      currentLocationId={currentLocationId}
    />
  );
}

export default Payments;
