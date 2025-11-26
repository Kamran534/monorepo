import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { LineItem } from '../components/transactions/TransactionLines.js';

const LINE_TAX_RATE = 0.03;

const parseNumeric = (value: any): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const recalcLineTotals = (line: LineItem): LineItem => {
  const price = parseNumeric(line.price) ?? 0;
  const quantity = parseNumeric(line.quantity) ?? 0;
  const baseSubtotal = price * quantity;

  const lineDiscountValue = parseNumeric(line.lineDiscountValue);
  const providedSaleDiscount = parseNumeric(line.lineDiscount ?? line.discount);
  const computedSaleDiscount =
    line.lineDiscountType && lineDiscountValue !== undefined
      ? line.lineDiscountType === 'percent'
        ? (Math.abs(baseSubtotal) * lineDiscountValue) / 100
        : lineDiscountValue
      : 0;
  const saleDiscountAmount = providedSaleDiscount ?? computedSaleDiscount;

  // Debug logging - ALWAYS log to see what's happening
  console.log('[useCart] recalcLineTotals:', {
    name: line.name,
    lineDiscount: line.lineDiscount,
    lineDiscountType: line.lineDiscountType,
    lineDiscountValue: lineDiscountValue,
    providedSaleDiscount,
    computedSaleDiscount,
    finalSaleDiscountAmount: saleDiscountAmount,
  });

  let resolvedCustomDiscountAmount = parseNumeric(line.customDiscountAmount);
  const resolvedCustomDiscountPercent = parseNumeric(line.customDiscountPercent);
  if (resolvedCustomDiscountAmount === undefined && resolvedCustomDiscountPercent !== undefined) {
    resolvedCustomDiscountAmount = (Math.abs(baseSubtotal) * resolvedCustomDiscountPercent) / 100;
  }

  let discountAmount = saleDiscountAmount;
  if (resolvedCustomDiscountAmount !== undefined) {
    discountAmount += resolvedCustomDiscountAmount;
  }

  discountAmount = Math.min(Math.max(discountAmount, 0), Math.abs(baseSubtotal));
  const signedDiscount = baseSubtotal < 0 ? -discountAmount : discountAmount;
  const discountedSubtotal = baseSubtotal - signedDiscount;

  const providedLineTax = parseNumeric(line.lineTax);
  const computedLineTax =
    discountAmount > 0 ? Number((Math.max(discountedSubtotal, 0) * LINE_TAX_RATE).toFixed(2)) : 0;
  const finalLineTax = providedLineTax ?? computedLineTax;

  // Only use providedTotal if initialTotal is set or if total is a non-zero value
  // This allows passing total: 0 to force recalculation
  const providedTotal = parseNumeric(line.initialTotal);
  const finalTotal = (providedTotal !== undefined && providedTotal !== 0) ? providedTotal : discountedSubtotal;

  return {
    ...line,
    discount: discountAmount,
    lineDiscount:
      line.lineDiscount !== undefined ? line.lineDiscount : saleDiscountAmount,
    customDiscountAmount:
      line.customDiscountAmount !== undefined
        ? line.customDiscountAmount
        : resolvedCustomDiscountAmount,
    customDiscountPercent:
      line.customDiscountPercent !== undefined
        ? line.customDiscountPercent
        : resolvedCustomDiscountPercent,
    lineTax: finalLineTax,
    total: finalTotal,
    initialTotal: undefined,
  };
};

export type CartContextValue = {
  items: LineItem[];
  addItem: (item: Omit<LineItem, 'id' | 'total'> & { id?: string }, showToast?: (message: string, type: 'success' | 'error' | 'info') => void) => void;
  setItemQuantity: (id: string, quantity: number, showToast?: (message: string, type: 'success' | 'error' | 'info') => void) => void;
  updateItem: (id: string, patch: Partial<LineItem>) => void;
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
      
      // Prefer id match, otherwise fallback to productVariantId, productId, or name match
      const index = prev.findIndex(li =>
        (item.id && li.id === item.id) ||
        (!item.id && item.productVariantId && li.productVariantId === item.productVariantId) ||
        (!item.id && !item.productVariantId && li.productId === item.productId) ||
        (!item.id && !item.productVariantId && !item.productId && li.name === item.name)
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
        updated[index] = recalcLineTotals({
          ...existing,
          quantity: existing.quantity + maxAllowed,
          price: existing.price, // keep existing price
          availableQuantity: availableQty, // Update available quantity
        });
          return updated;
        }
        
      updated[index] = recalcLineTotals({
        ...existing,
        quantity: newQuantity,
        price: existing.price, // keep existing price
        availableQuantity: availableQty, // Update available quantity
        salesPersonId: existing.salesPersonId || (item as any).salesPersonId, // Preserve salesperson
        isReturn: existing.isReturn || (item as any).isReturn || false, // Preserve return flag
      });
        return updated;
      }

      // Check if quantity exceeds available stock for new item
      // If availableQty is 0, don't add the item at all
      if (availableQty === 0) {
        showToast?.('Item is out of stock. Cannot add to cart.', 'error');
        return prev;
      }
      if (availableQty !== Infinity && qtyToAdd > availableQty) {
        showToast?.(`Only ${availableQty} item(s) available in stock. Added ${availableQty} instead.`, 'info');
        const id = item.id ?? Math.random().toString(36).slice(2, 9);
        return [...prev, recalcLineTotals({
          id,
          name: item.name,
          price,
          quantity: availableQty,
          productId: item.productId,
          productVariantId: item.productVariantId,
          salesPersonId: (item as any).salesPersonId, // Preserve salesperson
          availableQuantity: availableQty,
          // Preserve discount information
          lineDiscount: item.lineDiscount,
          lineDiscountType: item.lineDiscountType,
          lineDiscountValue: item.lineDiscountValue,
          lineDiscountPercent: item.lineDiscountPercent,
          customDiscountAmount: item.customDiscountAmount,
          customDiscountPercent: item.customDiscountPercent,
          lineTax: item.lineTax,
          total: 0, // Pass 0 to force recalcLineTotals to calculate from price * quantity
        } as LineItem)];
      }

      const id = item.id ?? Math.random().toString(36).slice(2, 9);
      return [...prev, recalcLineTotals({
        id,
        name: item.name,
        price,
        quantity: qtyToAdd,
        productId: item.productId,
        productVariantId: item.productVariantId,
        salesPersonId: (item as any).salesPersonId, // Preserve salesperson
        availableQuantity: availableQty,
        isReturn: (item as any).isReturn || false, // Preserve return flag
        // Preserve discount information
        lineDiscount: item.lineDiscount,
        lineDiscountType: item.lineDiscountType,
        lineDiscountValue: item.lineDiscountValue,
        lineDiscountPercent: item.lineDiscountPercent,
        customDiscountAmount: item.customDiscountAmount,
        customDiscountPercent: item.customDiscountPercent,
        lineTax: item.lineTax,
        total: 0, // Pass 0 to force recalcLineTotals to calculate from price * quantity
      } as LineItem)];
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
        li.id === id ? recalcLineTotals({ ...li, quantity }) : li
      );
    });
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<LineItem>) => {
    setItems(prev =>
      prev.map(li =>
        li.id === id ? recalcLineTotals({ ...li, ...patch }) : li
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(li => li.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => ({ items, addItem, setItemQuantity, updateItem, removeItem, clear }), [items, addItem, setItemQuantity, updateItem, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}


