import React from 'react';
import { Package } from 'lucide-react';
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

export interface TransactionLinesProps extends ComponentProps {
  lineItems: LineItem[];
  selectedItem?: string;
  onItemSelect?: (itemId: string) => void;
  activeTab?: 'lines' | 'payments';
  onTabChange?: (tab: 'lines' | 'payments') => void;
  billingSummary?: BillingSummary;
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
  className = '',
}: TransactionLinesProps) {
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

      {/* Product List */}
      <div
        className="overflow-y-auto min-h-0 flex-1"
      >
        <div className="p-2 md:p-4 space-y-1.5 md:space-y-2">
          {lineItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-18 pt-24">
              <Package className="w-8 h-8" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }} />
              <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                No products in the transaction
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Add items from products or scan a barcode
              </p>
            </div>
          )}
          {lineItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onItemSelect?.(item.id)}
              className={`p-2 md:p-4 rounded cursor-pointer hover:opacity-80`}
              style={{
                backgroundColor:
                  selectedItem === item.id
                    ? 'var(--color-accent-blue)'
                    : 'var(--color-bg-card)',
                color:
                  selectedItem === item.id
                    ? 'var(--color-text-light)'
                    : 'var(--color-text-primary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <div className="flex items-center justify-between mb-1 md:mb-2">
                <div className="flex items-center gap-2 md:gap-3">
                  <Package className="w-4 md:w-5 h-4 md:h-5" />
                  <div>
                    <div className="font-medium text-xs md:text-sm">{item.name}</div>
                    <div
                      className="text-xs mt-0.5 md:mt-1 opacity-70"
                    >
                      Quantity: {item.quantity}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm md:text-base">
                    ${item.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}

        </div>
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

          {discountTotal > 0 && (
            <div className="flex justify-between">
              <span>Discounts</span>
              <span>-{formatCurrency(discountTotal)}</span>
            </div>
          )}

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

          <div className="flex justify-between">
            <span>Paid</span>
            <span>{formatCurrency(amountPaid)}</span>
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

