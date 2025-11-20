import { useEffect, useRef } from 'react';
import { SidePanel } from '@monorepo/shared-ui';
import { CornerDownLeft, SlidersHorizontal, DollarSign } from 'lucide-react';

export interface TransactionAdjustmentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  reason: string;
  current?: { amount: number; reason?: string } | null;
  onAmountChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onApply: () => void;
  onClear?: () => void;
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

export function TransactionAdjustmentPanel({
  isOpen,
  onClose,
  amount,
  reason,
  current,
  onAmountChange,
  onReasonChange,
  onApply,
  onClear,
}: TransactionAdjustmentPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const handleKeypadInput = (key: string) => {
    const currentVal = amount || '';
    let next = currentVal;
    if (key === '.') {
      if (currentVal.includes('.')) {
        return;
      }
      next = currentVal ? `${currentVal}.` : '0.';
    } else if (key === '00') {
      next = currentVal ? `${currentVal}00` : '0';
    } else if (currentVal === '0' || currentVal === '-0') {
      next = currentVal.startsWith('-') ? `-${key}` : key;
    } else {
      next = `${currentVal}${key}`;
    }
    onAmountChange(next);
  };

  const handleBackspace = () => {
    onAmountChange(amount ? amount.slice(0, -1) : '');
    inputRef.current?.focus();
  };

  const handleToggleSign = () => {
    if (!amount) {
      onAmountChange('-');
      return;
    }
    if (amount.startsWith('-')) {
      onAmountChange(amount.slice(1));
    } else {
      onAmountChange(`-${amount}`);
    }
  };

  const handleApply = () => {
    if (!amount.trim()) return;
    onApply();
  };

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Order adjustment" width="320px">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex items-start gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <SlidersHorizontal className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Adjust order total
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Enter a positive or negative amount and include a reason for auditing.
              </p>
            </div>
          </div>

          {current && (
            <div
              className="p-3 rounded border text-sm space-y-1"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>Current adjustment</span>
                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {formatAmount(current.amount)}
                </span>
              </div>
              {current.reason && (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Reason: {current.reason}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Adjustment reason
            </label>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={3}
              className="w-full rounded border px-3 py-2 text-sm resize-none"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
              placeholder="Why is this adjustment needed?"
            />
          </div>
        </div>

        <div className="flex-shrink-0 pt-3 border-t space-y-3" style={{ borderColor: 'var(--color-border-light)' }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Adjustment amount
            </label>
            <div
              className="w-full h-12 px-3 flex items-center gap-2 rounded border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              <DollarSign className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder="0.00"
                className="flex-1 text-lg font-mono bg-transparent outline-none border-none text-right"
              />
            </div>
            <div className="flex items-center justify-between">
              {/* <button
                type="button"
                onClick={handleToggleSign}
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Toggle ±
              </button> */}
              {onClear && current && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--color-error)' }}
                >
                  Remove adjustment
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5" style={{ gridTemplateRows: 'repeat(5, 1fr)' }}>
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
                gridRow: '2 / 6',
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

            <button
              type="button"
              onClick={handleToggleSign}
              className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              ±
            </button>
            <button
              type="button"
              onClick={() => handleKeypadInput('00')}
              className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              00
            </button>
            <button
              type="button"
              onClick={() => handleKeypadInput('0')}
              className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              0
            </button>

            <button
              type="button"
              onClick={() => handleKeypadInput('.')}
              className="col-span-3 h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              .
            </button>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}


