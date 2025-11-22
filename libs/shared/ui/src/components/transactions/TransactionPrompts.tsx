import React, { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useCurrency, CURRENCY_CONFIGS, type Currency, type FormatOptions } from '@monorepo/shared-hooks-currency';
const useCurrencyFormatter = () => {
  const { formatAmount, currency } = useCurrency({ defaultCurrency: 'PKR' });
  const label = currency === 'PKR' ? 'Rs' : currency;

  return React.useCallback(
    (amount: number, options?: FormatOptions) => {
      const formatted = formatAmount(amount, { ...options, showSymbol: false });
      return `${label} ${formatted}`;
    },
    [formatAmount, label],
  );
};

type PromptModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
};

const PromptModal = ({
  isOpen,
  title,
  onClose,
  children,
  footer,
  widthClass = 'w-full max-w-md',
}: PromptModalProps) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className={`bg-[var(--color-bg-primary)] border rounded-lg shadow-xl ${widthClass}`}
        style={{ borderColor: 'var(--color-border-light)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-4">{children}</div>
        {footer && (
          <div
            className="px-4 py-3 border-t flex justify-end gap-2"
            style={{ borderColor: 'var(--color-border-light)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export type DiscountPromptProps = {
  isOpen: boolean;
  mode: 'amount' | 'percent';
  value: string;
  current?: { type: 'amount' | 'percent'; value: number } | null;
  onModeChange: (mode: 'amount' | 'percent') => void;
  onValueChange: (val: string) => void;
  onApply: () => void;
  onClose: () => void;
};

export const DiscountPrompt = ({
  isOpen,
  mode,
  value,
  current,
  onModeChange,
  onValueChange,
  onApply,
  onClose,
}: DiscountPromptProps) => {
  const { currency } = useCurrency({ defaultCurrency: 'PKR' });
  const currencyLabel = currency === 'PKR' ? 'Rs' : currency;

  return (
    <PromptModal
      isOpen={isOpen}
      title="Order Discount"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border text-sm"
            style={{ borderColor: 'var(--color-border-light)' }}
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 rounded text-sm font-semibold"
            style={{ backgroundColor: 'var(--color-primary-500)', color: 'var(--color-text-light)' }}
          >
            Apply Discount
          </button>
        </>
      }
    >
      <div className="flex gap-2">
        {(['amount', 'percent'] as const).map((option) => (
          <button
            key={option}
            onClick={() => onModeChange(option)}
            className={`flex-1 px-3 py-2 rounded border text-sm font-medium ${
              mode === option ? 'bg-[var(--color-primary-500)] text-white' : ''
            }`}
            style={{
              borderColor: 'var(--color-border-light)',
              color: mode === option ? 'white' : 'var(--color-text-primary)',
            }}
          >
            {option === 'amount' ? `Amount (${currencyLabel})` : 'Percent (%)'}
          </button>
        ))}
      </div>
      <div>
        <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {mode === 'amount' ? 'Discount amount' : 'Discount percent'}
        </label>
        <input
          type="number"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={mode === 'amount' ? 'e.g. 25' : 'e.g. 10'}
          className="w-full px-3 py-2 rounded border text-sm"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border-light)',
          }}
        />
      </div>
      {current && (
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Current: {current.type === 'amount' ? `${currencyLabel} ` : ''}
          {current.value}
          {current.type === 'percent' ? '%' : ''} discount applied.
        </p>
      )}
    </PromptModal>
  );
};

export type CouponPromptProps = {
  isOpen: boolean;
  code: string;
  value: string;
  current?: { code: string; discount: number } | null;
  onCodeChange: (val: string) => void;
  onValueChange: (val: string) => void;
  onApply: () => void;
  onClose: () => void;
  title?: string;
  codeLabel?: string;
};

export const CouponPrompt = ({
  isOpen,
  code,
  value,
  current,
  onCodeChange,
  onValueChange,
  onApply,
  onClose,
  title = "Apply Coupon",
  codeLabel = "Coupon code",
}: CouponPromptProps) => {
  const formatCurrency = useCurrencyFormatter();
  return (
    <PromptModal
    isOpen={isOpen}
    title={title}
    onClose={onClose}
    footer={
      <>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded border text-sm"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary-500)', color: 'var(--color-text-light)' }}
        >
          Apply {title.includes("Gift") ? "Gift Card" : "Coupon"}
        </button>
      </>
    }
  >
    <div>
      <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {codeLabel}
      </label>
      <input
        type="text"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder={`Enter ${codeLabel.toLowerCase()}`}
        className="w-full px-3 py-2 rounded border text-sm"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border-light)',
        }}
      />
    </div>
    <div>
      <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Discount amount (optional)
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="e.g. 15"
        className="w-full px-3 py-2 rounded border text-sm"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border-light)',
        }}
      />
    </div>
      {current && (
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {codeLabel} "{current.code}" currently applies {formatCurrency(current.discount)}.
        </p>
      )}
    </PromptModal>
  );
};

export type AdjustmentPromptProps = {
  isOpen: boolean;
  amount: string;
  reason: string;
  current?: { amount: number; reason?: string } | null;
  onAmountChange: (val: string) => void;
  onReasonChange: (val: string) => void;
  onApply: () => void;
  onClose: () => void;
};

export const AdjustmentPrompt = ({
  isOpen,
  amount,
  reason,
  current,
  onAmountChange,
  onReasonChange,
  onApply,
  onClose,
}: AdjustmentPromptProps) => {
  const formatCurrency = useCurrencyFormatter();

  return (
    <PromptModal
    isOpen={isOpen}
    title="Order Adjustment"
    onClose={onClose}
    footer={
      <>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded border text-sm"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary-500)', color: 'var(--color-text-light)' }}
        >
          Save Adjustment
        </button>
      </>
    }
  >
    <div>
      <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Adjustment amount
      </label>
      <input
        type="number"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="Use negative value for discounts"
        className="w-full px-3 py-2 rounded border text-sm"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border-light)',
        }}
      />
    </div>
    <div>
      <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Reason (optional)
      </label>
      <textarea
        rows={3}
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Describe why this adjustment is needed"
        className="w-full px-3 py-2 rounded border text-sm resize-none"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border-light)',
        }}
      />
    </div>
      {current && (
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Current adjustment: {formatCurrency(current.amount)} {current.reason ? `(${current.reason})` : ''}
        </p>
      )}
    </PromptModal>
  );
};

export type PreviewLineItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export type PreviewPromptProps = {
  isOpen: boolean;
  lineItems: PreviewLineItem[];
  totals: {
    subtotal: number;
    discountValue: number;
    giftCardValue: number;
    adjustmentValue: number;
    taxValue: number;
    total: number;
  };
  giftCard?: { cardNumber: string; discount: number } | null;
  adjustment?: { amount: number; reason?: string } | null;
  onClose: () => void;
};

export const PreviewPrompt = ({
  isOpen,
  lineItems,
  totals,
  giftCard,
  adjustment,
  onClose,
}: PreviewPromptProps) => {
  const formatCurrency = useCurrencyFormatter();
  return (
    <PromptModal
    isOpen={isOpen}
    title="Order Preview"
    onClose={onClose}
    widthClass="w-full max-w-3xl"
  >
    <div className="space-y-4">
      <div className="max-h-60 overflow-auto border rounded" style={{ borderColor: 'var(--color-border-light)' }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-right px-3 py-2">Qty</th>
              <th className="text-right px-3 py-2">Price</th>
              <th className="text-right px-3 py-2">Line total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  No items in the cart
                </td>
              </tr>
            )}
            {lineItems.map((item) => (
              <tr key={item.id} className="border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.price)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        {totals.discountValue > 0 && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--color-text-secondary)' }}>Discount</span>
            <span>-{formatCurrency(totals.discountValue)}</span>
          </div>
        )}
        {totals.giftCardValue > 0 && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--color-text-secondary)' }}>Gift Card</span>
            <span>-{formatCurrency(totals.giftCardValue)}</span>
          </div>
        )}
        {totals.adjustmentValue !== 0 && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--color-text-secondary)' }}>Adjustment</span>
            <span>{formatCurrency(totals.adjustmentValue)}</span>
          </div>
        )}
        {totals.taxValue > 0 && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--color-text-secondary)' }}>Tax</span>
            <span>{formatCurrency(totals.taxValue)}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-3 flex justify-between items-center" style={{ borderColor: 'var(--color-border-light)' }}>
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Total due
          </p>
          {giftCard && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Gift Card: {giftCard.cardNumber}
            </p>
          )}
          {adjustment?.reason && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Adjustment note: {adjustment.reason}
            </p>
          )}
        </div>
        <p className="text-2xl font-semibold">{formatCurrency(totals.total)}</p>
      </div>
    </div>
    </PromptModal>
  );
};

export const formatCurrency = (amount: number): string => {
  let currency: Currency = 'PKR';
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('app-currency');
    if (stored && stored in CURRENCY_CONFIGS) {
      currency = stored as Currency;
    }
  }
  const label = currency === 'PKR' ? 'Rs' : currency;
  const formatted = new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(amount);
  return `${label} ${formatted}`;
};

