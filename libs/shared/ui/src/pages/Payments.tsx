import React, { useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CompactPaymentPanel,
  type Payment as PaymentEntry,
  type PaymentMethod as PaymentPanelMethod,
  useCart,
  useToast,
  usePrintReceipt,
  PrintConfirmationDialog,
} from '../index.js';
import type { SalesOrderRepository, ParkedOrderRepository, PaymentMethodRepository } from '@monorepo/shared-data-access';
import { useCurrency } from '@monorepo/shared-hooks-currency';

// Simple fallback methods – in a real app these would come from the repo
const FALLBACK_PAYMENT_METHODS: PaymentPanelMethod[] = [
  {
    id: 'cash',
    code: 'CASH',
    name: 'Cash',
    type: 'Cash',
    isActive: true,
  },
  {
    id: 'card',
    code: 'CARD',
    name: 'Card',
    type: 'Card',
    isActive: true,
  },
];

const DEFAULT_TAX_RATE = 0.03;
const PAYMENT_TOLERANCE = 0.01;

export interface PaymentsProps {
  salesOrderRepo?: SalesOrderRepository;
  parkedOrderRepo?: ParkedOrderRepository;
  paymentMethodRepo?: PaymentMethodRepository;
  currentUserId?: string;
  currentLocationId?: string;
}

export function Payments({
  salesOrderRepo,
  parkedOrderRepo,
  paymentMethodRepo,
  currentUserId = '1',
  currentLocationId = '1',
}: PaymentsProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = useCallback(
    (amount: number) => formatAmount(amount),
    [formatAmount],
  );

  // Print receipt hook
  const {
    showPrintDialog,
    isPrinting,
    receiptData,
    promptPrintReceipt,
    confirmPrint: originalConfirmPrint,
    cancelPrint: originalCancelPrint,
    skipPrint: originalSkipPrint,
  } = usePrintReceipt({
    storeName: 'AL IMRAN BOUTIQUE',
    storeNameArabic: 'العمران',
    storeUrl: 'http://www.alimranboutique.com',
    posNumber: 'ALIMRAN BOUTIQUE',
    onPrintSuccess: () => {
      // console.log('[Payments] Receipt printed successfully');
    },
    onPrintError: (error) => {
      // console.error('[Payments] Print error:', error);
      const errorMessage = error.message || String(error);
      if (errorMessage.toLowerCase().includes('printer missing')) {
        show('Printer Missing: Please connect a printer to your device and try again.', 'error');
      } else {
        show('Failed to print receipt: ' + errorMessage, 'error');
      }
    },
  });

  const search = new URLSearchParams(location.search);
  const modeParam = search.get('mode');
  const mode = modeParam === 'card' ? 'card' : modeParam === 'cash' ? 'cash' : null;

  // Get order data from navigation state (passed from Transactions page)
  const navigationState = location.state as {
    orderTotal?: number;
    lineItems?: any[];
    discount?: any;
    giftCard?: any;
    adjustment?: any;
    subtotal?: number;
    discountValue?: number;
    giftCardValue?: number;
    adjustmentValue?: number;
    taxValue?: number;
    payments?: PaymentEntry[];
    orderId?: string;
    salesPersonId?: string;
    customerId?: string;
    parkedOrderId?: string;
  } | null;

  const { items: cartItems, removeItem } = useCart();

  // Use navigation state if available, otherwise fall back to cart
  const lineItems = navigationState?.lineItems || cartItems;

  // Calculate order breakdown
  const orderBreakdown = useMemo(() => {
    if (navigationState?.orderTotal !== undefined) {
      // Use values from navigation state if available
      return {
        subtotal: navigationState.subtotal ?? 0,
        discountValue: navigationState.discountValue ?? 0,
        giftCardValue: navigationState.giftCardValue ?? 0,
        adjustmentValue: navigationState.adjustmentValue ?? 0,
        taxValue: navigationState.taxValue ?? 0,
        total: navigationState.orderTotal,
      };
    }
    // Fallback calculation if no navigation state
    const subtotal = lineItems.reduce(
      (sum, li) => sum + Number(li.price ?? 0) * Number(li.quantity ?? 1),
      0
    );
    const taxValue = Number((subtotal * DEFAULT_TAX_RATE).toFixed(2));
    const total = Number((subtotal + taxValue).toFixed(2));
    return {
      subtotal,
      discountValue: 0,
      giftCardValue: 0,
      adjustmentValue: 0,
      taxValue,
      total,
    };
  }, [navigationState, lineItems]);

  const orderTotal = orderBreakdown.total;

  // Generate a unique session key based on order data
  const sessionKey = useMemo(() => {
    const itemIds = lineItems.map((item: any) => item.id).sort().join(',');
    return `payment-session-${itemIds}-${orderTotal}`;
  }, [lineItems, orderTotal]);

  // Handler to navigate back to transactions and clear state
  const handleReturnToTransactions = useCallback(() => {
    if (completedOrderRef.current) {
      const { orderNumber, lineItems: completedLineItems } = completedOrderRef.current;
      
      // Clear session storage if not already cleared
      try {
        sessionStorage.removeItem(sessionKey);
      } catch (error) {
        // console.error('[Payments] Failed to clear session storage:', error);
      }

      // Clear cart items AFTER print dialog is handled
      // Use the current lineItems from state (which might be from navigationState or cart)
      const itemsToClear = completedLineItems || lineItems;
      if (itemsToClear && itemsToClear.length > 0) {
        itemsToClear.forEach((item: any) => {
          try {
            if (item.id) {
              removeItem(item.id);
            }
          } catch (error) {
            // Ignore errors if item already removed
          }
        });
      }

      // Navigate back to transactions
      navigate('/transactions', {
        state: {
          orderCompleted: true,
          orderNumber,
        },
      });

      // Reset ref
      completedOrderRef.current = null;
    }
  }, [navigate, sessionKey, removeItem, lineItems]);

  // Wrapper for confirm print - navigate after printing
  const confirmPrint = useCallback(async () => {
    await originalConfirmPrint();
    // Navigate after print is complete
    handleReturnToTransactions();
  }, [originalConfirmPrint, handleReturnToTransactions]);

  // Wrapper for cancel print - navigate immediately
  const cancelPrint = useCallback(() => {
    originalCancelPrint();
    handleReturnToTransactions();
  }, [originalCancelPrint, handleReturnToTransactions]);

  // Wrapper for skip print - navigate immediately
  const skipPrint = useCallback(() => {
    originalSkipPrint();
    handleReturnToTransactions();
  }, [originalSkipPrint, handleReturnToTransactions]);

  // Load payment state from sessionStorage
  const loadPaymentState = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(sessionKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.payments || [];
      }
    } catch (error) {
      console.error('[Payments] Failed to load payment state:', error);
    }
    return navigationState?.payments || [];
  }, [sessionKey, navigationState]);

  // Initialize payments from sessionStorage or navigation state
  const [payments, setPayments] = useState<PaymentEntry[]>(() => loadPaymentState());
  const [isProcessing, setIsProcessing] = useState(false);
  const orderCreatedRef = React.useRef(false);
  const completedOrderRef = React.useRef<{ orderNumber: string; lineItems: any[] } | null>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentPanelMethod[]>(FALLBACK_PAYMENT_METHODS);
  const [isPaymentMethodsLoading, setIsPaymentMethodsLoading] = useState(false);

  // Load payment methods from repository
  React.useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!paymentMethodRepo) {
        setAvailablePaymentMethods(FALLBACK_PAYMENT_METHODS);
        return;
      }

      setIsPaymentMethodsLoading(true);
      try {
        const result = await paymentMethodRepo.getPaymentMethods({ isActive: true });
        if (result.success && result.paymentMethods && result.paymentMethods.length > 0) {
          setAvailablePaymentMethods(
            result.paymentMethods.map((method) => ({
              id: method.id, // Use actual UUID from database
              code: method.code,
              name: method.name,
              type: method.type,
              isActive: method.isActive,
              icon: method.icon,
            }))
          );
        } else {
          setAvailablePaymentMethods(FALLBACK_PAYMENT_METHODS);
        }
      } catch (error) {
        console.error('[Payments] Failed to load payment methods:', error);
        setAvailablePaymentMethods(FALLBACK_PAYMENT_METHODS);
      } finally {
        setIsPaymentMethodsLoading(false);
      }
    };

    loadPaymentMethods();
  }, [paymentMethodRepo]);

  // Save payment state to sessionStorage whenever it changes
  React.useEffect(() => {
    try {
      sessionStorage.setItem(
        sessionKey,
        JSON.stringify({
          payments,
        })
      );
    } catch (error) {
      console.error('[Payments] Failed to save payment state:', error);
    }
  }, [payments, sessionKey]);

  const amountPaid = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );

  const amountDue = orderTotal - amountPaid;
  const changeDue = Math.max(0, amountPaid - orderTotal);

  const handleAddPayment = useCallback(async (payment: Omit<PaymentEntry, 'id'>) => {
    if (isProcessing) return;

    // Add the payment locally first
    const newPayment = {
      ...payment,
      id: Math.random().toString(36).slice(2, 9),
    };

    setPayments((prev) => [...prev, newPayment]);

    // Calculate new amounts
    const newAmountPaid = amountPaid + payment.amount;
    const newAmountDue = orderTotal - newAmountPaid;

    const withinTolerance = Math.abs(newAmountDue) <= PAYMENT_TOLERANCE;

    show(
      `Payment of ${formatCurrency(payment.amount)} added. ${
        newAmountDue > PAYMENT_TOLERANCE
          ? `Remaining: ${formatCurrency(newAmountDue)}`
          : newAmountDue < -PAYMENT_TOLERANCE
          ? `Change: ${formatCurrency(Math.abs(newAmountDue))}`
          : withinTolerance
          ? 'Order fully paid!'
          : `Remaining: ${formatCurrency(newAmountDue)}`
      }`,
      'success'
    );
  }, [
    isProcessing,
    amountPaid,
    orderTotal,
    show,
    formatCurrency,
  ]);

  const handleRemovePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // Auto-complete order when fully paid
  React.useEffect(() => {
    if (
      payments.length > 0 &&
      amountDue <= PAYMENT_TOLERANCE &&
      !isProcessing &&
      salesOrderRepo &&
      !orderCreatedRef.current
    ) {
      // Create order completion inline to avoid dependency issues
      const completeOrder = async () => {
        // Mark as created immediately to prevent race conditions
        orderCreatedRef.current = true;
        setIsProcessing(true);
        try {
          const paymentInputs = payments.map((p) => ({
            paymentMethodId: p.paymentMethodId,
            amount: p.amount,
            transactionId: p.transactionId,
            authorizationCode: p.authorizationCode,
            cardLast4: p.cardLast4,
            cardBrand: p.cardBrand,
          }));

          // Create the order with all payments in one step
          const orderInput = {
            locationId: currentLocationId,
            cashierId: currentUserId,
            salesPersonId: navigationState?.salesPersonId || currentUserId,
            customerId: navigationState?.customerId,
            lineItems: lineItems.map((item: any) => {
              const baseQuantity = Number(item.quantity ?? 1);
              const unitPrice = Math.abs(Number(item.price ?? 0));
              return {
                variantId: item.productId || item.id,
                salesPersonId: navigationState?.salesPersonId || currentUserId,
                quantity: item.isReturn ? -Math.abs(baseQuantity) : baseQuantity,
                unitPrice,
              };
            }),
            payments: paymentInputs,
            orderLevelDiscount: navigationState?.discount
              ? navigationState.discount.type === 'percent'
                ? { percent: navigationState.discount.value }
                : { amount: navigationState.discount.value }
              : undefined,
            adjustment: navigationState?.adjustment
              ? { amount: navigationState.adjustment.amount, reason: navigationState.adjustment.reason }
              : undefined,
            giftCardNumber: navigationState?.giftCard?.cardNumber,
            notes: undefined,
            customerNotes: undefined,
          };

          console.log('[Payments] Creating order with data:', {
            lineItemsCount: orderInput.lineItems.length,
            paymentsCount: orderInput.payments.length,
            locationId: orderInput.locationId,
            cashierId: orderInput.cashierId,
          });
          const result = await salesOrderRepo.createOrder(orderInput);
          console.log('[Payments] Order creation result:', {
            success: result.success,
            hasOrder: !!result.order,
            orderNumber: result.order?.orderNumber,
            error: result.error,
            isOffline: result.isOffline,
          });

          if (result.success && result.order) {
            const orderNumber = result.order.orderNumber;
            const invoiceNumber = (result.order as any).invoiceNumber || result.order.orderNumber || result.order.id;
            // console.log('[Payments] Order completed successfully:', orderNumber);
            show(`Order completed! Order #: ${orderNumber}`, 'success');

            // Complete parked order if this was a resumed order
            if (navigationState?.parkedOrderId && parkedOrderRepo) {
              try {
                await parkedOrderRepo.completeParkedOrder(navigationState.parkedOrderId);
                // console.log('[Payments] Parked order completed:', navigationState.parkedOrderId);
              } catch (error) {
                // console.error('[Payments] Failed to complete parked order:', error);
              }
            }

            // Calculate receipt totals
            const grossTotal = orderBreakdown.subtotal;
            const itemDiscount = orderBreakdown.discountValue;
            const netTotal = orderTotal;
            const tendered = amountPaid;
            const change = changeDue;

            // Convert line items to receipt format
            // The receipt template expects LineItem with productName, variantName, sku
            // We'll map cart items to match this structure
            const receiptLineItems = lineItems.map((item: any) => {
              // Extract product name from item name
              const productName = item.name || 'Item';
              const variantName = item.variantName || '';
              const sku = item.sku || item.barcode || item.productVariantId || '';
              const quantity = item.quantity || 1;
              const unitPrice = Number(item.price || 0);
              const discount = item.discount || 0;
              const lineSubtotal = unitPrice * quantity;
              const lineTotal = lineSubtotal - discount;

              return {
                id: item.id || item.productId || Math.random().toString(),
                variantId: item.productVariantId || item.productId || item.id || '',
                variant: item.variant ? {
                  id: item.variant.id || '',
                  sku: sku,
                  variantName: variantName,
                  product: item.variant.product ? {
                    id: item.variant.product.id || '',
                    name: productName,
                  } : undefined,
                } : undefined,
                salesPersonId: navigationState?.salesPersonId || currentUserId,
                quantity: quantity,
                unitPrice: unitPrice,
                saleDiscount: discount > 0 ? { amount: discount } : undefined,
                customDiscount: undefined,
                lineSubtotal: lineSubtotal,
                lineDiscount: discount,
                lineTotal: lineTotal,
                // Add extended properties for receipt template
                productName: productName,
                variantName: variantName,
                sku: sku,
              } as any; // Type assertion needed because LineItem doesn't officially have these properties
            });

            // Convert payments to receipt format
            const receiptPayments = payments.map((payment) => ({
              id: payment.id,
              paymentMethodId: payment.paymentMethodId,
              paymentMethod: payment.paymentMethod || {
                id: payment.paymentMethodId,
                code: 'CASH',
                name: 'Cash',
                type: 'Cash' as const,
                isActive: true,
              },
              amount: payment.amount,
              cardLast4: payment.cardLast4,
              cardBrand: payment.cardBrand,
              authorizationCode: payment.authorizationCode,
              transactionId: payment.transactionId,
            }));

            // Store order info for navigation after print dialog
            completedOrderRef.current = {
              orderNumber,
              lineItems,
            };

            // Show print confirmation dialog
            // Cart will be cleared after print dialog is handled
            // Navigation will happen after user interacts with the dialog
            promptPrintReceipt({
              invoiceNumber,
              lineItems: receiptLineItems,
              payments: receiptPayments,
              customer: navigationState?.customerId ? {
                id: navigationState.customerId,
                firstName: '',
                lastName: '',
                email: undefined,
                phone: undefined,
              } : undefined,
              cashier: currentUserId,
              grossTotal,
              itemDiscount,
              netTotal,
              tendered,
              change,
            });
          } else {
            console.error('[Payments] Order creation failed:', result.error);
            show(result.error || 'Failed to complete order', 'error');
            // Reset flag on failure so user can retry
            orderCreatedRef.current = false;
          }
        } catch (error: any) {
          console.error('[Payments] Failed to complete order:', error);
          show(error.message || 'Failed to complete order', 'error');
          // Reset flag on error so user can retry
          orderCreatedRef.current = false;
        } finally {
          setIsProcessing(false);
        }
      };

      completeOrder();
    }
  }, [
    payments.length,
    amountDue,
    isProcessing,
    salesOrderRepo,
    parkedOrderRepo,
    currentLocationId,
    currentUserId,
    navigationState,
    lineItems,
    show,
    removeItem,
    navigate,
    sessionKey,
    payments,
  ]);

  return (
    <div className="h-[calc(100vh-var(--navbar-height,71px))] w-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Payment Panel */}
      <div className="flex-1 flex justify-center px-4 py-4 overflow-hidden">
        <div className="w-full max-w-6xl h-full overflow-auto">
          <CompactPaymentPanel
            payments={payments}
            paymentMethods={availablePaymentMethods}
            totalAmount={orderTotal}
            amountPaid={amountPaid}
            amountDue={amountDue}
            onAddPayment={handleAddPayment}
            onRemovePayment={handleRemovePayment}
            mode={mode}
            disabled={isProcessing || isPaymentMethodsLoading}
          />
        </div>
      </div>

      {/* Print Confirmation Dialog */}
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
    </div>
  );
}
