import { OrderDetail as SharedOrderDetail } from '@monorepo/shared-ui';
import { getDesktopSalesOrderRepository } from '../renderer/repositories/DesktopOrderRepositories.js';

const salesOrderRepo = getDesktopSalesOrderRepository();

export function OrderDetail() {
  return <SharedOrderDetail salesOrderRepo={salesOrderRepo} />;
}

export default OrderDetail;


