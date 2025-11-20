import React from 'react';
import { Package, CreditCard, ChevronDown, ChevronRight } from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  productId?: string; // Product ID for inventory tracking
  productVariantId?: string; // Variant ID for inventory tracking
  availableQuantity?: number; // Available stock quantity
}

export interface BillingSummary {
  subtotal: number;
  discount?: number;
  giftCardValue?: number;
  adjustment?: number;
  tax?: number;
  total: number;
  paid?: number;
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  icon?: string;
}

export interface TransactionLinesProps extends ComponentProps {
  lineItems: LineItem[];
  selectedItem?: string;
  onItemSelect?: (itemId: string) => void;
  activeTab?: 'lines' | 'payments';
  onTabChange?: (tab: 'lines' | 'payments') => void;
  billingSummary?: BillingSummary;
  /** Optional order-level sales person name to show in line details */
  salesPersonName?: string | null;
  /** Payment methods to display in the Payments tab */
  paymentMethods?: PaymentMethod[];
}

/**
 * TransactionLines Component
 * 
 * Left panel of the transactions page showing product lines,
 * tabs, and transaction summary.
 */
export function TransactionLines({
  lineItems,
  selectedItem,
  onItemSelect,
  activeTab = 'lines',
  onTabChange,
  billingSummary,
  salesPersonName,
  paymentMethods = [],
  className = '',
}: TransactionLinesProps) {
  const [expandedItemId, setExpandedItemId] = React.useState<string | null>(null);
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const fallbackSubtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const fallbackTax = fallbackSubtotal * 0.1;
  const fallbackTotal = fallbackSubtotal + fallbackTax;

  const summary: BillingSummary = billingSummary ?? {
    subtotal: fallbackSubtotal,
    tax: fallbackTax,
    total: fallbackTotal,
  };

  const discountTotal = (summary.discount ?? 0) + (summary.giftCardValue ?? 0);
  const adjustmentValue = summary.adjustment ?? 0;
  const taxValue = summary.tax ?? 0;
  const amountPaid = summary.paid ?? 0;
  const amountDue = Math.max(0, summary.total - amountPaid);

  return (
    <div
      className={`flex flex-col h-full w-full md:w-auto min-h-0 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border-light)',
      }}
    >
      {/* Tabs */}
      <div
        className="flex"
        style={{ borderBottom: '1px solid var(--color-border-light)' }}
      >
        <button
          onClick={() => onTabChange?.('lines')}
          className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium transition-all"
          style={{
            color: activeTab === 'lines' ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
            backgroundColor: activeTab === 'lines' ? 'var(--color-bg-hover)' : 'transparent',
          }}
        >
          Lines
        </button>
        <button
          onClick={() => onTabChange?.('payments')}
          className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium transition-all"
          style={{
            color: activeTab === 'payments' ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
            backgroundColor: activeTab === 'payments' ? 'var(--color-bg-hover)' : 'transparent',
          }}
        >
          Payments
        </button>
      </div>

      {/* Content Area */}
      <div
        className="overflow-y-auto min-h-0 flex-1"
      >
        {activeTab === 'payments' ? (
          // Payments tab: Show payment methods
          paymentMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <CreditCard className="w-8 h-8" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }} />
              <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                No Payment Methods
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                No active payment methods available
              </p>
            </div>
          ) : (
            <div className="p-2 md:p-4 space-y-1.5 md:space-y-2 h-full">
              {/* Header Row */}
              <div
                className="grid grid-cols-2 gap-2 px-3 py-1 rounded text-[10px] md:text-xs font-semibold uppercase tracking-wide sticky top-0 z-10"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-light)',
                }}
              >
                <span className="text-left">Method Name</span>
                <span className="text-right">Currency</span>
              </div>

              {/* Payment Methods List */}
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="grid grid-cols-2 gap-2 px-3 py-2 rounded transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border-light)',
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {method.name}
                    </span>
                    <span className="text-[10px] md:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {method.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-xs md:text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      USD
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Lines tab: Show product list
          lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Package className="w-8 h-8" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }} />
              <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                No products in the transaction
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Add items from products or scan a barcode
              </p>
            </div>
          ) : (
            <div className="p-2 md:p-4 space-y-1.5 md:space-y-2 h-full">
              {/* Header Row */}
              <div
                className="grid grid-cols-[3fr,0.7fr,1fr,1fr] gap-2 px-3 py-1 rounded text-[10px] md:text-xs font-semibold uppercase tracking-wide sticky top-0 z-10"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-light)',
                }}
              >
                <span className="text-left">Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">Total</span>
              </div>

              {/* Line Items */}
              <div className="space-y-1.5 md:space-y-2">
                {lineItems.map((item) => {
                  const isSelected = selectedItem === item.id;
                  const isExpanded = expandedItemId === item.id;
                  return (
                    <div key={item.id} className="space-y-1">
                      <div
                        onClick={() => {
                          onItemSelect?.(item.id);
                        }}
                        className="grid grid-cols-[3fr,0.7fr,1fr,1fr] gap-2 px-3 py-2 md:py-2.5 rounded cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--color-accent-blue)'
                            : 'var(--color-bg-card)',
                          color: isSelected
                            ? 'var(--color-text-light)'
                            : 'var(--color-text-primary)',
                          border: '1px solid var(--color-border-light)',
                        }}
                      >
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedItemId((prev) => (prev === item.id ? null : item.id));
                            }}
                            className="p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-[var(--color-accent-blue)] flex-shrink-0"
                            style={{
                              background: 'transparent',
                              color: 'inherit',
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
                            ) : (
                              <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="font-medium text-xs md:text-sm truncate">
                              {item.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center font-mono text-xs md:text-sm">
                          {item.quantity}
                        </div>
                        <div className="flex items-center justify-end font-mono text-xs md:text-sm">
                          ${item.price.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-end font-mono text-xs md:text-sm font-semibold">
                          ${item.total.toFixed(2)}
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          className="mx-3 px-3 py-2 rounded text-[11px] md:text-xs"
                          style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-secondary)',
                            border: '1px dashed var(--color-border-light)',
                          }}
                        >
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4">
                            <div>
                              <span className="font-semibold">Color:</span>{' '}
                              <span>-</span>
                            </div>
                            <div>
                              <span className="font-semibold">Size:</span>{' '}
                              <span>-</span>
                            </div>
                            <div>
                              <span className="font-semibold">Sales rep:</span>{' '}
                              <span>{salesPersonName || '-'}</span>
                            </div>
                            <div>
                              <span className="font-semibold">Original price:</span>{' '}
                              <span>${item.price.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="font-semibold">Total (with tax):</span>{' '}
                              <span>${item.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      <div
        className="mx-4"
        style={{
          height: '1px',
          backgroundColor: 'var(--color-border-light)',
        }}
      />

      {/* Bottom Footer: Summary (not fixed) */}
      <div
        className="p-2 md:p-4 space-y-2 md:space-y-3"
        style={{
          borderColor: 'var(--color-border-light)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <div
          className="flex justify-between text-xs md:text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <span>Lines</span>
          <span>{lineItems.length}</span>
        </div>
        <div className="space-y-1 md:space-y-1.5 text-xs md:text-sm" style={{ color: 'var(--color-text-primary)' }}>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>

          <div className="flex justify-between" style={{ color: discountTotal > 0 ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
            <span>Discounts</span>
            <span>{discountTotal > 0 ? `-${formatCurrency(discountTotal)}` : formatCurrency(0)}</span>
          </div>

          {adjustmentValue !== 0 && (
            <div className="flex justify-between">
              <span>Adjustments</span>
              <span>{formatCurrency(adjustmentValue)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(taxValue)}</span>
          </div>
        </div>
        <div
          className="flex justify-between text-base md:text-lg font-bold pt-2"
          style={{
            borderTop: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        >
          <span>Amount due</span>
          <span style={{ color: amountDue > 0 ? 'var(--color-accent-blue)' : 'var(--color-success)' }}>
            {formatCurrency(amountDue)}
          </span>
        </div>
      </div>
    </div>
  );
}

