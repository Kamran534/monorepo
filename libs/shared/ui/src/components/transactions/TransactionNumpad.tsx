import React from 'react';
import {
  User,
  Plus,
  RotateCcw,
  CornerDownLeft,
  Mail,
  Phone,
  MapPin,
  X,
} from 'lucide-react';
import { ComponentProps } from '../../types.js';
import type { Customer } from '../customer/CustomerCard.js';

export interface TransactionNumpadProps extends ComponentProps {
  value: string;
  onValueChange: (value: string) => void;
  onEnter?: (value: string) => void;
  onAddCustomer?: () => void;
  customer?: Customer | null;
  onRemoveCustomer?: () => void;
}

/**
 * TransactionNumpad Component
 * 
 * Center panel with customer section, search prompt, numpad display, and keypad
 * for the transactions page.
 */
export function TransactionNumpad({
  value,
  onValueChange,
  onEnter,
  onAddCustomer,
  customer,
  onRemoveCustomer,
  className = '',
}: TransactionNumpadProps) {
  // Ensure the display never overflows the box: show the last 12 chars with leading ellipsis
  const displayValue = value
    ? (value.length > 12 ? `…${value.slice(-12)}` : value)
    : '';
  const handleClick = (val: string) => {
    if (val === 'clear') {
      onValueChange('');
    } else if (val === 'back') {
      onValueChange(value.slice(0, -1));
    } else if (val === 'enter') {
      if (value && onEnter) {
        // Evaluate multiplication if * is present
        let finalValue = value;
        if (value.includes('*')) {
          try {
            const parts = value.split('*');
            if (parts.length === 2) {
              const num1 = parseFloat(parts[0].trim()) || 0;
              const num2 = parseFloat(parts[1].trim()) || 0;
              const result = Math.floor(num1 * num2); // Use floor to get integer result
              finalValue = result.toString();
            }
          } catch (error) {
            console.error('[TransactionNumpad] Multiplication error:', error);
          }
        }
        onEnter(finalValue);
      }
      onValueChange('');
    } else if (val === '*') {
      // Allow * only if there's already a number and no * already present
      if (value && !value.includes('*') && value.trim().length > 0) {
        // Prevent unbounded growth – cap length to keep display stable
        if (value.length >= 18) return;
        onValueChange(value + '*');
      }
    } else {
      // Prevent unbounded growth – cap length to keep display stable
      if (value.length >= 18) return;
      onValueChange(value + val);
    }
  };

  const customerInitials = customer?.name
    ? customer.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : 'CU';

  const detailTextStyle = { color: 'var(--color-text-secondary)' };
  const detailIconStyle = { color: 'var(--color-text-secondary)', opacity: 0.8 };

  return (
    <div
      className={`flex flex-col h-full w-full md:w-80 lg:w-96 min-h-0 overflow-y-auto md:overflow-visible ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border-light)',
      }}
    >
      {/* Customer Section - Top */}
      <div className="p-3 md:p-4 pt-3 md:pt-4 pb-2 md:pb-3 flex-shrink-0 min-h-40 md:min-h-48 lg:min-h-56 flex items-center justify-center">
        {customer ? (
          <div
            className="w-full rounded-2xl border px-4 py-4 space-y-3"
            style={{
              borderColor: 'var(--color-border-light)',
              backgroundColor: 'var(--color-bg-card)',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent-blue), #7c3aed)',
                  color: 'var(--color-text-light)',
                }}
              >
                {customerInitials}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="text-base font-semibold truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {customer.name}
                  </p>
                  {onRemoveCustomer && (
                    <button
                      onClick={onRemoveCustomer}
                      className="p-1 rounded-full transition-colors"
                      style={{
                        color: 'var(--color-text-secondary)',
                      }}
                      title="Remove customer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {customer.email && (
                  <p className="text-xs flex items-center gap-1 truncate" style={detailTextStyle}>
                    <Mail className="w-3 h-3" style={detailIconStyle} />
                    {customer.email}
                  </p>
                )}
                {customer.phone && (
                  <p className="text-xs flex items-center gap-1 truncate" style={detailTextStyle}>
                    <Phone className="w-3 h-3" style={detailIconStyle} />
                    {customer.phone}
                  </p>
                )}
              </div>
            </div>
            {customer.address && (
              <div
                className="text-xs flex items-start gap-2 rounded-lg px-3 py-2"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{customer.address}</span>
              </div>
            )}
            {onAddCustomer && (
              <button
                onClick={onAddCustomer}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-accent-blue)',
                  color: 'var(--color-text-light)',
                }}
              >
                Change customer
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 md:gap-2 w-full">
            {/* User Icon with Plus */}
            <div className="relative">
              <User className="w-8 md:w-12 h-8 md:h-12" style={{ color: 'var(--color-text-secondary)' }} />
              <Plus
                className="absolute -bottom-1 -right-1 w-4 md:w-5 h-4 md:h-5 rounded-full p-0.5"
                style={{
                  backgroundColor: 'var(--color-text-secondary)',
                  color: 'var(--color-text-light)',
                }}
              />
            </div>

            {/* Text */}
            <div
              className="text-center text-xs md:text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Add customer to this transaction
            </div>

            {/* Add Customer Button */}
            <button
              onClick={onAddCustomer}
              className="w-full py-2 md:py-2.5 rounded-md text-sm md:text-md font-medium hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-accent-blue)',
                color: 'var(--color-text-light)',
              }}
              disabled={!onAddCustomer}
            >
              Add customer
            </button>
          </div>
        )}
      </div>

      {/* Flexible spacer to push calculator to the bottom (align bottom with siblings) */}
      <div className="flex-1 min-h-0"></div>

      {/* Numpad Section - Bottom (fixed at bottom of its column) */}
      <div
        className="flex-shrink-0 px-2 md:px-4 pb-2 md:pb-2 space-y-2 md:space-y-3"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        {/* Numpad Display */}
        <div
          className={`h-9 md:h-12 px-3 md:px-4 flex items-center rounded text-sm md:text-lg font-mono w-full overflow-hidden whitespace-nowrap text-ellipsis ${
            displayValue ? 'justify-end text-right' : 'justify-start text-left'
          }`}
          style={{
            backgroundColor: 'var(--color-bg-card)',
            color: displayValue ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border-light)',
            fontStyle: displayValue ? 'normal' : 'italic',
          }}
        >
          {displayValue || 'Search or enter quantity'}
        </div>

        {/* Numpad Grid */}
        <div className="grid grid-cols-4 gap-1 md:gap-1.5">
          {/* Row 1: 7, 8, 9, Backspace */}
          {[7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleClick(num.toString())}
              className="h-9 md:h-12 rounded text-sm md:text-base font-semibold hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleClick('back')}
            className="h-9 md:h-12 rounded flex items-center justify-center hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <RotateCcw className="w-4 md:w-6 h-4 md:h-6" />
          </button>

          {/* Row 2: 4, 5, 6, ± */}
          {[4, 5, 6].map((num) => (
            <button
              key={num}
              onClick={() => handleClick(num.toString())}
              className="h-9 md:h-12 rounded text-sm md:text-base font-semibold hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleClick('±')}
            className="h-9 md:h-12 rounded text-sm md:text-base font-semibold hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            ±
          </button>

          {/* Row 3: 1, 2, 3, * */}
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => handleClick(num.toString())}
              className="h-9 md:h-12 rounded text-sm md:text-base font-semibold hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleClick('*')}
            className="h-9 md:h-12 rounded text-sm md:text-base font-semibold hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            *
          </button>

          {/* Row 4: 0 (span 2), ., abc */}
          <button
            onClick={() => handleClick('0')}
            className="col-span-2 h-9 md:h-12 rounded text-sm md:text-base font-semibold hover:opacity-80 transition-opacity flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            0
          </button>
          <button
            onClick={() => handleClick('.')}
            className="h-9 md:h-12 rounded text-sm md:text-base font-semibold hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            .
          </button>
          <button
            onClick={() => handleClick('abc')}
            className="h-9 md:h-12 rounded text-xs md:text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            abc
          </button>

          {/* Row 5: Enter button spanning 4 columns */}
          <button
            onClick={() => handleClick('enter')}
            className="col-span-4 h-10 md:h-12 rounded text-base md:text-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-accent-blue)',
              color: 'var(--color-text-light)',
            }}
          >
            <CornerDownLeft className="w-5 md:w-6 h-5 md:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
