import React from 'react';
import { Percent, DollarSign, Tag } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';

export interface OrderDiscount {
  amount?: number;
  percent?: number;
}

export interface DiscountPanelProps extends ComponentProps {
  discount: OrderDiscount;
  onDiscountChange: (discount: OrderDiscount) => void;
  subtotal: number;
  disabled?: boolean;
}

/**
 * DiscountPanel Component
 *
 * Manages order-level discounts with support for both amount and percentage
 */
export function DiscountPanel({
  discount,
  onDiscountChange,
  subtotal,
  disabled = false,
  className = '',
}: DiscountPanelProps) {
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = React.useCallback(
    (amount: number) => `Rs ${formatAmount(amount, { showSymbol: false })}`,
    [formatAmount],
  );

  const calculateDiscountAmount = (): number => {
    if (discount.amount) {
      return Math.min(discount.amount, subtotal);
    }
    if (discount.percent) {
      return (subtotal * discount.percent) / 100;
    }
    return 0;
  };

  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    onDiscountChange({
      amount: Math.max(0, Math.min(amount, subtotal)),
      percent: undefined,
    });
  };

  const handlePercentChange = (value: string) => {
    const percent = parseFloat(value) || 0;
    onDiscountChange({
      amount: undefined,
      percent: Math.max(0, Math.min(percent, 100)),
    });
  };

  const handleClearDiscount = () => {
    onDiscountChange({ amount: undefined, percent: undefined });
  };

  const discountAmount = calculateDiscountAmount();
  const hasDiscount = discountAmount > 0;

  return (
    <div
      className={`border rounded-lg ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border-light)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border-light)' }}
      >
        <div className="flex items-center gap-2">
          <Tag
            className="w-5 h-5"
            style={{ color: 'var(--color-accent-blue)' }}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Order Discount
          </h3>
        </div>
        {hasDiscount && (
          <button
            onClick={handleClearDiscount}
            disabled={disabled}
            className="text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
            style={{
              color: 'var(--color-error)',
              backgroundColor: 'transparent',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Discount Inputs */}
      <div className="p-4 space-y-3">
        {/* Discount Amount */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Discount Amount
          </label>
          <div className="relative">
            <DollarSign
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="number"
              min="0"
              max={subtotal}
              step="0.01"
              value={discount.amount || ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              disabled={disabled || !!discount.percent}
              placeholder="0.00"
              className="w-full pl-10 pr-3 py-2 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: discount.percent ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            />
          </div>
          {discount.percent && (
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Disabled when percentage is set
            </p>
          )}
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: 'var(--color-border-light)' }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            OR
          </span>
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: 'var(--color-border-light)' }}
          />
        </div>

        {/* Discount Percentage */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Discount Percentage
          </label>
          <div className="relative">
            <Percent
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={discount.percent || ''}
              onChange={(e) => handlePercentChange(e.target.value)}
              disabled={disabled || !!discount.amount}
              placeholder="0.0"
              className="w-full pl-10 pr-3 py-2 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: discount.amount ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            />
          </div>
          {discount.amount && (
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Disabled when amount is set
            </p>
          )}
        </div>

        {/* Discount Summary */}
        {hasDiscount && (
          <div
            className="mt-4 pt-3 border-t"
            style={{ borderColor: 'var(--color-border-light)' }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Total Discount:
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--color-error)' }}
              >
                -{formatCurrency(discountAmount)}
              </span>
            </div>
            {discount.percent && (
              <p
                className="text-xs mt-1 text-right"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {discount.percent}% of {formatCurrency(subtotal)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
