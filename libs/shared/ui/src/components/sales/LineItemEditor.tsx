import React, { useState } from 'react';
import { Trash2, Plus, Minus, User, Percent, DollarSign } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';

export interface SalesPerson {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  variantName: string;
  product?: {
    id: string;
    name: string;
  };
}

export interface LineItem {
  id: string;
  name?: string; // Product name
  variantId: string;
  variant?: ProductVariant;
  salesPersonId?: string;
  salesPerson?: SalesPerson;
  quantity: number;
  unitPrice: number;
  saleDiscount?: {
    amount?: number;
    percent?: number;
  };
  customDiscount?: {
    amount?: number;
    percent?: number;
  };
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
}

export interface LineItemEditorProps extends ComponentProps {
  lineItems: LineItem[];
  salesPersons: SalesPerson[];
  onUpdateLineItem: (id: string, updates: Partial<LineItem>) => void;
  onRemoveLineItem: (id: string) => void;
  disabled?: boolean;
}

/**
 * LineItemEditor Component
 *
 * Manages sales order line items with quantity, sales person assignment,
 * and line-level discounts (sale discount and custom discount)
 */
export function LineItemEditor({
  lineItems,
  salesPersons,
  onUpdateLineItem,
  onRemoveLineItem,
  disabled = false,
  className = '',
}: LineItemEditorProps) {
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = React.useCallback((amount: number) => formatAmount(amount), [formatAmount]);

  const handleQuantityChange = (lineId: string, delta: number) => {
    const lineItem = lineItems.find(l => l.id === lineId);
    if (!lineItem) return;

    const newQuantity = Math.max(1, lineItem.quantity + delta);
    onUpdateLineItem(lineId, { quantity: newQuantity });
  };

  const handleSalesPersonChange = (lineId: string, salesPersonId: string) => {
    onUpdateLineItem(lineId, { salesPersonId: salesPersonId || undefined });
  };

  const handleSaleDiscountChange = (lineId: string, type: 'amount' | 'percent', value: string) => {
    const lineItem = lineItems.find(l => l.id === lineId);
    if (!lineItem) return;

    const numValue = parseFloat(value) || 0;
    const saleDiscount = { ...lineItem.saleDiscount };

    if (type === 'amount') {
      saleDiscount.amount = numValue;
      saleDiscount.percent = undefined;
    } else {
      saleDiscount.percent = Math.min(100, Math.max(0, numValue));
      saleDiscount.amount = undefined;
    }

    onUpdateLineItem(lineId, { saleDiscount });
  };

  const handleCustomDiscountChange = (lineId: string, type: 'amount' | 'percent', value: string) => {
    const lineItem = lineItems.find(l => l.id === lineId);
    if (!lineItem) return;

    const numValue = parseFloat(value) || 0;
    const customDiscount = { ...lineItem.customDiscount };

    if (type === 'amount') {
      customDiscount.amount = numValue;
      customDiscount.percent = undefined;
    } else {
      customDiscount.percent = Math.min(100, Math.max(0, numValue));
      customDiscount.amount = undefined;
    }

    onUpdateLineItem(lineId, { customDiscount });
  };

  if (lineItems.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          No items added yet. Add products to create a sales order.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div
        className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium border-b"
        style={{
          color: 'var(--color-text-secondary)',
          borderColor: 'var(--color-border-light)',
        }}
      >
        <div className="col-span-4">Product</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-right">Discount</div>
        <div className="col-span-2 text-right">Total</div>
      </div>

      {/* Line Items */}
      <div className="space-y-0">
        {lineItems.map((lineItem) => {
          const isExpanded = expandedLineId === lineItem.id;

          return (
            <div
              key={lineItem.id}
              className="border-b"
              style={{ borderColor: 'var(--color-border-light)' }}
            >
              {/* Main Row */}
              <div
                className="grid grid-cols-12 gap-2 px-3 py-3 items-center cursor-pointer hover:bg-opacity-50"
                style={{ backgroundColor: isExpanded ? 'var(--color-bg-secondary)' : 'transparent' }}
                onClick={() => setExpandedLineId(isExpanded ? null : lineItem.id)}
              >
                {/* Product Info */}
                <div className="col-span-4">
                  <div
                    className="font-medium text-sm truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {lineItem.name || lineItem.variant?.product?.name || 'Unknown Product'}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {lineItem.variant?.variantName} • {lineItem.variant?.sku}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="col-span-2 flex items-center justify-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuantityChange(lineItem.id, -1);
                    }}
                    disabled={disabled || lineItem.quantity <= 1}
                    className="p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span
                    className="text-sm font-medium min-w-[30px] text-center"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {lineItem.quantity}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuantityChange(lineItem.id, 1);
                    }}
                    disabled={disabled}
                    className="p-1 rounded transition-colors disabled:opacity-30"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Unit Price */}
                <div
                  className="col-span-2 text-right text-sm"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatCurrency(lineItem.unitPrice)}
                </div>

                {/* Discount */}
                <div
                  className="col-span-2 text-right text-sm"
                  style={{ color: lineItem.lineDiscount > 0 ? 'var(--color-error)' : 'var(--color-text-secondary)' }}
                >
                  {lineItem.lineDiscount > 0 ? `-${formatCurrency(lineItem.lineDiscount)}` : '-'}
                </div>

                {/* Line Total */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {formatCurrency(lineItem.lineTotal)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveLineItem(lineItem.id);
                    }}
                    disabled={disabled}
                    className="p-1 rounded transition-colors disabled:opacity-30"
                    style={{ color: 'var(--color-error)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div
                  className="px-3 pb-3 pt-2 space-y-3"
                  style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Sales Person */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Sales Person
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                        style={{ color: 'var(--color-text-secondary)' }}
                      />
                      <select
                        value={lineItem.salesPersonId || ''}
                        onChange={(e) => handleSalesPersonChange(lineItem.id, e.target.value)}
                        disabled={disabled}
                        className="w-full pl-10 pr-3 py-2 rounded border text-sm disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--color-bg-primary)',
                          color: 'var(--color-text-primary)',
                          borderColor: 'var(--color-border-light)',
                        }}
                      >
                        <option value="">No sales person</option>
                        {salesPersons.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.firstName} {sp.lastName} ({sp.username})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sale Discount */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Sale Discount
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Amount */}
                      <div className="relative">
                        <DollarSign
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                          style={{ color: 'var(--color-text-secondary)' }}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={lineItem.saleDiscount?.amount || ''}
                          onChange={(e) => handleSaleDiscountChange(lineItem.id, 'amount', e.target.value)}
                          disabled={disabled || !!lineItem.saleDiscount?.percent}
                          placeholder="Amount"
                          className="w-full pl-10 pr-3 py-2 rounded border text-sm disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                            borderColor: 'var(--color-border-light)',
                          }}
                        />
                      </div>
                      {/* Percent */}
                      <div className="relative">
                        <Percent
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                          style={{ color: 'var(--color-text-secondary)' }}
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={lineItem.saleDiscount?.percent || ''}
                          onChange={(e) => handleSaleDiscountChange(lineItem.id, 'percent', e.target.value)}
                          disabled={disabled || !!lineItem.saleDiscount?.amount}
                          placeholder="Percent"
                          className="w-full pl-10 pr-3 py-2 rounded border text-sm disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                            borderColor: 'var(--color-border-light)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Discount */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Custom Discount
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Amount */}
                      <div className="relative">
                        <DollarSign
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                          style={{ color: 'var(--color-text-secondary)' }}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={lineItem.customDiscount?.amount || ''}
                          onChange={(e) => handleCustomDiscountChange(lineItem.id, 'amount', e.target.value)}
                          disabled={disabled || !!lineItem.customDiscount?.percent}
                          placeholder="Amount"
                          className="w-full pl-10 pr-3 py-2 rounded border text-sm disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                            borderColor: 'var(--color-border-light)',
                          }}
                        />
                      </div>
                      {/* Percent */}
                      <div className="relative">
                        <Percent
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                          style={{ color: 'var(--color-text-secondary)' }}
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={lineItem.customDiscount?.percent || ''}
                          onChange={(e) => handleCustomDiscountChange(lineItem.id, 'percent', e.target.value)}
                          disabled={disabled || !!lineItem.customDiscount?.amount}
                          placeholder="Percent"
                          className="w-full pl-10 pr-3 py-2 rounded border text-sm disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                            borderColor: 'var(--color-border-light)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
