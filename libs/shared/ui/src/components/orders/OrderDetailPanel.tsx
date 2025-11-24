import { X } from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface OrderDetailPanelProps extends ComponentProps {
  order: {
    id: string;
    orderNumber: string;
    status?: string;
    orderDate: string | Date;
    completedAt?: string | Date;
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    amountPaid?: number;
    changeAmount?: number;
    notes?: string;
    customerId?: string;
    salesPersonId?: string;
    customer?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      name?: string;
      customerCode?: string;
    };
    salesPerson?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      code?: string;
    };
    cashier?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      username?: string;
    };
  };
  onClose: () => void;
  formatDate: (date: string | Date | undefined) => string;
  formatCurrency: (amount: number | undefined) => string;
  isAnimatingOut?: boolean;
}

export function OrderDetailPanel({
  order,
  onClose,
  formatDate,
  formatCurrency,
  isAnimatingOut = false,
  className = '',
}: OrderDetailPanelProps) {
  return (
    <div
      className={`flex flex-col h-full w-full min-h-0 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        animation: isAnimatingOut ? 'slideOutRight 0s ease-out' : 'slideInRight 0s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .order-detail-scroll-container::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .order-detail-scroll-container::-webkit-scrollbar-track {
          background: var(--color-bg-secondary);
          border-radius: 10px;
        }
        .order-detail-scroll-container::-webkit-scrollbar-thumb {
          background-color: var(--color-border-light);
          border-radius: 10px;
          border: 2px solid var(--color-bg-secondary);
          transition: background-color 0.2s ease;
        }
        .order-detail-scroll-container::-webkit-scrollbar-thumb:hover {
          background-color: var(--color-border-medium);
        }
      `}</style>

      {/* Header */}
      <div
        className="px-4 py-3 border-b flex-shrink-0 flex items-center justify-between"
        style={{
          borderColor: 'var(--color-border-light)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Details
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full transition-colors"
          style={{
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 order-detail-scroll-container"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-border-light) var(--color-bg-secondary)',
        }}
      >
        {/* Order Info */}
        <div>
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Order Information
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-text-secondary)' }}>Order Number:</span>
              <span
                className="font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {order.orderNumber || order.id}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-medium"
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
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-text-secondary)' }}>Date:</span>
              <span
                className="font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {formatDate(order.orderDate)}
              </span>
            </div>
            {order.completedAt && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-secondary)' }}>Completed:</span>
                <span
                  className="font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatDate(order.completedAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Customer Information */}
        {(order.customer || order.customerId) && (
          <div>
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Customer
            </h3>
            <div className="space-y-2">
              {order.customer ? (
                <>
                  {(order.customer.name || (order.customer.firstName && order.customer.lastName)) && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Name:</span>
                      <span
                        className="font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {order.customer.name || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'N/A'}
                      </span>
                    </div>
                  )}
                  {order.customer.email && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Email:</span>
                      <span
                        className="font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {order.customer.email}
                      </span>
                    </div>
                  )}
                  {order.customer.phone && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Phone:</span>
                      <span
                        className="font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {order.customer.phone}
                      </span>
                    </div>
                  )}
                  {order.customer.customerCode && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Code:</span>
                      <span
                        className="font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {order.customer.customerCode}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary)' }}>ID:</span>
                  <span
                    className="font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {order.customerId}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sales Person Information */}
        {(order.salesPerson || order.salesPersonId) && (
          <div>
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Sales Person
            </h3>
            <div className="space-y-2">
              {order.salesPerson && (
                <>
                  {(order.salesPerson.name || (order.salesPerson.firstName && order.salesPerson.lastName)) && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Name:</span>
                      <span
                        className="font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {order.salesPerson.name || `${order.salesPerson.firstName || ''} ${order.salesPerson.lastName || ''}`.trim() || 'N/A'}
                      </span>
                    </div>
                  )}
                  {order.salesPerson.code && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Code:</span>
                      <span
                        className="font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {order.salesPerson.code}
                      </span>
                    </div>
                  )}
                </>
              )}
              {!order.salesPerson && order.salesPersonId && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary)' }}>ID:</span>
                  <span
                    className="font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {order.salesPersonId}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div>
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Financial Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal:</span>
              <span
                className="font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            {(order.discountAmount !== undefined && order.discountAmount !== null && order.discountAmount > 0) && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-secondary)' }}>Discount:</span>
                <span
                  className="font-medium"
                  style={{ color: 'var(--color-error-500)' }}
                >
                  -{formatCurrency(order.discountAmount)}
                </span>
              </div>
            )}
            {order.taxAmount && order.taxAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-secondary)' }}>Tax:</span>
                <span
                  className="font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatCurrency(order.taxAmount)}
                </span>
              </div>
            )}
            <div
              className="flex justify-between pt-2 border-t text-sm"
              style={{ borderColor: 'var(--color-border-light)' }}
            >
              <span
                className="font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Total:
              </span>
              <span
                className="font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
            {order.amountPaid !== undefined && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-secondary)' }}>Amount Paid:</span>
                <span
                  className="font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatCurrency(order.amountPaid)}
                </span>
              </div>
            )}
            {order.changeAmount !== undefined && order.changeAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-secondary)' }}>Change:</span>
                <span
                  className="font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatCurrency(order.changeAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Notes
            </h3>
            <p
              className="p-2 rounded text-xs"
              style={{
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-card)',
              }}
            >
              {order.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

