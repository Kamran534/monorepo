import React, { useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CompactPaymentPanel,
  type Payment as PaymentEntry,
  type PaymentMethod as PaymentPanelMethod,
  useCart,
  useToast,
} from '../index.js';
import type { SalesOrderRepository, ParkedOrderRepository } from '@monorepo/shared-data-access';
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
  currentUserId?: string;
  currentLocationId?: string;
}

export function Payments({
  salesOrderRepo,
  parkedOrderRepo,
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

          const result = await salesOrderRepo.createOrder(orderInput);

          if (result.success) {
            show('Order completed successfully!', 'success');

            // Complete parked order if this was a resumed order
            if (navigationState?.parkedOrderId && parkedOrderRepo) {
              try {
                await parkedOrderRepo.completeParkedOrder(navigationState.parkedOrderId);
                console.log('[Payments] Parked order completed:', navigationState.parkedOrderId);
              } catch (error) {
                console.error('[Payments] Failed to complete parked order:', error);
              }
            }

            // Clear session storage
            try {
              sessionStorage.removeItem(sessionKey);
            } catch (error) {
              console.error('[Payments] Failed to clear session storage:', error);
            }

            // Clear cart items
            lineItems.forEach((item: any) => removeItem(item.id));

            // Navigate back to transactions
            setTimeout(() => {
              navigate('/transactions');
            }, 1000);
          } else {
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
            paymentMethods={FALLBACK_PAYMENT_METHODS}
            totalAmount={orderTotal}
            amountPaid={amountPaid}
            amountDue={amountDue}
            onAddPayment={handleAddPayment}
            onRemovePayment={handleRemovePayment}
            mode={mode}
            disabled={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}
