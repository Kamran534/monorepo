import { useEffect, useMemo, useRef, useState } from 'react';
import { SidePanel } from '@monorepo/shared-ui';
import { CornerDownLeft, TicketPercent } from 'lucide-react';

export interface TransactionCouponPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called when the user confirms the coupon (via Enter button or keyboard)
   */
  onApply?: (code: string) => void;
  /**
   * Called when the applied coupon should be cleared
   */
  onClear?: () => void;
  /**
   * Prefill code when the panel opens
   */
  initialCode?: string;
  /**
   * Details of the currently applied coupon (if any)
   */
  appliedCoupon?: {
    code: string;
    type: 'amount' | 'percent';
    value: number;
  } | null;
}

export function TransactionCouponPanel({
  isOpen,
  onClose,
  onApply,
  onClear,
  initialCode = '',
  appliedCoupon,
}: TransactionCouponPanelProps) {
  const [code, setCode] = useState(initialCode);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode(initialCode);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [initialCode, isOpen]);

  const formatValue = useMemo(
    () => (appliedCoupon?.type === 'percent' ? `${appliedCoupon.value}%` : `$${appliedCoupon?.value ?? 0}`),
    [appliedCoupon],
  );

  const appendValue = (value: string) => {
    setCode((prev) => `${prev}${value}`);
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    setCode((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    onApply?.(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
  };

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Add coupon" width="320px">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex items-start gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <TicketPercent className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Scan or enter a coupon code
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Use your barcode scanner or on-screen keypad below. Press Enter to apply.
              </p>
            </div>
          </div>

          {appliedCoupon && (
            <div
              className="p-3 rounded border text-sm flex flex-col gap-1"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>Current coupon</span>
              <div className="flex items-center justify-between">
                <span className="font-semibold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                  {appliedCoupon.code}
                </span>
                <span className="text-sm font-mono" style={{ color: 'var(--color-accent-blue)' }}>
                  {formatValue}
                </span>
              </div>
              {onClear && (
                <button
                  onClick={onClear}
                  className="self-start text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--color-error)' }}
                >
                  Remove coupon
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-3 border-t space-y-3" style={{ borderColor: 'var(--color-border-light)' }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Coupon code
            </label>
            <div
              className="w-full h-12 px-3 flex items-center rounded border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Scan or enter coupon code"
                className="w-full text-lg font-mono uppercase bg-transparent outline-none border-none"
                aria-label="Coupon code input"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
            {[7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => appendValue(num.toString())}
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

            <button
              type="button"
              onClick={handleSubmit}
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

            {[4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => appendValue(num.toString())}
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

            {[1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => appendValue(num.toString())}
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
              onClick={() => appendValue('0')}
              className="col-span-3 h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              0
            </button>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}


