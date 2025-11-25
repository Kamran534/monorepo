import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, X, Plus, Search, Archive, FolderOpen } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { CustomerSelector, Customer } from './CustomerSelector.js';
import { LineItemEditor, LineItem, SalesPerson, ProductVariant } from './LineItemEditor.js';
import { DiscountPanel, OrderDiscount } from './DiscountPanel.js';
import { CouponCodeInput, CouponValidation } from './CouponCodeInput.js';
import { AdjustmentPanel, OrderAdjustment } from './AdjustmentPanel.js';
import { OrderSummary, OrderTotals } from './OrderSummary.js';
import { PaymentPanel, PaymentMethod, Payment } from './PaymentPanel.js';
import { ParkedOrderSearch } from './ParkedOrderSearch.js';
import { ConfirmationModal, useToast } from '@monorepo/shared-ui';
import { useCurrency } from '@monorepo/shared-hooks-currency';
import { usePrintReceipt } from './usePrintReceipt.js';
import { PrintConfirmationDialog } from './PrintConfirmationDialog.js';
import type { ParkedOrderListItem } from '@monorepo/shared-data-access';

export interface CreateSalesOrderInput {
  customerId?: string;
  lineItems: LineItem[];
  payments: Payment[];
  orderLevelDiscount?: OrderDiscount;
  couponCode?: string;
  adjustment?: OrderAdjustment;
  notes?: string;
}

export interface CreateSalesOrderResult {
  success: boolean;
  order?: {
    id: string;
    orderNumber?: string;
    invoiceNumber?: string;
  };
  error?: string;
}

export interface SalesOrderFormProps extends ComponentProps {
  // Data
  customers: Customer[];
  salesPersons: SalesPerson[];
  products: ProductVariant[];
  paymentMethods: PaymentMethod[];

  // State
  loading?: boolean;
  creating?: boolean;
  validatingCoupon?: boolean;
  couponValidation: CouponValidation | null;

  // Parked orders
  parkedOrders?: ParkedOrderListItem[];
  loadingParkedOrders?: boolean;

  // Callbacks
  onCreateOrder: (data: CreateSalesOrderInput) => Promise<CreateSalesOrderResult | void> | void;
  onCancel?: () => void;
  onCreateCustomer: () => void;
  onValidateCoupon: (code: string, customerId?: string) => void;
  onClearCoupon: () => void;
  onAddProduct: () => void;

  // Parked order callbacks
  onParkOrder?: (data: CreateSalesOrderInput) => void;
  onSearchParkedOrders?: (searchTerm: string) => void;
  onLoadParkedOrder?: (parkedOrderId: string, orderId: string, order?: ParkedOrderListItem) => void;
  onDeleteParkedOrder?: (parkedOrderId: string) => void;

  // Print receipt configuration (optional)
  enablePrintReceipt?: boolean;
  storeName?: string;
  storeNameArabic?: string;
  storeUrl?: string;
  posNumber?: string;
  currentCashier?: string;

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
  paymentMethods,
  loading = false,
  creating = false,
  validatingCoupon = false,
  couponValidation,
  parkedOrders = [],
  loadingParkedOrders = false,
  onCreateOrder,
  onCancel,
  onCreateCustomer,
  onValidateCoupon,
  onClearCoupon,
  onAddProduct,
  onParkOrder,
  onSearchParkedOrders,
  onLoadParkedOrder,
  onDeleteParkedOrder,
  enablePrintReceipt = true,
  storeName = 'AL IMRAN BOUTIQUE',
  storeNameArabic = 'العمران',
  storeUrl = 'http://www.alimranboutique.com',
  posNumber = 'ALIMRAN BOUTIQUE',
  currentCashier,
  taxRate = 0,
  disabled = false,
  className = '',
}: SalesOrderFormProps) {
  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<OrderDiscount>({});
  const [couponCode, setCouponCode] = useState('');
  const [adjustment, setAdjustment] = useState<OrderAdjustment>({
    amount: 0,
    reason: undefined,
  });
  const [notes, setNotes] = useState('');

  // Parked order state
  const [showParkedOrderModal, setShowParkedOrderModal] = useState(false);
  const [currentParkedOrderId, setCurrentParkedOrderId] = useState<string | null>(null);
  const [showParkConfirm, setShowParkConfirm] = useState(false);
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const { show } = useToast();

  // Print receipt hook
  const {
    showPrintDialog,
    isPrinting,
    receiptData,
    promptPrintReceipt,
    confirmPrint,
    cancelPrint,
    skipPrint,
  } = usePrintReceipt({
    storeName,
    storeNameArabic,
    storeUrl,
    posNumber,
    onPrintSuccess: () => {
      console.log('[SalesOrderForm] Receipt printed successfully');
    },
    onPrintError: (error) => {
      console.error('[SalesOrderForm] Print error:', error);
      alert('Failed to print receipt: ' + error.message);
    },
  });

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

  const formatCurrency = useCallback((amount: number) => formatAmount(amount), [formatAmount]);

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

  // Payment handlers
  const handleAddPayment = (payment: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...payment,
      id: Math.random().toString(36).slice(2, 9),
    };
    setPayments((prev) => [...prev, newPayment]);
  };

  const handleRemovePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // Calculate payment totals
  const amountPaid = useMemo(() => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const amountDue = useMemo(() => {
    return orderTotals.totalAmount - amountPaid;
  }, [orderTotals.totalAmount, amountPaid]);

  const handleSubmit = async () => {
    if (lineItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }

    if (orderTotals.totalAmount < 0) {
      alert('Order total cannot be negative');
      return;
    }

    // Validate payments
    if (payments.length === 0) {
      alert('Please add at least one payment');
      return;
    }

    if (amountDue > 0) {
      alert(`Payment incomplete. Amount due: $${amountDue.toFixed(2)}`);
      return;
    }

    const orderData: CreateSalesOrderInput = {
      customerId: selectedCustomer?.id,
      lineItems,
      payments,
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

    // Call onCreateOrder and check if it returns a result
    const result = await onCreateOrder(orderData);

    // If print receipt is enabled and order was created successfully, show print dialog
    if (enablePrintReceipt && result && result.success && result.order) {
      // Calculate totals for receipt
      const grossTotal = orderTotals.subtotal;
      const itemDiscount =
        orderTotals.lineItemDiscount +
        orderTotals.orderDiscount +
        orderTotals.couponDiscount;
      const netTotal = orderTotals.totalAmount;
      const tendered = amountPaid;
      const change = Math.abs(Math.min(0, amountDue));

      // Show print confirmation dialog
      promptPrintReceipt({
        invoiceNumber: result.order.invoiceNumber || result.order.orderNumber || result.order.id,
        orderNumber: result.order.orderNumber || result.order.invoiceNumber || result.order.id,
        orderId: result.order.id,
        lineItems: lineItems,
        payments: payments,
        customer: selectedCustomer || undefined,
        cashier: currentCashier,
        grossTotal,
        itemDiscount,
        taxAmount: orderTotals.taxAmount,
        adjustmentAmount: adjustment.amount || 0,
        netTotal,
        tendered,
        change,
      });

      // Reset form after showing print dialog
      setTimeout(() => {
        handleReset();
      }, 500);
    }
  };

  const handleReset = () => {
    setSelectedCustomer(null);
    setLineItems([]);
    setPayments([]);
    setOrderDiscount({});
    setCouponCode('');
    setAdjustment({ amount: 0, reason: undefined });
    setNotes('');
    setCurrentParkedOrderId(null);
    onClearCoupon();
  };

  // Parked order handlers
  const handleParkOrder = () => {
    if (lineItems.length === 0) {
      alert('Please add at least one item to park the order');
      return;
    }

    if (!onParkOrder) {
      alert('Park order functionality is not available');
      return;
    }

    const orderData: CreateSalesOrderInput = {
      customerId: selectedCustomer?.id,
      lineItems,
      payments,
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

    onParkOrder(orderData);
    handleReset();
  };

  const handleLoadParkedOrder = (parkedOrderId: string, orderId: string, order?: ParkedOrderListItem) => {
    if (onLoadParkedOrder) {
      setCurrentParkedOrderId(parkedOrderId);
      onLoadParkedOrder(parkedOrderId, orderId, order);
      setShowParkedOrderModal(false);
    }
  };

  const handleSearchParkedOrders = (searchTerm: string) => {
    if (onSearchParkedOrders) {
      onSearchParkedOrders(searchTerm);
    }
  };

  const handleDeleteParkedOrder = (parkedOrderId: string) => {
    if (onDeleteParkedOrder) {
      onDeleteParkedOrder(parkedOrderId);
    }
  };

  // Method to populate form from loaded parked order data
  const populateFormFromParkedOrder = (data: any) => {
    if (data.order) {
      const order = data.order;

      // Set customer
      if (order.customerId) {
        const customer = customers.find(c => c.id === order.customerId);
        if (customer) {
          setSelectedCustomer(customer);
        }
      }

      // Set line items from loaded data
      if (data.lineItems && data.lineItems.length > 0) {
        const loadedLineItems: LineItem[] = data.lineItems.map((item: any) => {
          const lineSubtotal = item.quantity * item.unitPrice;
          const saleDiscountAmount = item.lineDiscount || 0;
          const customDiscountAmount = item.customDiscountAmount || 0;
          const lineDiscount = saleDiscountAmount + customDiscountAmount;
          const lineTotal = Math.max(0, lineSubtotal - lineDiscount);

          return {
            id: item.id,
            variantId: item.variantId,
            sku: item.sku || '',
            productName: item.productName || '',
            variantName: item.variantName || '',
            image: item.image,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            saleDiscount: item.lineDiscountPercent
              ? { percent: item.lineDiscountPercent }
              : item.lineDiscount
              ? { amount: item.lineDiscount }
              : undefined,
            customDiscount: item.customDiscountPercent
              ? { percent: item.customDiscountPercent }
              : item.customDiscountAmount
              ? { amount: item.customDiscountAmount }
              : undefined,
            salesPersonId: item.salesPersonId,
            notes: item.notes,
            lineSubtotal,
            lineDiscount,
            lineTotal,
          };
        });
        setLineItems(loadedLineItems);
      }

      // Set payments from loaded data
      if (data.payments && data.payments.length > 0) {
        const loadedPayments: Payment[] = data.payments.map((payment: any) => ({
          id: payment.id,
          paymentMethodId: payment.paymentMethodId,
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          cardLast4: payment.cardLast4,
          cardBrand: payment.cardBrand,
          authorizationCode: payment.authorizationCode,
          transactionId: payment.transactionId,
        }));
        setPayments(loadedPayments);
      }

      // Set order-level discount
      if (order.discountAmount || order.discountPercent) {
        setOrderDiscount({
          amount: order.discountAmount || undefined,
          percent: order.discountPercent || undefined,
        });
      }

      // Set coupon code
      if (order.couponCode) {
        setCouponCode(order.couponCode);
      }

      // Set adjustment
      if (order.adjustmentAmount) {
        setAdjustment({
          amount: order.adjustmentAmount,
          reason: order.adjustmentReason,
        });
      }

      // Set notes
      if (order.notes) {
        setNotes(order.notes);
      }
    }
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

          {/* Payment Panel */}
          <PaymentPanel
            payments={payments}
            paymentMethods={paymentMethods}
            totalAmount={orderTotals.totalAmount}
            amountPaid={amountPaid}
            amountDue={amountDue}
            onAddPayment={handleAddPayment}
            onRemovePayment={handleRemovePayment}
            disabled={isFormDisabled}
          />

          {/* Action Buttons */}
          <div className="sticky bottom-0 pt-4 space-y-2">
            {/* Primary Actions */}
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

            {/* Parked Order Actions */}
            {onParkOrder && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (lineItems.length === 0) {
                      show('Add at least one line item before parking.', 'info');
                      return;
                    }
                    setShowParkConfirm(true);
                  }}
                  disabled={isFormDisabled}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor:
                      showParkConfirm || (!isFormDisabled && lineItems.length > 0)
                        ? 'var(--color-warning)'
                        : 'var(--color-warning-light, rgba(255, 186, 8, 0.6))',
                    color: 'white',
                    boxShadow:
                      !isFormDisabled && lineItems.length > 0
                        ? '0 0 0 2px rgba(255, 186, 8, 0.25)'
                        : 'none',
                  }}
                >
                  <Archive className="w-4 h-4" />
                  Park Order
                </button>
                {onSearchParkedOrders && (
                  <button
                    onClick={() => setShowParkedOrderModal(true)}
                    disabled={isFormDisabled}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                      borderColor: 'var(--color-border-light)',
                      border: '1px solid',
                    }}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Load Parked
                  </button>
                )}
              </div>
            )}

            {/* Secondary Actions */}
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

      {/* Parked Order Search Modal */}
      {onSearchParkedOrders && onLoadParkedOrder && (
        <ParkedOrderSearch
          isOpen={showParkedOrderModal}
          onClose={() => setShowParkedOrderModal(false)}
          onLoadOrder={handleLoadParkedOrder}
          onDeleteOrder={onDeleteParkedOrder}
          parkedOrders={parkedOrders}
          onSearch={handleSearchParkedOrders}
          isLoading={loadingParkedOrders}
        />
      )}

      {/* Print Confirmation Dialog */}
      {enablePrintReceipt && (
        <PrintConfirmationDialog
          isOpen={showPrintDialog}
          onConfirm={confirmPrint}
          onCancel={cancelPrint}
          onSkip={skipPrint}
          receiptData={
            receiptData
              ? {
                  storeName: receiptData.storeName,
                  invoiceNumber: receiptData.invoiceNumber,
                  totalAmount: receiptData.netTotal,
                  amountPaid: receiptData.tendered,
                  change: receiptData.change,
                }
              : undefined
          }
          isProcessing={isPrinting}
        />
      )}
    </div>
  );
}
