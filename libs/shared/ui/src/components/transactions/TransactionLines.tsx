import React from 'react';
import { Package, CreditCard, ChevronDown, ChevronRight } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  productId?: string; // Product ID for inventory tracking
  productVariantId?: string; // Variant ID for inventory tracking
  availableQuantity?: number; // Available stock quantity
  isReturn?: boolean; // Flag to indicate if this is a return item
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
  const { formatAmount, currency } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = React.useCallback(
    (amount: number) => `Rs ${formatAmount(amount, { showSymbol: false })}`,
    [formatAmount],
  );
  const paymentCurrencyLabel = React.useMemo(() => (currency === 'PKR' ? 'Rs' : currency), [currency]);

  // Calculate subtotal: regular items add, return items subtract (since their total is positive but represents a credit)
  const fallbackSubtotal = lineItems.reduce((sum, item) => {
    if (item.isReturn || (item.price < 0 && item.quantity < 0)) {
      // Return items: subtract their absolute total (they're credits)
      return sum - Math.abs(item.total);
    }
    return sum + item.total;
  }, 0);
  // Tax only on non-return items
  const taxableSubtotal = lineItems.reduce((sum, item) => {
    if (item.isReturn || (item.price < 0 && item.quantity < 0)) {
      return sum; // Exclude returns from tax
    }
    return sum + item.total;
  }, 0);
  const fallbackTax = taxableSubtotal * 0.1;
  // Total can be negative if subtotal is negative (returns exceed sales)
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
  // Allow negative amount due for returns (don't clamp to 0)
  const amountDue = summary.total - amountPaid;

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
        className="overflow-y-auto min-h-0 flex-1 transaction-lines-scroll-container"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-border-light) var(--color-bg-secondary)',
        }}
      >
        <style>{`
          .transaction-lines-scroll-container::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .transaction-lines-scroll-container::-webkit-scrollbar-track {
            background: var(--color-bg-secondary);
            border-radius: 10px;
          }
          .transaction-lines-scroll-container::-webkit-scrollbar-thumb {
            background-color: var(--color-border-light);
            border-radius: 10px;
            border: 2px solid var(--color-bg-secondary);
            transition: background-color 0.2s ease;
          }
          .transaction-lines-scroll-container::-webkit-scrollbar-thumb:hover {
            background-color: var(--color-border-medium);
          }
        `}</style>
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
                      {paymentCurrencyLabel}
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
                className="grid grid-cols-[2.2fr,0.8fr,1fr,1fr] gap-3 px-3 py-1 rounded text-[10px] md:text-xs font-semibold uppercase tracking-wide sticky top-0 z-10"
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
                  const formattedPrice = formatCurrency(Math.abs(item.price));
                  const formattedTotal = formatCurrency(Math.abs(item.total));
                  return (
                    <div key={item.id} className="space-y-1">
                      <div
                        onClick={() => {
                          onItemSelect?.(item.id);
                        }}
                        className="grid grid-cols-[2.2fr,0.8fr,1fr,1fr] gap-3 px-3 py-2 md:py-2.5 rounded cursor-pointer hover:opacity-80"
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
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-xs md:text-sm truncate">
                              {item.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center font-mono text-xs md:text-sm">
                          {item.isReturn ? (
                            <span className="line-through">{Math.abs(item.quantity)}</span>
                          ) : (
                            item.quantity
                          )}
                        </div>
                        <div
                          className="flex items-center justify-end font-mono text-xs md:text-sm gap-1"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {item.isReturn ? (
                            <span className="line-through">{formattedPrice}</span>
                          ) : (
                            <span>{formattedPrice}</span>
                          )}
                        </div>
                        <div
                          className="flex items-center justify-end font-mono text-xs md:text-sm font-semibold gap-1"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {item.isReturn ? (
                            <span className="line-through">{formattedTotal}</span>
                          ) : (
                            <span>{formattedTotal}</span>
                          )}
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
                          <div className="flex flex-col gap-2 mb-2">
                            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {item.name}
                            </span>
                          </div>
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
                              <span>{formattedPrice}</span>
                            </div>
                            <div>
                              <span className="font-semibold">Total (with tax):</span>{' '}
                              <span>{formattedTotal}</span>
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
          <span
            style={{
              color:
                amountDue > 0
                  ? 'var(--color-accent-blue)'
                  : amountDue < 0
                    ? 'var(--color-success)'
                    : 'var(--color-text-secondary)',
            }}
          >
            {formatCurrency(amountDue)}
          </span>
        </div>
      </div>
    </div>
  );
}

