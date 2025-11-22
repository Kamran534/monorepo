import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, Check, CornerDownLeft, CreditCard, Trash2 } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: 'Cash' | 'Card' | 'BankTransfer' | 'Check' | 'GiftCard' | 'StoreCredit' | 'OnAccount';
  isActive: boolean;
  icon?: string;
}

export interface Payment {
  id: string;
  paymentMethodId: string;
  paymentMethod?: PaymentMethod;
  amount: number;
  transactionId?: string;
  authorizationCode?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export interface PaymentPanelProps extends ComponentProps {
  payments: Payment[];
  paymentMethods: PaymentMethod[];
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  onAddPayment: (payment: Omit<Payment, 'id'>) => void;
  onRemovePayment: (paymentId: string) => void;
  disabled?: boolean;
  className?: string;
  mode?: 'cash' | 'card' | null;
}

const KEYPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', '.'];
const CASH_DENOMINATIONS = [5000, 1000, 500, 100, 50, 20];
const CARD_DENOMINATIONS = [1000, 500, 100, 50, 20];

export function PaymentPanel({
  payments,
  paymentMethods,
  totalAmount,
  amountPaid,
  amountDue,
  onAddPayment,
  onRemovePayment,
  disabled = false,
  className = '',
  mode = null,
}: PaymentPanelProps) {
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [cardLast4, setCardLast4] = useState<string>('');
  const [cardBrand, setCardBrand] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const methodInputRef = useRef<HTMLInputElement>(null);
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = React.useCallback((amount: number) => formatAmount(amount), [formatAmount]);

  const filteredMethods = useMemo(() => {
    if (mode === 'cash') {
      return paymentMethods.filter((pm) => pm.type === 'Cash');
    }
    if (mode === 'card') {
      return paymentMethods.filter((pm) => pm.type === 'Card');
    }
    return paymentMethods;
  }, [paymentMethods, mode]);

  const availableMethods = filteredMethods.length > 0 ? filteredMethods : paymentMethods;
  const selectedMethod = availableMethods.find((pm) => pm.id === selectedMethodId);
  const effectiveMode = mode ?? selectedMethod?.type?.toLowerCase();
  const isCardPayment = selectedMethod?.type === 'Card';
  const isPaid = amountDue <= 0;

  useEffect(() => {
    if (!selectedMethodId && availableMethods.length > 0) {
      setSelectedMethodId(availableMethods[0].id);
    }
  }, [selectedMethodId, availableMethods]);

  useEffect(() => {
    if (selectedMethodId && methodInputRef.current && !disabled) {
      methodInputRef.current.focus();
    }
  }, [selectedMethodId, disabled]);

  const keypadAmount = parseFloat(paymentAmount || '0') || 0;
  const denominations = effectiveMode === 'card' ? CARD_DENOMINATIONS : CASH_DENOMINATIONS;

  const handleKeypadInput = (value: string) => {
    if (disabled) return;
    setPaymentAmount((prev) => {
      const current = prev || '';
      if (value === '.') {
        if (current.includes('.')) return current;
        return current ? `${current}.` : '0.';
      }
      if (value === '00') {
        return current ? `${current}00` : '0';
      }
      return current === '0' ? value : `${current}${value}`;
    });
  };

  const handleToggleSign = () => {
    if (disabled) return;
    setPaymentAmount((prev) => {
      if (!prev) return prev;
      return prev.startsWith('-') ? prev.slice(1) : `-${prev}`;
    });
  };

  const handleDenomination = (value: number) => {
    if (disabled) return;
    setPaymentAmount((prev) => {
      const current = parseFloat(prev || '0') || 0;
      return (current + value).toFixed(2);
    });
  };

  const handleBackspace = () => {
    if (disabled) return;
    setPaymentAmount((prev) => (prev ? prev.slice(0, -1) : ''));
  };

  const handleClear = () => {
    if (disabled) return;
    setPaymentAmount('');
  };

  const handleAddPaymentInternal = () => {
    if (!selectedMethodId || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const payload: Omit<Payment, 'id'> = {
      paymentMethodId: selectedMethodId,
      paymentMethod: selectedMethod,
      amount,
      ...(isCardPayment && cardLast4 && { cardLast4 }),
      ...(isCardPayment && cardBrand && { cardBrand }),
      ...(isCardPayment && authCode && { authorizationCode: authCode }),
    };

    onAddPayment(payload);
    setPaymentAmount('');
    setCardLast4('');
    setCardBrand('');
    setAuthCode('');
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'Cash':
        return <Banknote className="w-4 h-4" />;
      case 'Card':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <section
        className="rounded-2xl border shadow-xl p-6"
        style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Amount due
              </p>
              <div className="flex items-baseline gap-3">
                <p
                  className="text-5xl font-bold tracking-tight"
                  style={{ color: amountDue > 0 ? '#dc2626' : 'var(--color-success)' }}
                >
                  {formatCurrency(amountDue)}
                </p>
                {isPaid && (
                  <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                    <Check className="w-4 h-4" />
                    Paid
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--color-border-light)' }}>
              <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Total amount</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Amount paid</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Remaining</span>
                <span style={{ color: amountDue > 0 ? '#dc2626' : 'var(--color-success)' }}>
                  {formatCurrency(Math.max(0, amountDue))}
                </span>
              </div>
              {amountDue < 0 && (
                <div className="flex justify-between text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                  <span>Change due</span>
                  <span>{formatCurrency(Math.abs(amountDue))}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Payment amount
              </p>
              <p className="text-5xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                {formatCurrency(keypadAmount)}
              </p>
            </div>
            <div className="flex gap-3">
              <div
                className="grid grid-cols-3 gap-2 flex-1 bg-white p-3 rounded-2xl"
                style={{ border: '1px solid var(--color-border-light)' }}
              >
                {KEYPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypadInput(key)}
                    disabled={disabled}
                    className="h-14 rounded-lg text-xl font-semibold hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#111827',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  disabled={disabled}
                  className="col-span-3 h-12 rounded-lg text-sm font-semibold uppercase tracking-wide hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: '#e5e7eb',
                    color: '#111827',
                    border: '1px solid #d1d5db',
                  }}
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-col gap-2 w-20">
                <button
                  onClick={handleToggleSign}
                  disabled={disabled}
                  className="h-12 rounded-xl text-base font-semibold hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#111827',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  ±
                </button>
                <button
                  onClick={handleBackspace}
                  disabled={disabled}
                  className="h-12 rounded-xl text-base font-semibold hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#111827',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  ⌫
                </button>
                <button
                  onClick={handleAddPaymentInternal}
                  disabled={disabled || !selectedMethodId || !paymentAmount}
                  className="flex-1 rounded-xl text-2xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center"
                  style={{ backgroundColor: '#ef4444', boxShadow: '0 12px 20px rgba(239,68,68,0.35)' }}
                >
                  <CornerDownLeft className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-primary)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Payment method
            </p>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedMethod?.type ?? 'Select a method'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethodId(method.id)}
                disabled={disabled}
                className={`px-4 py-2 rounded-full border text-sm transition-all ${
                  selectedMethodId === method.id ? 'font-semibold' : ''
                }`}
                style={{
                  borderColor: selectedMethodId === method.id ? '#ef4444' : 'var(--color-border-light)',
                  backgroundColor: selectedMethodId === method.id ? '#fee2e2' : 'var(--color-bg-primary)',
                  color: selectedMethodId === method.id ? '#b91c1c' : 'var(--color-text-primary)',
                }}
              >
                {method.name}
              </button>
            ))}
          </div>

          {effectiveMode === 'card' ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                Card details
              </p>
              <input
                ref={methodInputRef}
                type="text"
                value={cardBrand}
                onChange={(e) => setCardBrand(e.target.value)}
                disabled={disabled}
                placeholder="Card brand"
                className="w-full px-3 py-2 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              />
              <input
                type="text"
                maxLength={4}
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                disabled={disabled}
                placeholder="Last four digits"
                className="w-full px-3 py-2 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              />
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                disabled={disabled}
                placeholder="Authorization code"
                className="w-full px-3 py-2 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                Quick cash
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {denominations.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleDenomination(value)}
                    disabled={disabled}
                    className="h-12 rounded-xl text-sm font-semibold flex items-center justify-between px-3 shadow-sm"
                    style={{
                      backgroundColor: '#fef2f2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <span>{formatCurrency(value)}</span>
                    <span className="text-xs opacity-70">+</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-primary)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Payments
            </p>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {payments.length} entr{payments.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          {payments.length === 0 ? (
            <div
              className="rounded-xl border border-dashed p-6 text-center text-sm"
              style={{ borderColor: 'var(--color-border-light)', color: 'var(--color-text-secondary)' }}
            >
              No payments have been recorded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-xl border"
                  style={{ borderColor: 'var(--color-border-light)' }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#eef2ff' }}>
                      {getPaymentIcon(payment.paymentMethod?.type || 'Cash')}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {payment.paymentMethod?.name || 'Unknown'}
                      </p>
                      {payment.cardLast4 && (
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {payment.cardBrand} **** {payment.cardLast4}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemovePayment(payment.id)}
                    disabled={disabled}
                    className="ml-2 p-2 rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-30"
                    style={{ color: 'var(--color-error)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
