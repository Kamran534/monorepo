import React, { useState, useEffect, useMemo } from 'react';
import { Save, X, Plus, Search } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { CustomerSelector, Customer } from './CustomerSelector.js';
import { LineItemEditor, LineItem, SalesPerson, ProductVariant } from './LineItemEditor.js';
import { DiscountPanel, OrderDiscount } from './DiscountPanel.js';
import { CouponCodeInput, CouponValidation } from './CouponCodeInput.js';
import { AdjustmentPanel, OrderAdjustment } from './AdjustmentPanel.js';
import { OrderSummary, OrderTotals } from './OrderSummary.js';

export interface CreateSalesOrderInput {
  customerId?: string;
  lineItems: LineItem[];
  orderLevelDiscount?: OrderDiscount;
  couponCode?: string;
  adjustment?: OrderAdjustment;
  notes?: string;
}

export interface SalesOrderFormProps extends ComponentProps {
  // Data
  customers: Customer[];
  salesPersons: SalesPerson[];
  products: ProductVariant[];

  // State
  loading?: boolean;
  creating?: boolean;
  validatingCoupon?: boolean;
  couponValidation: CouponValidation | null;

  // Callbacks
  onCreateOrder: (data: CreateSalesOrderInput) => void;
  onCancel?: () => void;
  onCreateCustomer: () => void;
  onValidateCoupon: (code: string, customerId?: string) => void;
  onClearCoupon: () => void;
  onAddProduct: () => void;

  // Optional props
  taxRate?: number;
  disabled?: boolean;
}

/**
 * SalesOrderForm Component
 *
 * Main form component that orchestrates the entire sales order creation process
 * Includes customer selection, line items, discounts, coupons, adjustments, and order summary
 */
export function SalesOrderForm({
  customers,
  salesPersons,
  products,
  loading = false,
  creating = false,
  validatingCoupon = false,
  couponValidation,
  onCreateOrder,
  onCancel,
  onCreateCustomer,
  onValidateCoupon,
  onClearCoupon,
  onAddProduct,
  taxRate = 0,
  disabled = false,
  className = '',
}: SalesOrderFormProps) {
  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<OrderDiscount>({});
  const [couponCode, setCouponCode] = useState('');
  const [adjustment, setAdjustment] = useState<OrderAdjustment>({
    amount: 0,
    reason: undefined,
  });
  const [notes, setNotes] = useState('');

  // Calculate order totals
  const orderTotals = useMemo<OrderTotals>(() => {
    // Calculate subtotal from line items
    const subtotal = lineItems.reduce((sum, item) => sum + item.lineSubtotal, 0);

    // Calculate line item discounts
    const lineItemDiscount = lineItems.reduce((sum, item) => sum + item.lineDiscount, 0);

    // Calculate order-level discount
    let orderDiscountAmount = 0;
    if (orderDiscount.amount) {
      orderDiscountAmount = Math.min(orderDiscount.amount, subtotal - lineItemDiscount);
    } else if (orderDiscount.percent) {
      orderDiscountAmount = ((subtotal - lineItemDiscount) * orderDiscount.percent) / 100;
    }

    // Get coupon discount
    const couponDiscount = couponValidation?.isValid && couponValidation.discountAmount
      ? couponValidation.discountAmount
      : 0;

    // Calculate subtotal after all discounts
    const subtotalAfterDiscounts =
      subtotal - lineItemDiscount - orderDiscountAmount - couponDiscount;

    // Add adjustment
    const adjustmentAmount = adjustment.amount || 0;
    const subtotalAfterAdjustment = subtotalAfterDiscounts + adjustmentAmount;

    // Calculate tax
    const taxAmount = Math.max(0, subtotalAfterAdjustment * taxRate);

    // Calculate final total
    const totalAmount = subtotalAfterAdjustment + taxAmount;

    return {
      subtotal,
      lineItemDiscount,
      orderDiscount: orderDiscountAmount,
      couponDiscount,
      adjustmentAmount,
      taxAmount,
      totalAmount: Math.max(0, totalAmount),
    };
  }, [lineItems, orderDiscount, couponValidation, adjustment, taxRate]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleUpdateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates };

        // Recalculate line totals
        const lineSubtotal = updated.quantity * updated.unitPrice;

        let saleDiscountAmount = 0;
        if (updated.saleDiscount?.amount) {
          saleDiscountAmount = updated.saleDiscount.amount;
        } else if (updated.saleDiscount?.percent) {
          saleDiscountAmount = (lineSubtotal * updated.saleDiscount.percent) / 100;
        }

        let customDiscountAmount = 0;
        if (updated.customDiscount?.amount) {
          customDiscountAmount = updated.customDiscount.amount;
        } else if (updated.customDiscount?.percent) {
          customDiscountAmount = (lineSubtotal * updated.customDiscount.percent) / 100;
        }

        const lineDiscount = saleDiscountAmount + customDiscountAmount;
        const lineTotal = Math.max(0, lineSubtotal - lineDiscount);

        return {
          ...updated,
          lineSubtotal,
          lineDiscount,
          lineTotal,
        };
      })
    );
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = () => {
    if (lineItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }

    if (orderTotals.totalAmount < 0) {
      alert('Order total cannot be negative');
      return;
    }

    const orderData: CreateSalesOrderInput = {
      customerId: selectedCustomer?.id,
      lineItems,
      orderLevelDiscount:
        orderDiscount.amount || orderDiscount.percent ? orderDiscount : undefined,
      couponCode: couponValidation?.isValid ? couponCode : undefined,
      adjustment:
        adjustment.amount !== 0
          ? {
              amount: adjustment.amount,
              reason: adjustment.reason,
            }
          : undefined,
      notes: notes.trim() || undefined,
    };

    onCreateOrder(orderData);
  };

  const handleReset = () => {
    setSelectedCustomer(null);
    setLineItems([]);
    setOrderDiscount({});
    setCouponCode('');
    setAdjustment({ amount: 0, reason: undefined });
    setNotes('');
    onClearCoupon();
  };

  const isFormDisabled = disabled || creating || loading;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      {/* Form Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column - Main Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Customer Selection */}
          <CustomerSelector
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onCreateNewCustomer={onCreateCustomer}
            loading={loading}
            disabled={isFormDisabled}
          />

          {/* Add Product Button */}
          <div>
            <button
              onClick={onAddProduct}
              disabled={isFormDisabled}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-accent-blue)',
              }}
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Product to Order</span>
            </button>
          </div>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <div>
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Order Items
              </h3>
              <div
                className="border rounded-lg overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                <LineItemEditor
                  lineItems={lineItems}
                  salesPersons={salesPersons}
                  onUpdateLineItem={handleUpdateLineItem}
                  onRemoveLineItem={handleRemoveLineItem}
                  disabled={isFormDisabled}
                />
              </div>
            </div>
          )}

          {/* Order Notes */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Order Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isFormDisabled}
              rows={3}
              placeholder="Add any special instructions or notes for this order..."
              className="w-full px-3 py-2 rounded border text-sm resize-none disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            />
          </div>
        </div>

        {/* Right Column - Discounts & Summary */}
        <div
          className="w-96 border-l overflow-y-auto px-6 py-4 space-y-4"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border-light)',
          }}
        >
          {/* Order Summary */}
          <OrderSummary
            totals={orderTotals}
            itemCount={lineItems.length}
            showDetails={true}
          />

          {/* Order Discount */}
          <DiscountPanel
            discount={orderDiscount}
            onDiscountChange={setOrderDiscount}
            subtotal={orderTotals.subtotal - orderTotals.lineItemDiscount}
            disabled={isFormDisabled}
          />

          {/* Coupon Code */}
          <CouponCodeInput
            couponCode={couponCode}
            couponValidation={couponValidation}
            onCouponCodeChange={setCouponCode}
            onValidateCoupon={onValidateCoupon}
            onClearCoupon={onClearCoupon}
            customerId={selectedCustomer?.id}
            validating={validatingCoupon}
            disabled={isFormDisabled}
          />

          {/* Adjustment */}
          <AdjustmentPanel
            adjustment={adjustment}
            onAdjustmentChange={setAdjustment}
            disabled={isFormDisabled}
          />

          {/* Action Buttons */}
          <div className="sticky bottom-0 pt-4 space-y-2">
            <button
              onClick={handleSubmit}
              disabled={isFormDisabled || lineItems.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--color-accent-blue)',
                color: 'white',
              }}
            >
              <Save className="w-5 h-5" />
              {creating ? 'Creating Order...' : `Create Order • ${formatCurrency(orderTotals.totalAmount)}`}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleReset}
                disabled={isFormDisabled}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                Reset
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  disabled={creating}
                  className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-error)',
                    color: 'white',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
