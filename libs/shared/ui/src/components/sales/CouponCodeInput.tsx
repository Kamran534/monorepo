import React, { useState } from 'react';
import { Tag, Check, X, Loader } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';

export interface CouponValidation {
  isValid: boolean;
  error?: string;
  promotion?: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
  };
  discountAmount?: number;
}

export interface CouponCodeInputProps extends ComponentProps {
  couponCode: string;
  couponValidation: CouponValidation | null;
  onCouponCodeChange: (code: string) => void;
  onValidateCoupon: (code: string, customerId?: string) => void;
  onClearCoupon: () => void;
  customerId?: string;
  validating?: boolean;
  disabled?: boolean;
}

/**
 * CouponCodeInput Component
 *
 * Input field for entering and validating coupon codes
 * Shows validation status and applied discount
 */
export function CouponCodeInput({
  couponCode,
  couponValidation,
  onCouponCodeChange,
  onValidateCoupon,
  onClearCoupon,
  customerId,
  validating = false,
  disabled = false,
  className = '',
}: CouponCodeInputProps) {
  const [inputValue, setInputValue] = useState(couponCode);
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = React.useCallback((amount: number) => formatAmount(amount), [formatAmount]);

  const handleApplyCoupon = () => {
    const code = inputValue.trim().toUpperCase();
    if (code) {
      onCouponCodeChange(code);
      onValidateCoupon(code, customerId);
    }
  };

  const handleClearCoupon = () => {
    setInputValue('');
    onClearCoupon();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !validating && !disabled) {
      handleApplyCoupon();
    }
  };

  const isApplied = couponValidation?.isValid;
  const hasError = couponValidation && !couponValidation.isValid;

  return (
    <div
      className={`border rounded-lg ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: isApplied
          ? 'var(--color-success)'
          : hasError
          ? 'var(--color-error)'
          : 'var(--color-border-light)',
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
            style={{
              color: isApplied
                ? 'var(--color-success)'
                : hasError
                ? 'var(--color-error)'
                : 'var(--color-accent-blue)',
            }}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Coupon Code
          </h3>
        </div>
        {isApplied && (
          <div className="flex items-center gap-1">
            <Check
              className="w-4 h-4"
              style={{ color: 'var(--color-success)' }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--color-success)' }}
            >
              Applied
            </span>
          </div>
        )}
      </div>

      {/* Coupon Input */}
      <div className="p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              disabled={disabled || isApplied}
              placeholder="Enter coupon code"
              className="w-full px-3 py-2 rounded border text-sm font-mono uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isApplied ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                borderColor: isApplied
                  ? 'var(--color-success)'
                  : hasError
                  ? 'var(--color-error)'
                  : 'var(--color-border-light)',
              }}
            />
            {validating && (
              <Loader
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin"
                style={{ color: 'var(--color-text-secondary)' }}
              />
            )}
          </div>
          {isApplied ? (
            <button
              onClick={handleClearCoupon}
              disabled={disabled}
              className="px-4 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: 'var(--color-error)',
                color: 'white',
              }}
            >
              <X className="w-4 h-4" />
              Remove
            </button>
          ) : (
            <button
              onClick={handleApplyCoupon}
              disabled={disabled || validating || !inputValue.trim()}
              className="px-4 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-accent-blue)',
                color: 'white',
              }}
            >
              {validating ? 'Validating...' : 'Apply'}
            </button>
          )}
        </div>

        {/* Validation Messages */}
        {couponValidation && (
          <div className="mt-3">
            {couponValidation.isValid && couponValidation.promotion ? (
              <div
                className="p-3 rounded border"
                style={{
                  backgroundColor: 'var(--color-success-light)',
                  borderColor: 'var(--color-success)',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-success)' }}
                    >
                      {couponValidation.promotion.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Code: {couponValidation.promotion.code}
                    </p>
                  </div>
                </div>
                {couponValidation.discountAmount !== undefined && (
                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-success)' }}>
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Discount:
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-success)' }}
                    >
                      -{formatCurrency(couponValidation.discountAmount)}
                    </span>
                  </div>
                )}
              </div>
            ) : hasError ? (
              <div
                className="p-3 rounded border flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--color-error-light)',
                  borderColor: 'var(--color-error)',
                }}
              >
                <X
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--color-error)' }}
                />
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-error)' }}
                >
                  {couponValidation.error || 'Invalid coupon code'}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Help Text */}
        {!couponValidation && (
          <p
            className="text-xs mt-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Enter a valid coupon code to apply additional discounts to your order
          </p>
        )}
      </div>
    </div>
  );
}
