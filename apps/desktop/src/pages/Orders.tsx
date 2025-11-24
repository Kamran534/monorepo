import { Orders as SharedOrders } from '@monorepo/shared-ui';
import { getDesktopSalesOrderRepository } from '../renderer/repositories/DesktopOrderRepositories.js';

const salesOrderRepo = getDesktopSalesOrderRepository();

export function Orders() {
  return <SharedOrders salesOrderRepo={salesOrderRepo} />;
}

export default Orders;

