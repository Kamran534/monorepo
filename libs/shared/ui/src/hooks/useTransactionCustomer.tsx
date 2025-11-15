import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Customer } from '../components/customer/CustomerCard.js';

export type TransactionCustomerContextValue = {
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  clearCustomer: () => void;
};

const TransactionCustomerContext = createContext<TransactionCustomerContextValue | undefined>(undefined);

export function TransactionCustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomerState] = useState<Customer | null>(() => {
    // Load from localStorage if available
    try {
      const saved = localStorage.getItem('transaction-customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setCustomer = useCallback((customer: Customer | null) => {
    setCustomerState(customer);
    // Save to localStorage
    try {
      if (customer) {
        localStorage.setItem('transaction-customer', JSON.stringify(customer));
      } else {
        localStorage.removeItem('transaction-customer');
      }
    } catch (error) {
      console.warn('Failed to save transaction customer to localStorage:', error);
    }
  }, []);

  const clearCustomer = useCallback(() => {
    setCustomer(null);
  }, [setCustomer]);

  const value = useMemo<TransactionCustomerContextValue>(
    () => ({ customer, setCustomer, clearCustomer }),
    [customer, setCustomer, clearCustomer]
  );

  return <TransactionCustomerContext.Provider value={value}>{children}</TransactionCustomerContext.Provider>;
}

export function useTransactionCustomer(): TransactionCustomerContextValue {
  const ctx = useContext(TransactionCustomerContext);
  if (!ctx) throw new Error('useTransactionCustomer must be used within TransactionCustomerProvider');
  return ctx;
}

