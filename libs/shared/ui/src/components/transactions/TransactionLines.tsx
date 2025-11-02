import React from 'react';
import { Package, Plus } from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface TransactionLinesProps extends ComponentProps {
  lineItems: LineItem[];
  selectedItem?: string;
  onItemSelect?: (itemId: string) => void;
  onAddCustomer?: () => void;
  activeTab?: 'lines' | 'payments';
  onTabChange?: (tab: 'lines' | 'payments') => void;
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
  onAddCustomer,
  activeTab = 'lines',
  onTabChange,
  className = '',
}: TransactionLinesProps) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <div
      className={`flex flex-col h-full w-full md:w-auto ${className}`}
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
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 md:p-4 space-y-1.5 md:space-y-2">
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

          {/* Add Customer Button */}
          <div className="pt-5 pb-4">
            <button
              onClick={onAddCustomer}
              className="w-full py-3 rounded border-2 border-dashed hover:opacity-70"
              style={{
                borderColor: 'var(--color-border-medium)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'transparent',
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <Plus className="w-5 h-5" />
                <span className="text-sm">Add customer to transaction</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Summary */}
      <div
        className="p-2 md:p-4 border-t space-y-1 md:space-y-2"
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
        <div
          className="flex justify-between text-xs md:text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div
          className="flex justify-between text-xs md:text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <span>Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div
          className="flex justify-between text-xs md:text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <span>Payment</span>
          <span>$0.00</span>
        </div>
        <div
          className="flex justify-between text-base md:text-lg font-bold pt-1 md:pt-2"
          style={{
            borderTop: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        >
          <span>Amount due</span>
          <span style={{ color: 'var(--color-accent-blue)' }}>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

