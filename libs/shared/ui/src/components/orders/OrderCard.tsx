import { Folder, Calendar, DollarSign } from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface OrderCardProps extends ComponentProps {
  order: {
    id: string;
    orderNumber: string;
    orderDate: string | Date;
    status?: string;
    totalAmount?: number;
  };
  onClick: () => void;
  isSelected: boolean;
  formatDate: (date: string | Date | undefined) => string;
  formatCurrency: (amount: number | undefined) => string;
}

export function OrderCard({
  order,
  onClick,
  isSelected,
  formatDate,
  formatCurrency,
  className = '',
}: OrderCardProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${className}`}
      style={{
        backgroundColor: isSelected ? 'rgba(234, 88, 12, 0.1)' : 'var(--color-bg-card)',
        border: `1px solid ${isSelected ? '#ea580c' : 'var(--color-border-light)'}`,
        borderRadius: '4px',
        padding: '12px',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Folder Icon and Status */}
      <div className="flex items-start justify-between mb-2">
        <Folder
          className="w-8 h-8"
          style={{
            color: isSelected ? '#ea580c' : 'var(--color-text-secondary)',
          }}
        />
        <span
          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor:
              order.status === 'Completed'
                ? 'var(--color-success-100)'
                : order.status === 'Open'
                ? 'var(--color-info-100)'
                : order.status === 'Voided'
                ? 'var(--color-error-100)'
                : 'var(--color-bg-secondary)',
            color:
              order.status === 'Completed'
                ? 'var(--color-success-700)'
                : order.status === 'Open'
                ? 'var(--color-info-700)'
                : order.status === 'Voided'
                ? 'var(--color-error-700)'
                : 'var(--color-text-secondary)',
          }}
        >
          {order.status || 'Unknown'}
        </span>
      </div>

      {/* Order ID */}
      <div className="mb-2">
        <h3
          className="font-semibold text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {order.orderNumber || order.id}
        </h3>
      </div>

      {/* Order Details */}
      <div className="space-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(order.orderDate)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3" />
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {formatCurrency(order.totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}

