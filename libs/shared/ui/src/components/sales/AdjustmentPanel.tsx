import React from 'react';
import { DollarSign, FileText } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';

export interface OrderAdjustment {
  amount: number;
  reason?: string;
}

export interface AdjustmentPanelProps extends ComponentProps {
  adjustment: OrderAdjustment;
  onAdjustmentChange: (adjustment: OrderAdjustment) => void;
  disabled?: boolean;
}

/**
 * AdjustmentPanel Component
 *
 * Manages order-level adjustments with amount and optional reason
 * Adjustments can be positive (fees) or negative (additional discounts)
 */
export function AdjustmentPanel({
  adjustment,
  onAdjustmentChange,
  disabled = false,
  className = '',
}: AdjustmentPanelProps) {
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = React.useCallback(
    (amount: number) => `Rs ${formatAmount(Math.abs(amount), { showSymbol: false })}`,
    [formatAmount],
  );

  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    onAdjustmentChange({
      ...adjustment,
      amount,
    });
  };

  const handleReasonChange = (reason: string) => {
    onAdjustmentChange({
      ...adjustment,
      reason,
    });
  };

  const handleClearAdjustment = () => {
    onAdjustmentChange({
      amount: 0,
      reason: undefined,
    });
  };

  const hasAdjustment = adjustment.amount !== 0;
  const isPositive = adjustment.amount > 0;
  const isNegative = adjustment.amount < 0;

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
          <DollarSign
            className="w-5 h-5"
            style={{
              color: isPositive
                ? 'var(--color-warning)'
                : isNegative
                ? 'var(--color-success)'
                : 'var(--color-accent-blue)',
            }}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Order Adjustment
          </h3>
        </div>
        {hasAdjustment && (
          <button
            onClick={handleClearAdjustment}
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

      {/* Adjustment Inputs */}
      <div className="p-4 space-y-3">
        {/* Adjustment Amount */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Adjustment Amount
          </label>
          <div className="relative">
            <DollarSign
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="number"
              step="0.01"
              value={adjustment.amount || ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              disabled={disabled}
              placeholder="0.00"
              className="w-full pl-10 pr-3 py-2 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                borderColor: isPositive
                  ? 'var(--color-warning)'
                  : isNegative
                  ? 'var(--color-success)'
                  : 'var(--color-border-light)',
              }}
            />
          </div>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Use positive values for fees, negative for additional discounts
          </p>
        </div>

        {/* Adjustment Reason */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Reason (Optional)
          </label>
          <div className="relative">
            <FileText
              className="absolute left-3 top-3 w-4 h-4"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <textarea
              value={adjustment.reason || ''}
              onChange={(e) => handleReasonChange(e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder="Enter reason for adjustment..."
              className="w-full pl-10 pr-3 py-2 rounded border text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            />
          </div>
        </div>

        {/* Adjustment Summary */}
        {hasAdjustment && (
          <div
            className="mt-4 pt-3 border-t"
            style={{ borderColor: 'var(--color-border-light)' }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {isPositive ? 'Additional Fee:' : 'Additional Discount:'}
              </span>
              <span
                className="text-sm font-semibold"
                style={{
                  color: isPositive
                    ? 'var(--color-warning)'
                    : 'var(--color-success)',
                }}
              >
                {isPositive ? '+' : '-'}
                {formatCurrency(adjustment.amount)}
              </span>
            </div>
            {adjustment.reason && (
              <p
                className="text-xs mt-2 italic"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                "{adjustment.reason}"
              </p>
            )}
          </div>
        )}

        {/* Examples */}
        {!hasAdjustment && (
          <div
            className="mt-2 p-3 rounded text-xs"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p className="font-medium mb-1">Examples:</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li>+5.00 for delivery fee</li>
              <li>-10.00 for loyalty discount</li>
              <li>+2.50 for rush processing</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
