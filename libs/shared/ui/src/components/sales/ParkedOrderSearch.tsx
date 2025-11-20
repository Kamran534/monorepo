/**
 * Parked Order Search Component
 *
 * Side panel for searching and loading parked orders
 */

import React, { useState, useEffect, useRef } from 'react';
import { ParkedOrderListItem } from '@monorepo/shared-data-access';
import { Search, User, Clock3, DollarSign, Archive } from 'lucide-react';
import { SidePanel } from '@monorepo/shared-ui';

export interface ComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface ParkedOrderSearchProps extends ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadOrder: (parkedOrderId: string, orderId: string, order?: ParkedOrderListItem) => void;
  onDeleteOrder?: (parkedOrderId: string) => void;
  parkedOrders: ParkedOrderListItem[];
  onSearch: (searchTerm: string) => void;
  isLoading?: boolean;
}

export function ParkedOrderSearch({
  isOpen,
  onClose,
  onLoadOrder,
  onDeleteOrder,
  parkedOrders,
  onSearch,
  isLoading = false,
  className = '',
  style,
}: ParkedOrderSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedId(null);
      onSearch('');
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isOpen, onSearch]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const handleResume = (order: ParkedOrderListItem) => {
    setHighlightedId(order.id);
    onLoadOrder(order.id, order.orderId, order);
  };

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Parked orders"
      width="420px"
    >
      <div className={`flex flex-col h-full ${className}`} style={style}>
        <div className="pb-3 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Resume or manage held orders
          </p>
        </div>

        <div className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onSearch(e.target.value);
              }}
              placeholder="Search by customer, order number, or park number..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-current" />
            </div>
          ) : parkedOrders.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
              <p>{searchTerm ? 'No matching parked orders' : 'No parked orders yet'}</p>
            </div>
          ) : (
            parkedOrders.map((order) => (
              <button
                key={order.id}
                className="w-full text-left rounded-lg border px-4 py-3 flex flex-col gap-2 transition"
                style={{
                  borderColor:
                    highlightedId === order.id ? 'var(--color-accent-blue)' : 'var(--color-border-light)',
                  backgroundColor:
                    highlightedId === order.id ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                }}
                onClick={() => handleResume(order)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {order.orderNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                    Park #{order.parkNumber}
                  </span>
                </div>
                <div className="text-xs flex flex-wrap gap-3" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {order.customerName || 'Walk-in Customer'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5" />
                    {formatDate(order.parkedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
                {order.notes && (
                  <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
                    “{order.notes}”
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        <div className="pt-3 border-t flex items-center justify-between text-sm" style={{ borderColor: 'var(--color-border-light)', color: 'var(--color-text-secondary)' }}>
          <span>
            {parkedOrders.length} parked order{parkedOrders.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded border text-sm font-medium"
            style={{
              borderColor: 'var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </SidePanel>
  );
}
