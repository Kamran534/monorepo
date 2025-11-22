import React from 'react';
import { Receipt, Tag, DollarSign, Calculator } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';

export interface OrderTotals {
  subtotal: number;
  lineItemDiscount: number;
  orderDiscount: number;
  couponDiscount: number;
  adjustmentAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface OrderSummaryProps extends ComponentProps {
  totals: OrderTotals;
  itemCount: number;
  showDetails?: boolean;
}

/**
 * OrderSummary Component
 *
 * Displays a comprehensive breakdown of order totals including
 * all discounts, adjustments, tax, and final total
 */
export function OrderSummary({
  totals,
  itemCount,
  showDetails = true,
  className = '',
}: OrderSummaryProps) {
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = React.useCallback((amount: number) => formatAmount(amount), [formatAmount]);

  const totalDiscount =
    totals.lineItemDiscount + totals.orderDiscount + totals.couponDiscount;

  const SummaryRow = ({
    label,
    amount,
    isSubtle = false,
    isNegative = false,
    isPositive = false,
    isTotal = false,
    icon,
  }: {
    label: string;
    amount: number;
    isSubtle?: boolean;
    isNegative?: boolean;
    isPositive?: boolean;
    isTotal?: boolean;
    icon?: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {icon}
        <span
          className={`text-sm ${isTotal ? 'font-semibold' : isSubtle ? 'font-normal' : 'font-medium'}`}
          style={{
            color: isSubtle
              ? 'var(--color-text-secondary)'
              : 'var(--color-text-primary)',
          }}
        >
          {label}
        </span>
      </div>
      <span
        className={`text-sm ${isTotal ? 'font-bold text-lg' : 'font-medium'}`}
        style={{
          color: isNegative
            ? 'var(--color-error)'
            : isPositive
            ? 'var(--color-warning)'
            : isTotal
            ? 'var(--color-accent-blue)'
            : 'var(--color-text-primary)',
        }}
      >
        {isNegative && amount > 0 ? '-' : isPositive && amount > 0 ? '+' : ''}
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );

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
          <Receipt
            className="w-5 h-5"
            style={{ color: 'var(--color-accent-blue)' }}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Order Summary
          </h3>
        </div>
        <span
          className="text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Summary Details */}
      <div className="p-4">
        {/* Subtotal */}
        <SummaryRow
          label="Subtotal"
          amount={totals.subtotal}
          icon={
            <Calculator
              className="w-4 h-4"
              style={{ color: 'var(--color-text-secondary)' }}
            />
          }
        />

        {showDetails && (
          <>
            {/* Line Item Discounts */}
            {totals.lineItemDiscount > 0 && (
              <SummaryRow
                label="Line Item Discounts"
                amount={totals.lineItemDiscount}
                isSubtle
                isNegative
              />
            )}

            {/* Order Discount */}
            {totals.orderDiscount > 0 && (
              <SummaryRow
                label="Order Discount"
                amount={totals.orderDiscount}
                isSubtle
                isNegative
                icon={
                  <Tag
                    className="w-4 h-4"
                    style={{ color: 'var(--color-error)' }}
                  />
                }
              />
            )}

            {/* Coupon Discount */}
            {totals.couponDiscount > 0 && (
              <SummaryRow
                label="Coupon Discount"
                amount={totals.couponDiscount}
                isSubtle
                isNegative
                icon={
                  <Tag
                    className="w-4 h-4"
                    style={{ color: 'var(--color-success)' }}
                  />
                }
              />
            )}

            {/* Total Discounts Summary */}
            {totalDiscount > 0 && (
              <div
                className="my-2 py-2 border-t border-b"
                style={{ borderColor: 'var(--color-border-light)' }}
              >
                <SummaryRow
                  label="Total Savings"
                  amount={totalDiscount}
                  isNegative
                />
              </div>
            )}

            {/* Adjustment */}
            {totals.adjustmentAmount !== 0 && (
              <SummaryRow
                label={
                  totals.adjustmentAmount > 0
                    ? 'Additional Fee'
                    : 'Additional Discount'
                }
                amount={totals.adjustmentAmount}
                isPositive={totals.adjustmentAmount > 0}
                isNegative={totals.adjustmentAmount < 0}
                icon={
                  <DollarSign
                    className="w-4 h-4"
                    style={{
                      color:
                        totals.adjustmentAmount > 0
                          ? 'var(--color-warning)'
                          : 'var(--color-success)',
                    }}
                  />
                }
              />
            )}

            {/* Tax */}
            {totals.taxAmount > 0 && (
              <SummaryRow
                label="Tax"
                amount={totals.taxAmount}
                isSubtle
              />
            )}
          </>
        )}

        {/* Total Amount */}
        <div
          className="mt-3 pt-3 border-t"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <SummaryRow
            label="Total Amount"
            amount={totals.totalAmount}
            isTotal
          />
        </div>
      </div>

      {/* Savings Badge */}
      {totalDiscount > 0 && (
        <div
          className="px-4 pb-4"
        >
          <div
            className="p-3 rounded text-center"
            style={{
              backgroundColor: 'var(--color-success-light)',
              borderColor: 'var(--color-success)',
            }}
          >
            <p
              className="text-xs font-medium"
              style={{ color: 'var(--color-success)' }}
            >
              You're saving {formatCurrency(totalDiscount)} on this order!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
