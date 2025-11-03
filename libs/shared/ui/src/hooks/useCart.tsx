import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { LineItem } from '../components/transactions/TransactionLines.js';

export type CartContextValue = {
  items: LineItem[];
  addItem: (item: Omit<LineItem, 'id' | 'total'> & { id?: string }) => void;
  setItemQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LineItem[]>([]);

  const addItem = useCallback((item: Omit<LineItem, 'id' | 'total'> & { id?: string }) => {
    setItems(prev => {
      const price = Number(item.price) || 0;
      const qtyToAdd = Number(item.quantity) || 1;
      // Prefer id match, otherwise fallback to name match
      const index = prev.findIndex(li =>
        (item.id && li.id === item.id) || (!item.id && li.name === item.name)
      );

      if (index >= 0) {
        const updated = [...prev];
        const existing = updated[index];
        const newQuantity = existing.quantity + qtyToAdd;
        updated[index] = {
          ...existing,
          quantity: newQuantity,
          price: existing.price, // keep existing price
          total: existing.price * newQuantity,
        };
        return updated;
      }

      const id = item.id ?? Math.random().toString(36).slice(2, 9);
      const total = price * qtyToAdd;
      return [...prev, { id, name: item.name, price, quantity: qtyToAdd, total }];
    });
  }, []);

  const setItemQuantity = useCallback((id: string, quantity: number) => {
    setItems(prev => {
      if (quantity <= 0) {
        return prev.filter(li => li.id !== id);
      }
      return prev.map(li =>
        li.id === id ? { ...li, quantity, total: li.price * quantity } : li
      );
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(li => li.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => ({ items, addItem, setItemQuantity, removeItem, clear }), [items, addItem, setItemQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}


