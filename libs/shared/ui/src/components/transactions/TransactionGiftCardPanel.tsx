import { useEffect, useRef, type KeyboardEvent } from 'react';
import { SidePanel } from '@monorepo/shared-ui';
import { Gift, CornerDownLeft } from 'lucide-react';

export interface TransactionGiftCardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cardNumber: string;
  appliedGiftCard?: { cardNumber: string; discount: number } | null;
  onCardNumberChange: (value: string) => void;
  onApply?: () => void;
  onClear?: () => void;
}

export function TransactionGiftCardPanel({
  isOpen,
  onClose,
  cardNumber,
  appliedGiftCard,
  onCardNumberChange,
  onApply,
  onClear,
}: TransactionGiftCardPanelProps) {
  const cardInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cardInputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const appendValue = (value: string) => {
    onCardNumberChange(`${cardNumber}${value}`);
    cardInputRef.current?.focus();
  };

  const handleBackspace = () => {
    onCardNumberChange(cardNumber.slice(0, -1));
    cardInputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!cardNumber.trim()) return;
    onApply?.();
  };

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Gift card" width="320px">
      <div className="flex flex-col h-full text-sm">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <Gift className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Apply a gift card
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Scan or type the card number to apply its default discount.
            </p>
          </div>
        </div>

        {appliedGiftCard && (
          <div
            className="p-3 rounded border flex flex-col gap-1"
            style={{
              borderColor: 'var(--color-border-light)',
              backgroundColor: 'var(--color-bg-card)',
            }}
          >
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              Current gift card
            </span>
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {appliedGiftCard.cardNumber}
              </span>
              <span className="text-sm font-mono" style={{ color: 'var(--color-accent-blue)' }}>
                {appliedGiftCard.discount || 0}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Card number
          </label>
          <div
            className="w-full h-12 px-3 flex items-center rounded border"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-border-light)',
            }}
          >
            <input
              ref={cardInputRef}
              type="text"
              value={cardNumber}
              onChange={(event) => onCardNumberChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter card number"
              className="w-full bg-transparent outline-none border-none text-base font-medium"
              aria-label="Gift card number"
            />
          </div>
        </div>

          {appliedGiftCard && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="self-start text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-error)' }}
            >
              Remove gift card
            </button>
          )}
        </div>

        <div
          className="flex-shrink-0 pt-3 space-y-2"
          style={{
            borderTop: '1px solid var(--color-border-light)',
          }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Use the keypad or scanner to enter the card number. Press Enter or tap the arrow button to apply. Press Esc to close.
          </p>
          <div className="grid grid-cols-4 gap-1.5" style={{ gridTemplateRows: 'repeat(4, minmax(44px, 1fr))' }}>
            {[7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendValue(String(digit))}
                className="rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="rounded flex items-center justify-center hover:opacity-80 transition-opacity border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              ⌫
            </button>
            {[4, 5, 6].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendValue(String(digit))}
                className="rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!cardNumber.trim()}
              className="rounded flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--color-accent-blue)',
                color: 'var(--color-text-light)',
                gridRow: '2 / 5',
                gridColumn: '4',
              }}
            >
              <CornerDownLeft className="w-5 h-5" />
            </button>
            {[1, 2, 3].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendValue(String(digit))}
                className="rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => appendValue('0')}
              className="col-span-3 rounded text-base font-medium hover:opacity-80 transition-opacity border"
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

export default TransactionGiftCardPanel;

