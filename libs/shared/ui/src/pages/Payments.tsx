import React, { useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CompactPaymentPanel,
  type Payment as PaymentEntry,
  type PaymentMethod as PaymentPanelMethod,
  useCart,
  useToast,
  usePrintReceipt,
} from '../index.js';
import type { SalesOrderRepository, ParkedOrderRepository, PaymentMethodRepository } from '@monorepo/shared-data-access';
import { useCurrency } from '@monorepo/shared-hooks-currency';
import {
  useAppDispatch,
  useAppSelector,
  fetchCustomers,
  selectCustomers,
  selectCustomersLoading,
  createCustomer,
  type Customer as StoreCustomer,
} from '@monorepo/shared-store';
import { SidePanel } from '../components/SidePanel.js';
import type { Customer as ReceiptCustomer } from '../components/sales/CustomerSelector.js';
import { Phone, User, Mail, Printer, Search } from 'lucide-react';

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
const ALLOWED_PAYMENT_METHOD_KEYS = ['cash', 'card'];

type CapturedCustomer = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
};
type CompletionStep = 'phone' | 'name' | 'email' | 'summary';

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
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);
  const customersLoading = useAppSelector(selectCustomersLoading);

  // Print receipt hook
  const {
    promptPrintReceipt,
    confirmPrint: originalConfirmPrint,
  } = usePrintReceipt({
     storeName: 'Trade Unleashed',
     storeNameArabic: 'التجارة المنطلِقة',
     storeUrl: 'http://www.tradeUnleashed.com',
     posNumber: 'TRADE UNLEASHED',
    onPrintSuccess: () => {
      console.log('[Payments] Print success, navigating back to transactions');
      handleReturnToTransactions();
    },
    onPrintError: (error) => {
      console.error('[Payments] Print error:', error);
      const errorMessage = error.message || String(error);
      if (errorMessage.toLowerCase().includes('printer missing')) {
        show('Printer Missing: Please connect a printer to your device and try again.', 'error');
      } else {
        show('Failed to print receipt: ' + errorMessage, 'error');
      }
      // Still navigate back even if print fails
      console.log('[Payments] Print failed, but navigating back to transactions');
      handleReturnToTransactions();
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
    salesPersonName?: string; // Sales person name from Transactions screen
    customerId?: string;
    customer?: { // Full customer details from Transactions screen
      id?: string;
      name: string;
      email: string;
      phone: string;
      address: string;
    };
    parkedOrderId?: string;
  } | null;
  const [capturedCustomer, setCapturedCustomer] = useState<CapturedCustomer | null>(
    navigationState?.customer
      ? {
          id: navigationState.customer.id,
          name: navigationState.customer.name,
          email: navigationState.customer.email,
          phone: navigationState.customer.phone,
        }
      : navigationState?.customerId
      ? { id: navigationState.customerId }
      : null,
  );
  const [isCompletionPanelOpen, setIsCompletionPanelOpen] = useState(false);
  const [completionStep, setCompletionStep] = useState<CompletionStep>('summary');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerEmailInput, setCustomerEmailInput] = useState('');
  const [flowError, setFlowError] = useState<string | null>(null);
  const phoneKeypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', 'clear'] as const;
  const completionTitles: Record<CompletionStep, string> = {
    summary: 'Order ready to print',
    phone: 'Add customer phone',
    name: 'Customer name',
    email: 'Customer email',
  };

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
    const fallback = lineItems.reduce(
      (acc, li) => {
        const quantity = Number(li.quantity ?? 1);
        const unitPrice = Number(li.price ?? 0);
        const baseLineTotal = unitPrice * quantity;
        const lineTotal = typeof li.total === 'number' ? li.total : baseLineTotal;
        const lineDiscount = Math.max(0, baseLineTotal - lineTotal);
        acc.subtotal += lineTotal;
        acc.taxableSubtotal += baseLineTotal;
        acc.lineDiscountTotal += lineDiscount;
        return acc;
      },
      { subtotal: 0, taxableSubtotal: 0, lineDiscountTotal: 0 },
    );
    const discountValue = 0;
    const giftCardValue = 0;
    const adjustmentValue = 0;
    const taxableBase = Math.max(0, fallback.taxableSubtotal);
    const taxValue = Number((taxableBase * DEFAULT_TAX_RATE).toFixed(2));
    const total = Number((fallback.subtotal - discountValue + adjustmentValue + taxValue).toFixed(2));
    return {
      subtotal: fallback.subtotal,
      discountValue,
      giftCardValue,
      adjustmentValue,
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
    const orderData = completedOrderRef.current;
    const orderNumber = orderData?.orderNumber || 'Unknown';
    const completedLineItems = orderData?.lineItems || lineItems;
      
      // Clear session storage if not already cleared
      try {
        sessionStorage.removeItem(sessionKey);
      } catch (error) {
        // console.error('[Payments] Failed to clear session storage:', error);
      }

    // Clear cart items
    if (completedLineItems && completedLineItems.length > 0) {
      completedLineItems.forEach((item: any) => {
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
  }, [navigate, sessionKey, removeItem, lineItems]);


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
  const completionFlowStartedRef = React.useRef(false);
  const orderCreatedRef = React.useRef(false);
  const completedOrderRef = React.useRef<{ orderNumber: string; lineItems: any[] } | null>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentPanelMethod[]>(FALLBACK_PAYMENT_METHODS);
  const [isPaymentMethodsLoading, setIsPaymentMethodsLoading] = useState(false);
  
  // Refs for auto-focusing input fields
  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const summaryContainerRef = React.useRef<HTMLDivElement>(null);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState<number>(-1);

  React.useEffect(() => {
    if (customers.length > 0 || customersLoading) {
      return;
    }

    const loadCustomers = async () => {
      try {
        await dispatch(
          fetchCustomers({
            options: { useServer: true },
            forceRefresh: false,
          }),
        ).unwrap();
      } catch (error) {
        console.error('[Payments] Failed to preload customers:', error);
      }
    };

    loadCustomers();
  }, [customers.length, customersLoading, dispatch]);

  React.useEffect(() => {
    if (navigationState?.customer && !capturedCustomer) {
      setCapturedCustomer({
        id: navigationState.customer.id,
        name: navigationState.customer.name,
        email: navigationState.customer.email,
        phone: navigationState.customer.phone,
      });
    }
  }, [navigationState, capturedCustomer]);

  // Normalize repo methods down to our Cash/Card requirement
  const selectAllowedPaymentMethods = useCallback(
    (methods: any[] = []): PaymentPanelMethod[] => {
      const filtered = methods
        .filter((method) => {
          const keyCandidates = [
            method?.type,
            method?.code,
            method?.name,
          ]
            .filter(Boolean)
            .map((value) => value.toLowerCase());

          return keyCandidates.some((value) =>
            ALLOWED_PAYMENT_METHOD_KEYS.some((key) => value.includes(key)),
          );
        })
        .map((method) => ({
          id: method.id || method.code || method.name,
          code: method.code || method.type || method.name,
          name: method.name,
          type: method.type,
          isActive: method.isActive ?? true,
          icon: method.icon,
        }));

      if (filtered.length === 0) {
        return FALLBACK_PAYMENT_METHODS;
      }

      // Sort to keep Cash first, Card second
      return filtered.sort((a, b) => {
        const aIndex = ALLOWED_PAYMENT_METHOD_KEYS.indexOf(
          (a.type || a.code || '').toLowerCase().includes('cash') ? 'cash' : 'card',
        );
        const bIndex = ALLOWED_PAYMENT_METHOD_KEYS.indexOf(
          (b.type || b.code || '').toLowerCase().includes('cash') ? 'cash' : 'card',
        );
        return aIndex - bIndex;
      });
    },
    [],
  );

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
          setAvailablePaymentMethods(selectAllowedPaymentMethods(result.paymentMethods));
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
  }, [paymentMethodRepo, selectAllowedPaymentMethods]);

  // Save payment state to sessionStorage whenever it changes
  React.useEffect(() => {
    try {
      sessionStorage.setItem(
        sessionKey,
        JSON.stringify({
          payments,
          total: orderTotal,
          updatedAt: Date.now(),
          source: 'payments-page',
        })
      );
    } catch (error) {
      console.error('[Payments] Failed to save payment state:', error);
    }
  }, [payments, sessionKey, orderTotal]);

  const amountPaid = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );

  const amountDue = orderTotal - amountPaid;
  const changeDue = Math.max(0, amountPaid - orderTotal);
  const phoneSearchValue = customerPhoneInput.replace(/[^\d+]/g, '');
  const phoneMatches = useMemo(() => {
    if (!phoneSearchValue) {
      return [];
    }
    return customers
      .filter((customer) =>
        (customer.phone || '').replace(/[^\d+]/g, '').includes(phoneSearchValue),
      )
      .slice(0, 5);
  }, [customers, phoneSearchValue]);
  React.useEffect(() => {
    if (phoneMatches.length === 0) {
      setSelectedCustomerIndex(-1);
      return;
    }
    setSelectedCustomerIndex((prev) => {
      if (prev < 0 || prev >= phoneMatches.length) {
        return 0;
      }
      return prev;
    });
  }, [phoneMatches]);
  const activeCustomerDetails = useMemo(() => {
    if (capturedCustomer) {
      return capturedCustomer;
    }
    if (navigationState?.customer) {
      return {
        id: navigationState.customer.id,
        name: navigationState.customer.name,
        email: navigationState.customer.email,
        phone: navigationState.customer.phone,
      };
    }
    if (navigationState?.customerId) {
      const match = customers.find((customer) => customer.id === navigationState.customerId);
      if (match) {
        return {
          id: match.id,
          name: match.name,
          email: match.email,
          phone: match.phone,
        };
      }
    }
    return null;
  }, [capturedCustomer, customers, navigationState]);

  React.useEffect(() => {
    if (
      payments.length > 0 &&
      amountDue <= PAYMENT_TOLERANCE &&
      salesOrderRepo &&
      !orderCreatedRef.current
    ) {
      if (!completionFlowStartedRef.current) {
        completionFlowStartedRef.current = true;
        setFlowError(null);
        setIsCompletionPanelOpen(true);
        if (navigationState?.customer || navigationState?.customerId || capturedCustomer) {
          setCompletionStep('summary');
        } else {
          setCompletionStep('phone');
        }
      }
    } else {
      completionFlowStartedRef.current = false;
      if (!orderCreatedRef.current) {
        setIsCompletionPanelOpen(false);
      }
    }
  }, [amountDue, capturedCustomer, navigationState, payments.length, salesOrderRepo]);

  // Auto-focus input fields when panel opens or step changes
  React.useEffect(() => {
    if (!isCompletionPanelOpen) return;
    
    const focusTimeout = setTimeout(() => {
      if (completionStep === 'phone' && phoneInputRef.current) {
        phoneInputRef.current.focus();
        phoneInputRef.current.select();
      } else if (completionStep === 'name' && nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.select();
      } else if (completionStep === 'email' && emailInputRef.current) {
        emailInputRef.current.focus();
        emailInputRef.current.select();
      } else if (completionStep === 'summary' && summaryContainerRef.current) {
        summaryContainerRef.current.focus();
        // Keep focus on the container
        summaryContainerRef.current.focus();
      }
    }, 150);

    return () => clearTimeout(focusTimeout);
  }, [isCompletionPanelOpen, completionStep]);

  const handlePhoneInputChange = useCallback((value: string) => {
    const sanitized = value.replace(/[^\d+]/g, '');
    setCustomerPhoneInput(sanitized);
    setFlowError(null);
  }, []);

  const handlePhoneKeypadInput = useCallback((value: string) => {
    setCustomerPhoneInput((prev) => {
      if (value === 'backspace') {
        return prev.slice(0, -1);
      }
      if (value === 'clear') {
        return '';
      }
      return `${prev}${value}`.replace(/[^\d+]/g, '');
    });
    setFlowError(null);
  }, []);

  const handleSelectSuggestedCustomer = useCallback((customer: StoreCustomer) => {
    setCapturedCustomer({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    });
    setCustomerPhoneInput(customer.phone || '');
    setCustomerNameInput(customer.name || '');
    setCustomerEmailInput(customer.email || '');
    setCompletionStep('summary');
    setFlowError(null);
  }, []);

  const handlePhoneNext = useCallback(() => {
    if (!customerPhoneInput || phoneSearchValue.length < 5) {
      setFlowError('Enter at least 5 digits for the phone number.');
      return;
    }
    setCapturedCustomer((prev) => ({
      ...(prev ?? {}),
      phone: customerPhoneInput,
    }));
    setCompletionStep('name');
    setFlowError(null);
  }, [customerPhoneInput, phoneSearchValue]);

  const handleNameNext = useCallback(() => {
    if (!customerNameInput.trim()) {
      setFlowError('Enter the customer name to continue.');
      return;
    }
    setCapturedCustomer((prev) => ({
      ...(prev ?? {}),
      name: customerNameInput.trim(),
    }));
    setCompletionStep('email');
    setFlowError(null);
  }, [customerNameInput]);

  const handleEmailNext = useCallback(() => {
    const trimmed = customerEmailInput.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFlowError('Enter a valid email address or leave the field empty.');
      return;
    }
    setCapturedCustomer((prev) => ({
      ...(prev ?? {}),
      email: trimmed || undefined,
    }));
    setCompletionStep('summary');
    setFlowError(null);
  }, [customerEmailInput]);

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

  const finalizeOrder = useCallback(async () => {
    if (!salesOrderRepo) {
      show('Sales order service is unavailable. Please try again.', 'error');
      return;
    }
    if (orderCreatedRef.current) {
      return;
    }
    if (amountDue > PAYMENT_TOLERANCE) {
      show('Collect the remaining balance before completing the order.', 'error');
      return;
    }

        orderCreatedRef.current = true;
        setIsProcessing(true);
    setFlowError(null);

        try {
            const paymentInputs = payments.map((p) => ({
            paymentMethodId: p.paymentMethodId,
            amount: p.amount,
            transactionId: p.transactionId,
            authorizationCode: p.authorizationCode,
            cardLast4: p.cardLast4,
            cardBrand: p.cardBrand,
          }));

      let customerId = navigationState?.customerId;
      let receiptCustomer: ReceiptCustomer | undefined;

      if (navigationState?.customer) {
        const customerNameParts = navigationState.customer.name.split(' ');
        receiptCustomer = {
          id: navigationState.customer.id || navigationState.customerId || 'walk-in-customer',
          firstName: customerNameParts[0] || '',
          lastName: customerNameParts.slice(1).join(' ') || '',
          email: navigationState.customer.email || undefined,
          phone: navigationState.customer.phone || undefined,
          customerCode: navigationState.customer.id,
        };
      } else if (navigationState?.customerId) {
        receiptCustomer = {
          id: navigationState.customerId,
          firstName: '',
          lastName: '',
          email: undefined,
          phone: undefined,
          customerCode: navigationState.customerId,
        };
      }

      const capturedDetails = capturedCustomer;
      if (!customerId && capturedDetails?.id) {
        customerId = capturedDetails.id;
      }

      if (!receiptCustomer && capturedDetails?.name) {
        const nameParts = capturedDetails.name.split(' ');
        receiptCustomer = {
          id: capturedDetails.id || customerId || 'walk-in-customer',
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: capturedDetails.email || undefined,
          phone: capturedDetails.phone || undefined,
          customerCode: capturedDetails.id,
        };
      }

      if (!customerId && capturedDetails?.name && capturedDetails.phone) {
        try {
          const result = await dispatch(
            createCustomer({
              data: {
                name: capturedDetails.name,
                email: capturedDetails.email || '',
                phone: capturedDetails.phone,
                address: '',
              },
              options: { useServer: true },
            }),
          ).unwrap();
          if (result.success && result.customer) {
            customerId = result.customer.id;
            setCapturedCustomer({
              id: result.customer.id,
              name: result.customer.name,
              email: result.customer.email,
              phone: result.customer.phone,
            });
            const createdNameParts = result.customer.name.split(' ');
            receiptCustomer = {
              id: result.customer.id || 'walk-in-customer',
              firstName: createdNameParts[0] || '',
              lastName: createdNameParts.slice(1).join(' ') || '',
              email: result.customer.email || undefined,
              phone: result.customer.phone || undefined,
              customerCode: result.customer.id || undefined,
            };
          }
        } catch (error) {
          console.error('[Payments] Failed to create customer before order completion:', error);
          orderCreatedRef.current = false;
          setIsProcessing(false);
          setFlowError('Failed to save customer details. Please try again.');
          show('Failed to save customer details. Please try again.', 'error');
          return;
        }
      }

          const orderInput = {
            locationId: currentLocationId,
            cashierId: currentUserId,
            salesPersonId: navigationState?.salesPersonId || undefined,
        customerId,
            lineItems: lineItems.map((item: any) => {
              const baseQuantity = Number(item.quantity ?? 1);
              const unitPrice = Math.abs(Number(item.price ?? 0));
              const lineDiscountAmount =
                typeof item.lineDiscount === 'number'
                  ? Math.abs(item.lineDiscount)
                  : typeof item.discount === 'number'
                  ? Math.abs(item.discount)
                  : 0;
              return {
                variantId: item.productId || item.id,
                salesPersonId: item.salesPersonId || navigationState?.salesPersonId || undefined,
                quantity: item.isReturn ? -Math.abs(baseQuantity) : baseQuantity,
                unitPrice,
                saleDiscount: lineDiscountAmount > 0 ? { amount: lineDiscountAmount } : undefined,
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
            taxAmountOverride: orderBreakdown.taxValue,
            totalAmountOverride: orderBreakdown.total,
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

      if (!result.success || !result.order) {
        console.error('[Payments] Order creation failed:', result.error);
        orderCreatedRef.current = false;
        show(result.error || 'Failed to complete order', 'error');
        setIsProcessing(false);
        return;
      }

            const orderNumber = result.order.orderNumber;
            const invoiceNumber = (result.order as any).invoiceNumber || result.order.orderNumber || result.order.id;
            show(`Order completed! Order #: ${orderNumber}`, 'success');

            if (navigationState?.parkedOrderId && parkedOrderRepo) {
              try {
                await parkedOrderRepo.completeParkedOrder(navigationState.parkedOrderId);
              } catch (error) {
          console.error('[Payments] Failed to complete parked order:', error);
              }
            }

            const grossTotal = orderBreakdown.subtotal;
            const itemDiscount = orderBreakdown.discountValue;
            const netTotal = orderTotal;
            const tendered = amountPaid;
            const change = changeDue;

            const receiptLineItems = lineItems.map((item: any) => {
              const productName = item.name || 'Item';
              const variantName = item.variantName || '';
              const sku = item.sku || item.barcode || item.productVariantId || '';
              const quantity = item.quantity || 1;
              const unitPrice = Number(item.price || 0);
            const discount =
              item.lineDiscount ??
              item.discount ??
              0;
            const lineSubtotal = unitPrice * quantity;
            const lineTotal = Math.max(0, unitPrice * quantity - discount);

              return {
                id: item.id || item.productId || Math.random().toString(),
                variantId: item.productVariantId || item.productId || item.id || '',
          variant: item.variant
            ? {
                  id: item.variant.id || '',
                sku,
                variantName,
                product: item.variant.product
                  ? {
                    id: item.variant.product.id || '',
                    name: productName,
                    }
                  : undefined,
              }
            : undefined,
                salesPersonId: navigationState?.salesPersonId || undefined,
          quantity,
          unitPrice,
                saleDiscount: discount > 0 ? { amount: discount } : undefined,
                customDiscount: undefined,
          lineSubtotal,
                lineDiscount: discount,
          lineTotal,
          productName,
          variantName,
          sku,
        } as any;
      });

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

            completedOrderRef.current = {
              orderNumber,
              lineItems,
            };

            let salesPersonName = navigationState?.salesPersonName || 'Cashier';
            if (!salesPersonName || salesPersonName === 'Cashier') {
              const orderWithDetails = result.order as any;
              if (orderWithDetails?.salesPerson) {
                if (orderWithDetails.salesPerson.name) {
                  salesPersonName = orderWithDetails.salesPerson.name;
                } else if (orderWithDetails.salesPerson.firstName || orderWithDetails.salesPerson.lastName) {
                  salesPersonName = `${orderWithDetails.salesPerson.firstName || ''} ${orderWithDetails.salesPerson.lastName || ''}`.trim();
                }
              }
            }

      if (!receiptCustomer && capturedDetails) {
        const nameParts = (capturedDetails.name || '').split(' ');
              receiptCustomer = {
          id: capturedDetails.id || customerId || 'walk-in-customer',
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: capturedDetails.email || undefined,
          phone: capturedDetails.phone || undefined,
          customerCode: capturedDetails.id,
        };
      }

      // Store receipt data for display in summary
      const receiptDataForPrint = {
              invoiceNumber,
              orderNumber: result.order.orderNumber || invoiceNumber,
              orderId: result.order.id,
              lineItems: receiptLineItems,
              payments: receiptPayments,
              customer: receiptCustomer,
              cashier: salesPersonName,
              grossTotal,
              itemDiscount,
        taxAmount: orderBreakdown.taxValue,
        adjustmentAmount: orderBreakdown.adjustmentValue,
              netTotal,
              tendered,
              change,
      };

      // Close the completion panel immediately
      setIsCompletionPanelOpen(false);
      
      // Prompt print receipt and wait for data to be set, then print directly
      // The print success/error callbacks will handle navigation back to transactions and reset
      try {
        await promptPrintReceipt(receiptDataForPrint);
        
        // Wait a bit for React state to update, then print directly
        // This will complete the order flow: print if printer connected, then navigate back and reset
        let navigationHandled = false;
        const ensureNavigation = () => {
          if (!navigationHandled && completedOrderRef.current) {
            navigationHandled = true;
            console.log('[Payments] Ensuring navigation back to transactions');
            handleReturnToTransactions();
          }
        };
        
        setTimeout(async () => {
          try {
            await originalConfirmPrint();
            // onPrintSuccess callback will handle navigation and reset
            // Set a fallback in case callback doesn't fire
            setTimeout(ensureNavigation, 1000);
          } catch (error) {
            console.error('[Payments] Print error:', error);
            // onPrintError callback will handle navigation and reset even if print fails
            // Set a fallback in case callback doesn't fire
            setTimeout(ensureNavigation, 1000);
          }
        }, 300);
        
        // Ultimate fallback: ensure navigation happens after reasonable timeout
        setTimeout(ensureNavigation, 5000);
      } catch (error) {
        console.error('[Payments] Failed to prompt print receipt:', error);
        // Still navigate back even if print setup fails
        setTimeout(() => {
          handleReturnToTransactions();
        }, 500);
      }
        } catch (error: any) {
          console.error('[Payments] Failed to complete order:', error);
          orderCreatedRef.current = false;
      show(error.message || 'Failed to complete order', 'error');
        } finally {
          setIsProcessing(false);
    }
  }, [
    amountDue,
    amountPaid,
    capturedCustomer,
    changeDue,
    dispatch,
    lineItems,
    navigationState,
    orderBreakdown.discountValue,
    orderBreakdown.subtotal,
    orderTotal,
    payments,
    parkedOrderRepo,
    salesOrderRepo,
    currentLocationId,
    currentUserId,
    show,
    promptPrintReceipt,
  ]);

  // Handle keyboard shortcuts for summary step
  React.useEffect(() => {
    if (!isCompletionPanelOpen || completionStep !== 'summary') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key to confirm and generate bill
      if (e.key === 'Enter' && !isProcessing) {
        // Don't prevent default if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        finalizeOrder();
        return;
      }
      // Shift+Backspace to go back to edit customer
      if (e.key === 'Backspace' && e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setCompletionStep('phone');
      }
    };

    // Use capture phase to catch events early
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isCompletionPanelOpen, completionStep, isProcessing, finalizeOrder]);

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

      <SidePanel
        isOpen={isCompletionPanelOpen}
        onClose={() => undefined}
        width="320px"
        title={completionTitles[completionStep]}
      >
        {completionStep === 'phone' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Customer phone
                </label>
                <div
                  className="w-full h-12 px-3 flex items-center gap-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    color: 'var(--color-text-primary)',
                    borderColor: 'var(--color-border-light)',
                  }}
                >
                  <Phone
                    className="w-4 h-4"
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    value={customerPhoneInput}
                    onChange={(e) => handlePhoneInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown' && phoneMatches.length > 0) {
                        e.preventDefault();
                        setSelectedCustomerIndex((prev) => {
                          if (phoneMatches.length === 0) return -1;
                          const next = prev < phoneMatches.length - 1 ? prev + 1 : 0;
                          return next;
                        });
                        return;
                      }
                      if (e.key === 'ArrowUp' && phoneMatches.length > 0) {
                        e.preventDefault();
                        setSelectedCustomerIndex((prev) => {
                          if (phoneMatches.length === 0) return -1;
                          const next = prev > 0 ? prev - 1 : phoneMatches.length - 1;
                          return next;
                        });
                        return;
                      }
                      if (e.key === 'Enter') {
                        if (selectedCustomerIndex >= 0 && phoneMatches[selectedCustomerIndex]) {
                          e.preventDefault();
                          handleSelectSuggestedCustomer(phoneMatches[selectedCustomerIndex]);
                        } else {
                          e.preventDefault();
                          handlePhoneNext();
                        }
                      } else if (e.key === 'Backspace' && e.shiftKey) {
                        e.preventDefault();
                        // No back step from phone, so do nothing
                      }
                    }}
                    className="flex-1 text-lg font-mono bg-transparent outline-none border-none"
                    style={{ color: 'var(--color-text-primary)' }}
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>

              {customersLoading ? (
                <div className="text-xs text-center py-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Loading customers...
                </div>
              ) : phoneMatches.length > 0 ? (
                <div
                  className="border rounded p-2 space-y-2"
                  style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-card)' }}
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    <Search className="w-3 h-3" />
                    Matching customers
                  </div>
                  {phoneMatches.map((match, index) => {
                    const isSelected = index === selectedCustomerIndex;
                    return (
                    <button
                      key={`${match.id}-${match.phone}`}
                      type="button"
                      onClick={() => handleSelectSuggestedCustomer(match)}
                      onMouseEnter={() => setSelectedCustomerIndex(index)}
                      className="w-full text-left rounded px-2 py-1.5 transition-opacity"
                      style={{ 
                        color: isSelected ? 'var(--color-text-light)' : 'var(--color-text-primary)',
                        backgroundColor: isSelected ? 'var(--color-accent-blue)' : 'var(--color-bg-secondary)',
                      }}
                      aria-selected={isSelected}
                    >
                      <div className="text-sm font-medium">{match.name || 'Customer'}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {match.phone || 'No phone on file'}
                      </div>
                    </button>
                  );
                  })}
                </div>
              ) : customerPhoneInput.trim() ? (
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  No matching customers found. Continue to add new customer.
                </div>
              ) : null}

              {flowError && (
                <div className="text-xs font-medium text-red-500">{flowError}</div>
              )}
            </div>

            <div className="flex-shrink-0 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
              <div className="grid grid-cols-3 gap-1.5">
                {phoneKeypadKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePhoneKeypadInput(key)}
                    className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      color: 'var(--color-text-primary)',
                      borderColor: 'var(--color-border-light)',
                    }}
                  >
                    {key === 'backspace' ? '⌫' : key === 'clear' ? 'Clear' : key}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-center mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                Press Enter to continue
              </p>
            </div>
          </div>
        )}

        {completionStep === 'name' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Customer name
                </label>
                <div
                  className="w-full h-12 px-3 flex items-center gap-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    color: 'var(--color-text-primary)',
                    borderColor: 'var(--color-border-light)',
                  }}
                >
                  <User
                    className="w-4 h-4"
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNameNext();
                      } else if (e.key === 'Backspace' && e.shiftKey) {
                        e.preventDefault();
                        setCompletionStep('phone');
                      }
                    }}
                    className="flex-1 text-lg font-mono bg-transparent outline-none border-none"
                    style={{ color: 'var(--color-text-primary)' }}
                    placeholder="Walk-in customer"
                  />
                </div>
              </div>

              {flowError && (
                <div className="text-xs font-medium text-red-500">{flowError}</div>
              )}
            </div>

            <div className="flex-shrink-0 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
              <p className="text-[10px] text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Press Enter to continue, Shift+Backspace to go back
              </p>
            </div>
          </div>
        )}

        {completionStep === 'email' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Customer email (optional)
                </label>
                <div
                  className="w-full h-12 px-3 flex items-center gap-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    color: 'var(--color-text-primary)',
                    borderColor: 'var(--color-border-light)',
                  }}
                >
                  <Mail
                    className="w-4 h-4"
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={customerEmailInput}
                    onChange={(e) => setCustomerEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEmailNext();
                      } else if (e.key === 'Backspace' && e.shiftKey) {
                        e.preventDefault();
                        setCompletionStep('name');
                      }
                    }}
                    className="flex-1 text-lg font-mono bg-transparent outline-none border-none"
                    style={{ color: 'var(--color-text-primary)' }}
                    placeholder="customer@email.com"
                  />
                </div>
              </div>

              {flowError && (
                <div className="text-xs font-medium text-red-500">{flowError}</div>
              )}
            </div>

            <div className="flex-shrink-0 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
              <p className="text-[10px] text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Press Enter to continue, Shift+Backspace to go back
              </p>
            </div>
          </div>
        )}

        {completionStep === 'summary' && (
          <div 
            ref={summaryContainerRef}
            className="flex flex-col h-full outline-none"
            onKeyDown={(e) => {
              // Enter key to confirm and generate bill
              if (e.key === 'Enter' && !isProcessing) {
                e.preventDefault();
                e.stopPropagation();
                finalizeOrder();
              }
              // Shift+Backspace to go back to edit customer
              else if (e.key === 'Backspace' && e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                setCompletionStep('phone');
              }
            }}
            tabIndex={-1}
            style={{ outline: 'none' }}
          >
            <div className="flex-1 overflow-y-auto space-y-3">
              <div
                className="border rounded p-3 space-y-2"
                style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-card)' }}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>Order detail</span>
                  <span>{lineItems.length} items</span>
                </div>
                <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {lineItems.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.name}</span>
                      <span>
                        {item.quantity} × {formatCurrency(Number(item.price || 0))}
                      </span>
                    </div>
                  ))}
                  {lineItems.length > 3 && (
                    <div className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                      + {lineItems.length - 3} more item(s)
                    </div>
                  )}
                </div>
                <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                  <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Subtotal</span>
                    <span>{formatCurrency(orderBreakdown.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Discounts</span>
                    <span>-{formatCurrency(orderBreakdown.discountValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    <span>Total</span>
                    <span>{formatCurrency(orderTotal)}</span>
                  </div>
                </div>
              </div>

              <div
                className="border rounded p-3 space-y-1"
                style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-card)' }}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>Customer detail</span>
                  <button
                    type="button"
                    onClick={() => setCompletionStep('phone')}
                    className="text-[11px] underline"
                    style={{ color: 'var(--color-accent-blue)' }}
                  >
                    Edit
                  </button>
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {activeCustomerDetails?.name || 'Walk-in customer'}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {activeCustomerDetails?.phone || 'Phone not provided'}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {activeCustomerDetails?.email || 'Email not provided'}
                </div>
              </div>

              {flowError && (
                <div className="text-xs font-medium text-red-500">{flowError}</div>
              )}
            </div>

            <div className="flex-shrink-0 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
              <button
                type="button"
                onClick={finalizeOrder}
                disabled={isProcessing}
                className="w-full rounded py-2 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#ea580c', color: 'white' }}
              >
                <Printer className="w-4 h-4" />
                {isProcessing ? 'Finishing...' : 'Generate Bill'}
              </button>
              <p className="text-[10px] text-center mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                Press Enter to confirm, Shift+Backspace to edit customer
              </p>
            </div>
          </div>
        )}
      </SidePanel>

    </div>
  );
}
