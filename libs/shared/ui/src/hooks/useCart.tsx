import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { LineItem } from '../components/transactions/TransactionLines.js';

export type CartContextValue = {
  items: LineItem[];
  addItem: (item: Omit<LineItem, 'id' | 'total'> & { id?: string }, showToast?: (message: string, type: 'success' | 'error' | 'info') => void) => void;
  setItemQuantity: (id: string, quantity: number, showToast?: (message: string, type: 'success' | 'error' | 'info') => void) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LineItem[]>([]);

  const addItem = useCallback((item: Omit<LineItem, 'id' | 'total'> & { id?: string }, showToast?: (message: string, type: 'success' | 'error' | 'info') => void) => {
    setItems(prev => {
      const price = Number(item.price) || 0;
      const qtyToAdd = Number(item.quantity) || 1;
      const availableQty = item.availableQuantity ?? Infinity; // Default to unlimited if not provided
      
      // Prefer id match, otherwise fallback to name match
      const index = prev.findIndex(li =>
        (item.id && li.id === item.id) || (!item.id && (li.productId === item.productId || li.name === item.name))
      );

      if (index >= 0) {
        const updated = [...prev];
        const existing = updated[index];
        const newQuantity = existing.quantity + qtyToAdd;
        
        // Check if new quantity exceeds available stock
        if (availableQty !== Infinity && newQuantity > availableQty) {
          const maxAllowed = availableQty - existing.quantity;
          if (maxAllowed <= 0) {
            showToast?.('Insufficient stock. Cannot add more items.', 'error');
            return prev;
          }
          showToast?.(`Only ${maxAllowed} more item(s) available in stock. Added ${maxAllowed} instead.`, 'info');
          updated[index] = {
            ...existing,
            quantity: existing.quantity + maxAllowed,
            price: existing.price, // keep existing price
            total: existing.price * (existing.quantity + maxAllowed),
            availableQuantity: availableQty, // Update available quantity
          };
          return updated;
        }
        
        updated[index] = {
          ...existing,
          quantity: newQuantity,
          price: existing.price, // keep existing price
          total: existing.price * newQuantity,
          availableQuantity: availableQty, // Update available quantity
        };
        return updated;
      }

      // Check if quantity exceeds available stock for new item
      if (availableQty !== Infinity && qtyToAdd > availableQty) {
        showToast?.(`Only ${availableQty} item(s) available in stock. Added ${availableQty} instead.`, 'info');
        const id = item.id ?? Math.random().toString(36).slice(2, 9);
        const total = price * availableQty;
        return [...prev, { 
          id, 
          name: item.name, 
          price, 
          quantity: availableQty, 
          total,
          productId: item.productId,
          productVariantId: item.productVariantId,
          availableQuantity: availableQty,
        }];
      }

      const id = item.id ?? Math.random().toString(36).slice(2, 9);
      const total = price * qtyToAdd;
      return [...prev, { 
        id, 
        name: item.name, 
        price, 
        quantity: qtyToAdd, 
        total,
        productId: item.productId,
        productVariantId: item.productVariantId,
        availableQuantity: availableQty,
      }];
    });
  }, []);

  const setItemQuantity = useCallback((id: string, quantity: number, showToast?: (message: string, type: 'success' | 'error' | 'info') => void) => {
    setItems(prev => {
      if (quantity <= 0) {
        return prev.filter(li => li.id !== id);
      }
      
      const item = prev.find(li => li.id === id);
      if (!item) return prev;
      
      const availableQty = item.availableQuantity ?? Infinity;
      
      // Check if quantity exceeds available stock
      if (availableQty !== Infinity && quantity > availableQty) {
        showToast?.(`Only ${availableQty} item(s) available in stock.`, 'error');
        return prev.map(li =>
          li.id === id ? { ...li, quantity: availableQty, total: li.price * availableQty } : li
        );
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


