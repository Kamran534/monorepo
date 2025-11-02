import React from 'react';
import {
  User,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface TransactionNumpadProps extends ComponentProps {
  value: string;
  onValueChange: (value: string) => void;
  onAddCustomer?: () => void;
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
  onAddCustomer,
  className = '',
}: TransactionNumpadProps) {
  const handleClick = (val: string) => {
    if (val === 'clear') {
      onValueChange('');
    } else if (val === 'back') {
      onValueChange(value.slice(0, -1));
    } else if (val === 'enter') {
      console.log('Enter:', value);
      onValueChange('');
    } else {
      onValueChange(value + val);
    }
  };

  return (
    <div
      className={`flex flex-col h-full w-full md:w-80 lg:w-96 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border-light)',
      }}
    >
      {/* Customer Section - Top */}
      <div className="p-3 md:p-4 pt-4 md:pt-12 pb-3 md:pb-6 flex-shrink-0">
        <div className="flex flex-col items-center gap-1.5 md:gap-2">
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
          >
            Add customer
          </button>
        </div>
      </div>

      {/* Spacer to push numpad to bottom */}
      <div className="flex-1 min-h-0"></div>

      {/* Numpad Section - Bottom */}
      <div className="flex-shrink-0 px-2 md:px-4 pb-2 md:pb-4 space-y-2 md:space-y-3">
        {/* Numpad Display */}
        <div
          className="h-12 md:h-16 px-3 md:px-4 flex items-center justify-end rounded text-lg md:text-2xl font-mono"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          {value || '0'}
        </div>

        {/* Numpad Grid */}
        <div className="grid grid-cols-4 gap-1.5 md:gap-2.5">
          {/* Row 1: 7, 8, 9, Backspace */}
          {[7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleClick(num.toString())}
              className="h-12 md:h-16 rounded text-base md:text-xl font-semibold hover:opacity-80 transition-opacity"
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
            className="h-12 md:h-16 rounded flex items-center justify-center hover:opacity-80 transition-opacity"
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
              className="h-12 md:h-16 rounded text-base md:text-xl font-semibold hover:opacity-80 transition-opacity"
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
            className="h-12 md:h-16 rounded text-base md:text-xl font-semibold hover:opacity-80 transition-opacity"
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
              className="h-12 md:h-16 rounded text-base md:text-xl font-semibold hover:opacity-80 transition-opacity"
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
            className="h-12 md:h-16 rounded text-base md:text-xl font-semibold hover:opacity-80 transition-opacity"
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
            className="col-span-2 h-12 md:h-16 rounded text-base md:text-xl font-semibold hover:opacity-80 transition-opacity flex items-center justify-center"
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
            className="h-12 md:h-16 rounded text-base md:text-xl font-semibold hover:opacity-80 transition-opacity"
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
            className="h-12 md:h-16 rounded text-sm md:text-base font-semibold hover:opacity-80 transition-opacity"
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
            className="col-span-4 h-12 md:h-16 rounded text-base md:text-lg font-semibold hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: 'var(--color-accent-blue)',
              color: 'var(--color-text-light)',
            }}
          >
            ←
          </button>
        </div>
      </div>
    </div>
  );
}
