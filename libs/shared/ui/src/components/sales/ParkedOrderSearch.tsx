/**
 * Parked Order Search Component
 *
 * Modal dialog for searching and loading parked orders
 */

import React, { useState, useEffect, useRef } from 'react';
import type { ParkedOrderListItem } from '@monorepo/shared-data-access';

export interface ComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface ParkedOrderSearchProps extends ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadOrder: (parkedOrderId: string, orderId: string) => void;
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedOrderId(null);
      onSearch('');
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen, onSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const handleSelectOrder = (parkedOrderId: string) => {
    setSelectedOrderId(parkedOrderId);
  };

  const handleLoadOrder = () => {
    if (selectedOrderId) {
      const selected = parkedOrders.find(po => po.id === selectedOrderId);
      if (selected) {
        onLoadOrder(selected.id, selected.orderId);
      }
    }
  };

  const handleDeleteOrder = (parkedOrderId: string) => {
    if (onDeleteOrder && confirm('Are you sure you want to delete this parked order?')) {
      onDeleteOrder(parkedOrderId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!isOpen) return null;

  const selectedOrder = parkedOrders.find(po => po.id === selectedOrderId);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      style={{
        backgroundColor: 'rgba(0,0,0,0.6)',
        ...style,
      }}
    >
      <div
        className="rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border-light)',
          color: 'var(--color-text-primary)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Load Parked Order
          </h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by customer name or order number..."
              ref={searchInputRef}
              className="w-full px-4 py-2 pl-10 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
                boxShadow: 'none',
              }}
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5"
              style={{ color: 'var(--color-text-secondary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Order List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : parkedOrders.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                {searchTerm ? 'No parked orders found matching your search' : 'No parked orders available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {parkedOrders.map((order) => (
                <div
                  key={order.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedOrderId === order.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectOrder(order.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          Parked
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {order.customerName ? (
                          <p>Customer: {order.customerName}</p>
                        ) : (
                          <p className="text-gray-400">Walk-in Customer</p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span>Park #: {order.parkNumber}</span>
                        <span>•</span>
                        <span>Parked: {formatDate(order.parkedAt)}</span>
                        {order.notes && (
                          <>
                            <span>•</span>
                            <span className="italic">{order.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                      {onDeleteOrder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                          className="mt-2 text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t"
          style={{
            borderColor: 'var(--color-border-light)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {parkedOrders.length > 0 && (
                <span>
                  {parkedOrders.length} parked order{parkedOrders.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border-light)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLoadOrder}
                disabled={!selectedOrderId}
                className="px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: selectedOrderId
                    ? 'var(--color-accent-blue)'
                    : 'var(--color-border-medium)',
                }}
              >
                Load Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
