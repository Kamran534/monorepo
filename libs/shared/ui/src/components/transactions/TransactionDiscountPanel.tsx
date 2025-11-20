import { useEffect, useMemo, useRef } from 'react';
import { SidePanel } from '@monorepo/shared-ui';
import { CornerDownLeft, Percent, DollarSign } from 'lucide-react';

export interface TransactionDiscountPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'amount' | 'percent';
  value: string;
  current?: { type: 'amount' | 'percent'; value: number } | null;
  onModeChange: (mode: 'amount' | 'percent') => void;
  onValueChange: (val: string) => void;
  onApply: () => void;
  onClear?: () => void;
}

const formatCurrent = (current: TransactionDiscountPanelProps['current']) => {
  if (!current) return null;
  if (current.type === 'percent') {
    return `${current.value}%`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(current.value);
};

export function TransactionDiscountPanel({
  isOpen,
  onClose,
  mode,
  value,
  current,
  onModeChange,
  onValueChange,
  onApply,
  onClear,
}: TransactionDiscountPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen, mode]);

  const handleKeypadInput = (key: string) => {
    const currentVal = value || '';
    let next = currentVal;
    if (key === '.') {
      if (currentVal.includes('.')) {
        return;
      }
      next = currentVal ? `${currentVal}.` : '0.';
    } else if (key === '00') {
      next = currentVal ? `${currentVal}00` : '0';
    } else if (currentVal === '0') {
      next = key;
    } else {
      next = `${currentVal}${key}`;
    }
    onValueChange(next);
  };

  const handleBackspace = () => {
    onValueChange(value ? value.slice(0, -1) : '');
    inputRef.current?.focus();
  };

  const suffix = useMemo(() => (mode === 'percent' ? '%' : ''), [mode]);
  const PrefixIcon = mode === 'percent' ? Percent : DollarSign;

  const handleApply = () => {
    if (!value.trim()) return;
    onApply();
  };

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Order discount" width="320px">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex items-start gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <Percent className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Discount type
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Choose amount or percent. Use keypad below to enter the value, then press Enter.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['amount', 'percent'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onModeChange(option)}
                className={`px-3 py-2 rounded border text-sm font-medium ${
                  mode === option ? 'bg-[var(--color-accent-blue)] text-white' : ''
                }`}
                style={{
                  borderColor: 'var(--color-border-light)',
                  color: mode === option ? 'white' : 'var(--color-text-primary)',
                }}
              >
                {option === 'amount' ? 'Amount ($)' : 'Percent (%)'}
              </button>
            ))}
          </div>

          {current && (
            <div
              className="p-3 rounded border flex items-center justify-between text-sm"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>Current discount</span>
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {formatCurrent(current)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-3 border-t space-y-3" style={{ borderColor: 'var(--color-border-light)' }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              {mode === 'amount' ? 'Discount amount' : 'Discount percent'}
            </label>
            <div
              className="w-full h-12 px-3 flex items-center gap-2 rounded border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              <PrefixIcon
                className="w-4 h-4"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder={mode === 'amount' ? 'Enter amount' : 'Enter percent'}
                className="flex-1 text-lg font-mono bg-transparent outline-none border-none text-right"
              />
              {suffix && <span className="text-base font-mono">{suffix}</span>}
            </div>
            {onClear && current && (
              <button
                type="button"
                onClick={onClear}
                className="mt-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-error)' }}
              >
                Remove discount
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
            {[7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadInput(num.toString())}
                className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="h-10 rounded flex items-center justify-center hover:opacity-80 transition-opacity border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              ⌫
            </button>

            {[4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadInput(num.toString())}
                className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleApply}
              className="rounded text-base font-medium hover:opacity-90 transition-opacity flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-accent-blue)',
                color: 'var(--color-text-light)',
                gridRow: '2 / 5',
                gridColumn: '4',
              }}
            >
              <CornerDownLeft className="w-5 h-5" />
            </button>

            {[1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadInput(num.toString())}
                className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {num}
              </button>
            ))}

            {['00', '0', '.'].map((token) => (
              <button
                key={token}
                type="button"
                onClick={() => handleKeypadInput(token)}
                className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {token}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SidePanel>
  );
}


