import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, Banknote, Trash2, Plus, Check } from 'lucide-react';
import { ComponentProps } from '../../types.js';

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

export interface PaymentCollectionProps extends ComponentProps {
  payments: Payment[];
  paymentMethods: PaymentMethod[];
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  onAddPayment: (payment: Omit<Payment, 'id'>) => void;
  onRemovePayment: (id: string) => void;
  disabled?: boolean;
}

/**
 * PaymentCollection Component
 *
 * Allows collecting multiple payments with different payment methods
 * Supports cash, card, and other payment types
 */
export function PaymentCollection({
  payments,
  paymentMethods,
  totalAmount,
  amountPaid,
  amountDue,
  onAddPayment,
  onRemovePayment,
  disabled = false,
  className = '',
}: PaymentCollectionProps) {
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [cardLast4, setCardLast4] = useState<string>('');
  const [cardBrand, setCardBrand] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const selectedMethod = paymentMethods.find(pm => pm.id === selectedMethodId);
  const isCardPayment = selectedMethod?.type === 'Card';
  const isPaid = amountDue <= 0;

  // Auto-focus amount input when payment method is selected
  useEffect(() => {
    if (selectedMethodId && amountInputRef.current && !disabled) {
      amountInputRef.current.focus();
    }
  }, [selectedMethodId, disabled]);

  const handleAddPayment = () => {
    if (!selectedMethodId || !paymentAmount) {
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    const payment: Omit<Payment, 'id'> = {
      paymentMethodId: selectedMethodId,
      paymentMethod: selectedMethod,
      amount,
      ...(isCardPayment && cardLast4 && { cardLast4 }),
      ...(isCardPayment && cardBrand && { cardBrand }),
      ...(isCardPayment && authCode && { authorizationCode: authCode }),
    };

    onAddPayment(payment);

    // Reset form
    setPaymentAmount('');
    setCardLast4('');
    setCardBrand('');
    setAuthCode('');
  };

  const handleQuickPay = (methodId: string) => {
    if (amountDue <= 0) return;

    const method = paymentMethods.find(pm => pm.id === methodId);
    if (!method) return;

    onAddPayment({
      paymentMethodId: methodId,
      paymentMethod: method,
      amount: amountDue,
    });
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
    <div
      className={`border rounded-lg ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: isPaid ? 'var(--color-success)' : 'var(--color-border-light)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border-light)' }}
      >
        <div className="flex items-center gap-2">
          <CreditCard
            className="w-5 h-5"
            style={{ color: isPaid ? 'var(--color-success)' : 'var(--color-accent-blue)' }}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Payment Collection
          </h3>
        </div>
        {isPaid && (
          <div className="flex items-center gap-1">
            <Check
              className="w-4 h-4"
              style={{ color: 'var(--color-success)' }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--color-success)' }}
            >
              Paid
            </span>
          </div>
        )}
      </div>

      {/* Payment Summary */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Total Amount:
          </span>
          <span
            className="text-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {formatCurrency(totalAmount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Amount Paid:
          </span>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--color-success)' }}
          >
            {formatCurrency(amountPaid)}
          </span>
        </div>
        <div
          className="flex items-center justify-between pt-2 border-t"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Amount Due:
          </span>
          <span
            className="text-lg font-bold"
            style={{
              color: amountDue > 0 ? 'var(--color-error)' : 'var(--color-success)',
            }}
          >
            {formatCurrency(amountDue)}
          </span>
        </div>
      </div>

      {/* Existing Payments */}
      {payments.length > 0 && (
        <div
          className="px-4 pb-3 border-t"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <div className="text-xs font-medium mb-2 mt-3" style={{ color: 'var(--color-text-secondary)' }}>
            Payments ({payments.length})
          </div>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-2 rounded border"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="p-1.5 rounded"
                    style={{ backgroundColor: 'var(--color-accent-blue-light)' }}
                  >
                    {getPaymentIcon(payment.paymentMethod?.type || 'Cash')}
                  </div>
                  <div className="flex-1">
                    <div
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {payment.paymentMethod?.name || 'Unknown'}
                    </div>
                    {payment.cardLast4 && (
                      <div
                        className="text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {payment.cardBrand} **** {payment.cardLast4}
                      </div>
                    )}
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-success)' }}
                  >
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
                <button
                  onClick={() => onRemovePayment(payment.id)}
                  disabled={disabled}
                  className="ml-2 p-1 rounded transition-colors disabled:opacity-30"
                  style={{ color: 'var(--color-error)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Payment Form */}
      {!isPaid && (
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--color-border-light)' }}>
          {/* Quick Payment Buttons */}
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Quick Pay
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.filter(pm => pm.isActive).slice(0, 2).map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleQuickPay(method.id)}
                  disabled={disabled || amountDue <= 0}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded border transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {getPaymentIcon(method.type)}
                  <span className="text-sm font-medium">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Payment Entry */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Payment Method
            </label>
            <select
              value={selectedMethodId}
              onChange={(e) => setSelectedMethodId(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 rounded border text-sm disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              <option value="">Select payment method...</option>
              {paymentMethods.filter(pm => pm.isActive).map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Amount
            </label>
            <input
              ref={amountInputRef}
              inputMode="decimal"
              pattern="[0-9]*"
              value={paymentAmount}
              onKeyDown={(e) => {
                if (selectedMethodId && !disabled) {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const current = parseFloat(paymentAmount || '0') || 0;
                    const delta =
                      e.shiftKey ? 10 : e.altKey ? 0.01 : 1;
                    const nextValue =
                      e.key === 'ArrowUp'
                        ? current + delta
                        : Math.max(0, current - delta);
                    setPaymentAmount(nextValue.toFixed(2));
                  }
                  if (e.key === 'Enter' && paymentAmount) {
                    e.preventDefault();
                    handleAddPayment();
                  }
                }
              }}
              onChange={(e) => {
                const value = e.target.value
                  ?.replace(/[^0-9.]/g, '')
                  .replace(/(\..*)\./g, '$1');
                setPaymentAmount(value);
              }}
              disabled={disabled || !selectedMethodId}
              placeholder="0.00"
              autoFocus={!!selectedMethodId}
              className="w-full px-3 py-2 rounded border text-sm disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            />
          </div>

          {/* Card Details (only show for card payments) */}
          {isCardPayment && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                    disabled={disabled}
                    placeholder="1234"
                    className="w-full px-3 py-2 rounded border text-sm disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      borderColor: 'var(--color-border-light)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Card Brand
                  </label>
                  <input
                    type="text"
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    disabled={disabled}
                    placeholder="Visa"
                    className="w-full px-3 py-2 rounded border text-sm disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      borderColor: 'var(--color-border-light)',
                    }}
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Authorization Code (Optional)
                </label>
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  disabled={disabled}
                  placeholder="AUTH123"
                  className="w-full px-3 py-2 rounded border text-sm disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    borderColor: 'var(--color-border-light)',
                  }}
                />
              </div>
            </>
          )}

          <button
            onClick={handleAddPayment}
            disabled={disabled || !selectedMethodId || !paymentAmount}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--color-accent-blue)',
              color: 'white',
            }}
          >
            <Plus className="w-4 h-4" />
            Add Payment
          </button>
        </div>
      )}

      {/* Change Due */}
      {amountDue < 0 && (
        <div
          className="px-4 py-3 border-t"
          style={{
            backgroundColor: 'var(--color-success-light)',
            borderColor: 'var(--color-success)',
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-success)' }}
            >
              Change to Return:
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--color-success)' }}
            >
              {formatCurrency(Math.abs(amountDue))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
