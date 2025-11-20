import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
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

export interface CompactPaymentPanelProps extends ComponentProps {
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
const DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10];

export function CompactPaymentPanel({
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
}: CompactPaymentPanelProps) {
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const methodInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

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
    };

    onAddPayment(payload);
    setPaymentAmount('');
  };

  return (
    <div className={`grid gap-4 ${className}`} style={{ gridTemplateColumns: '0.8fr 1fr 1.2fr' }}>
      {/* Left Column - Amount Due */}
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Amount due
          </p>
          <p className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {formatCurrency(amountDue).replace('$', '')}
          </p>
        </div>
      </div>

      {/* Center Column - Payment Amount + Keypad */}
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Payment amount
          </p>
          <div className="flex items-center justify-between mb-3">
            <p className="text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {formatCurrency(keypadAmount)}
            </p>
            <button
              onClick={() => setPaymentAmount('')}
              className="text-2xl px-2 hover:opacity-70"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {KEYPAD_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleKeypadInput(key)}
              disabled={disabled}
              className="h-14  text-xl font-semibold hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: '#d1d5db',
                color: '#111827',
              }}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Pay Button */}
        <button
          onClick={handleAddPaymentInternal}
          disabled={disabled || !selectedMethodId || !paymentAmount}
          className="w-full h-12 cursor-pointer text-sm font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center"
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
          }}
        >
          Pay
        </button>
      </div>

      {/* Right Column - Denominations */}
      <div className="space-y-4">
        <p className="text-xs ml-24 uppercase tracking-wide font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Denominations
        </p>

        <div className="flex flex-wrap gap-2 max-w-[280px] ml-24">
          {DENOMINATIONS.map((value) => (
            <button
              key={value}
              onClick={() => handleDenomination(value)}
              disabled={disabled}
              className="w-32 h-32 text-white text-base font-semibold hover:opacity-90 transition-opacity flex items-end justify-start pb-3 pl-3"
              style={{ backgroundColor: '#ef4444' }}
            >
              {formatCurrency(value).replace('.00', '')}
            </button>
          ))}
        </div>  
      </div>
    </div>
  );
}
