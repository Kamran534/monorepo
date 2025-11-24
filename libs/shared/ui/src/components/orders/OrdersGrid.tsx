import { Folder } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { OrderCard } from './OrderCard.js';

export interface OrdersGridProps extends ComponentProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string | Date;
    status?: string;
    totalAmount?: number;
  }>;
  selectedOrderId?: string | null;
  onOrderClick: (order: any) => void;
  formatDate: (date: string | Date | undefined) => string;
  formatCurrency: (amount: number | undefined) => string;
  columns?: 3 | 4;
}

export function OrdersGrid({
  orders,
  selectedOrderId,
  onOrderClick,
  formatDate,
  formatCurrency,
  columns = 4,
  className = '',
}: OrdersGridProps) {
  if (orders.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-64"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <Folder className="w-8 h-8 mb-3 opacity-50" />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          No orders found
        </p>
      </div>
    );
  }

  const gridColsClass = columns === 3 
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div
      className={`grid ${gridColsClass} gap-3 ${className}`}
    >
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onClick={() => onOrderClick(order)}
          isSelected={selectedOrderId === order.id}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      ))}
    </div>
  );
}

