import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TransactionLines,
  TransactionNumpad,
  TransactionActions,
  TransactionQuantityPanel,
  Invoice,
  DiscountPrompt,
  CouponPrompt,
  AdjustmentPrompt,
  PreviewPrompt,
  ParkedOrderSearch,
  PaymentCollection,
  ConfirmationModal,
  type Payment as PaymentCollectionEntry,
  type PaymentMethod as PaymentCollectionMethod,
  type ActionButton,
  type Product,
  useCart,
  useTransactionCustomer,
  useToast,
  useKeyboardShortcuts,
} from '@monorepo/shared-ui';
import type { Customer as TransactionCustomer } from '../components/customer/CustomerCard';
import {
  Gift,
  ShoppingBag,
  X,
  RotateCcw,
  Equal,
  DollarSign,
  User,
  Heart,
  CreditCard,
  Banknote,
  Ruler,
  Trash2,
  Percent,
  TicketPercent,
  SlidersHorizontal,
  Eye,
} from 'lucide-react';
import type { ProductRepository, Product as StoreProduct } from '@monorepo/shared-store';
import type {
  CreateSalesOrderInput,
  OrderPaymentInput,
} from '@monorepo/shared-data-access';
import type {
  ParkedOrderListItem,
  SalesOrderRepository,
  ParkedOrderRepository,
  PaymentMethodRepository,
} from '@monorepo/shared-data-access';
import {
  WebIndexedDbClient,
  HttpApiClient,
  SalesOrderRepository as SalesOrderRepositoryClass,
  ParkedOrderRepository as ParkedOrderRepositoryClass,
  PaymentMethodRepository as PaymentMethodRepositoryClass,
  type IndexedDBSchema,
} from '@monorepo/shared-data-access';

const TAX_RATE = 0.1;
const AUTO_IDB_DB_NAME = 'transactions-autoconfig';
const AUTO_IDB_DB_VERSION = 1;

const AUTO_IDB_SCHEMA: IndexedDBSchema = {
  stores: {
    SaleOrder: {
      keyPath: 'id',
      indexes: {
        orderNumber: { keyPath: 'orderNumber', unique: true },
        customerId: { keyPath: 'customerId' },
        locationId: { keyPath: 'locationId' },
        cashierId: { keyPath: 'cashierId' },
        orderDate: { keyPath: 'orderDate' },
      },
    },
    OrderLineItem: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        variantId: { keyPath: 'variantId' },
      },
    },
    OrderPayment: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        paymentMethodId: { keyPath: 'paymentMethodId' },
      },
    },
    ParkedOrder: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        customerId: { keyPath: 'customerId' },
        parkedAt: { keyPath: 'parkedAt' },
      },
    },
    PaymentMethod: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        isActive: { keyPath: 'isActive' },
      },
    },
  },
};

const FALLBACK_PAYMENT_METHODS: PaymentCollectionMethod[] = [
  { id: '1', code: 'CASH', name: 'Cash', type: 'Cash', isActive: true },
  { id: '2', code: 'CARD', name: 'Card', type: 'Card', isActive: true },
];

const createTempId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface TransactionsProps {
  productRepository?: ProductRepository;
  // Repositories for parked orders and payments
  salesOrderRepo?: SalesOrderRepository;
  parkedOrderRepo?: ParkedOrderRepository;
  paymentMethodRepo?: PaymentMethodRepository;
  // Current user/location - injected by app
  currentUserId?: string;
  currentLocationId?: string;
}

export function Transactions({
  productRepository,
  salesOrderRepo,
  parkedOrderRepo,
  paymentMethodRepo,
  currentUserId = '1',
  currentLocationId = '1',
}: TransactionsProps = {}) {
  console.log('[Transactions] Received props:', {
    currentUserId,
    currentLocationId,
    hasProductRepo: !!productRepository,
    hasSalesOrderRepo: !!salesOrderRepo,
  });

  const navigate = useNavigate();
  
  // Load initial state from localStorage
  const [activeTab, setActiveTabState] = useState<'lines' | 'payments'>(() => {
    const saved = localStorage.getItem('transactions-activeTab');
    return (saved === 'lines' || saved === 'payments') ? saved : 'lines';
  });
  
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [numpadValue, setNumpadValue] = useState<string>('');
  
  const [activeSection, setActiveSectionState] = useState<string>(() => {
    const saved = localStorage.getItem('transactions-activeSection');
    return saved || 'actions';
  });
  
  const [isQuantityPanelOpen, setIsQuantityPanelOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isVoidConfirmationOpen, setIsVoidConfirmationOpen] = useState(false);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: 'amount' | 'percent'; value: number } | null>(null);
  const [giftCardNumberInput, setGiftCardNumberInput] = useState('');
  const [giftCardValueInput, setGiftCardValueInput] = useState('');
  const [giftCardData, setGiftCardData] = useState<{ cardNumber: string; discount: number } | null>(null);
  const [adjustmentAmountInput, setAdjustmentAmountInput] = useState('');
  const [adjustmentReasonInput, setAdjustmentReasonInput] = useState('');
  const [appliedAdjustment, setAppliedAdjustment] = useState<{ amount: number; reason?: string } | null>(null);

  // Parked orders state
  const [isParkedOrdersModalOpen, setIsParkedOrdersModalOpen] = useState(false);
  const [parkedOrders, setParkedOrders] = useState<ParkedOrderListItem[]>([]);
  const [loadingParkedOrders, setLoadingParkedOrders] = useState(false);
  const [currentParkedOrderId, setCurrentParkedOrderId] = useState<string | null>(null);

  // Save activeTab to localStorage when it changes
  const setActiveTab = (tab: 'lines' | 'payments') => {
    setActiveTabState(tab);
    localStorage.setItem('transactions-activeTab', tab);
  };

  // Save activeSection to localStorage when it changes
  const setActiveSection = (section: string) => {
    setActiveSectionState(section);
    localStorage.setItem('transactions-activeSection', section);
  };
  const { items: lineItems, setItemQuantity, removeItem, addItem } = useCart();
  const { customer, setCustomer, clearCustomer } = useTransactionCustomer();
  const { show } = useToast();
  const [showInvoice, setShowInvoice] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDialogMode, setPaymentDialogMode] = useState<'cash' | 'card' | null>(null);
  const [paymentEntries, setPaymentEntries] = useState<PaymentCollectionEntry[]>([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentCollectionMethod[]>(FALLBACK_PAYMENT_METHODS);
  const [isPaymentMethodsLoading, setIsPaymentMethodsLoading] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentDialogError, setPaymentDialogError] = useState<string | null>(null);
  const [autoRepos, setAutoRepos] = useState<{
    salesOrderRepo?: SalesOrderRepository;
    parkedOrderRepo?: ParkedOrderRepository;
    paymentMethodRepo?: PaymentMethodRepository;
  }>({});
  const formatCurrency = useCallback(
    (amount: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount),
    []
  );

  useEffect(() => {
    if (salesOrderRepo || typeof window === 'undefined') {
      return;
    }
    if (autoRepos.salesOrderRepo) {
      return;
    }

    let isActive = true;

    const configureRepos = async () => {
      try {
        const dbClient = new WebIndexedDbClient(
          AUTO_IDB_DB_NAME,
          AUTO_IDB_DB_VERSION,
          AUTO_IDB_SCHEMA
        );
        await dbClient.initialize();

        const apiClient = new HttpApiClient();
        await apiClient.initialize().catch((err) => {
          console.warn('[Transactions] API client initialization warning:', err);
        });

        if (!isActive) return;

        setAutoRepos({
          salesOrderRepo: new SalesOrderRepositoryClass(dbClient, apiClient),
          parkedOrderRepo: new ParkedOrderRepositoryClass(dbClient, apiClient),
          paymentMethodRepo: new PaymentMethodRepositoryClass(dbClient, apiClient),
        });
      } catch (err) {
        if (!isActive) return;
        console.error('[Transactions] Failed to auto-configure repositories:', err);
      }
    };

    void configureRepos();

    return () => {
      isActive = false;
    };
  }, [autoRepos.salesOrderRepo, salesOrderRepo]);

  const effectiveSalesOrderRepo = useMemo(
    () => salesOrderRepo ?? autoRepos.salesOrderRepo,
    [salesOrderRepo, autoRepos.salesOrderRepo]
  );
  const effectiveParkedOrderRepo = useMemo(
    () => parkedOrderRepo ?? autoRepos.parkedOrderRepo,
    [parkedOrderRepo, autoRepos.parkedOrderRepo]
  );
  const effectivePaymentMethodRepo = useMemo(
    () => paymentMethodRepo ?? autoRepos.paymentMethodRepo,
    [paymentMethodRepo, autoRepos.paymentMethodRepo]
  );

  // Keyboard shortcuts
  const openDiscountModal = useCallback(() => {
    setDiscountMode(appliedDiscount?.type ?? 'amount');
    setDiscountInput(appliedDiscount ? String(appliedDiscount.value) : '');
    setIsDiscountModalOpen(true);
  }, [appliedDiscount]);

  const openGiftCardModal = useCallback(() => {
    setGiftCardNumberInput(giftCardData?.cardNumber ?? '');
    setGiftCardValueInput(giftCardData ? String(giftCardData.discount) : '');
    setIsGiftCardModalOpen(true);
  }, [giftCardData]);

  const openAdjustmentModal = useCallback(() => {
    setAdjustmentAmountInput(appliedAdjustment ? String(appliedAdjustment.amount) : '');
    setAdjustmentReasonInput(appliedAdjustment?.reason ?? '');
    setIsAdjustmentModalOpen(true);
  }, [appliedAdjustment]);

  // ============ Parked Order Handlers ============

  const openParkedOrdersModal = useCallback(() => {
    setIsParkedOrdersModalOpen(true);
    // Trigger initial search
    handleSearchParkedOrders('');
  }, []);

  const handleSearchParkedOrders = async (searchTerm: string) => {
    if (!effectiveParkedOrderRepo) {
      console.warn('[Transactions] ParkedOrderRepository not available');
      return;
    }

    setLoadingParkedOrders(true);
    try {
      const result = await effectiveParkedOrderRepo.searchParkedOrders({
        searchTerm,
        useServer: true,
      });

      if (result.success) {
        setParkedOrders(result.parkedOrders || []);
      } else {
        console.error('[Transactions] Failed to search parked orders:', result.error);
        setParkedOrders([]);
      }
    } catch (err: any) {
      console.error('[Transactions] Error searching parked orders:', err);
      setParkedOrders([]);
    } finally {
      setLoadingParkedOrders(false);
    }
  };

  const handleLoadParkedOrder = async (parkedOrderId: string, orderId: string) => {
    if (!effectiveParkedOrderRepo) {
      show('Parked orders not available', 'error');
      return;
    }

    try {
      const result = await effectiveParkedOrderRepo.loadParkedOrder(parkedOrderId);

      if (result.success && result.data) {
        // Clear current transaction
        lineItems.forEach(item => removeItem(item.id));
        clearCustomer();
        setAppliedDiscount(null);
        setGiftCardData(null);
        setAppliedAdjustment(null);

        // Load parked order data
        const { order, lineItems: parkedLineItems, customer: parkedCustomer } = result.data;

        // Add line items to cart
        parkedLineItems.forEach(item => {
          addItem({
            id: item.id,
            name: item.variantName || 'Unknown',
            price: item.unitPrice,
            quantity: item.quantity,
            productId: item.variantId,
          });
        });

        // Set customer (mandatory for transactions)
        const normalizedCustomer: TransactionCustomer | null = parkedCustomer
          ? {
              id: parkedCustomer.id,
              name: `${parkedCustomer.firstName ?? ''} ${parkedCustomer.lastName ?? ''}`.trim() || 'Walk-in Customer',
              email: parkedCustomer.email ?? '',
              phone: parkedCustomer.phone ?? '',
              address: parkedCustomer.address ?? '',
            }
          : order.customerId
            ? {
                id: order.customerId,
                name: `Customer ${order.customerId}`,
                email: '',
                phone: '',
                address: '',
              }
            : null;

        if (normalizedCustomer) {
          setCustomer(normalizedCustomer);
        } else {
          show('Parked order is missing customer information', 'error');
          return;
        }

        // Set discounts and adjustments
        if (order.discountAmount && order.discountAmount > 0) {
          setAppliedDiscount({ type: 'amount', value: order.discountAmount });
        }
        if (order.adjustmentAmount && order.adjustmentAmount !== 0) {
          setAppliedAdjustment({ amount: order.adjustmentAmount, reason: order.adjustmentReason });
        }

        // Track this parked order ID
        setCurrentParkedOrderId(parkedOrderId);

        // Close modal and show success
        setIsParkedOrdersModalOpen(false);
        show('Parked order loaded successfully', 'success');
      } else {
        show(result.error || 'Failed to load parked order', 'error');
      }
    } catch (err: any) {
      console.error('[Transactions] Error loading parked order:', err);
      show(err.message || 'Failed to load parked order', 'error');
    }
  };

  const handleDeleteParkedOrder = async (parkedOrderId: string) => {
    if (!effectiveParkedOrderRepo) {
      show('Parked orders not available', 'error');
      return;
    }

    try {
      const result = await effectiveParkedOrderRepo.deleteParkedOrder(parkedOrderId);

      if (result.success) {
        show('Parked order deleted successfully', 'success');
        // Refresh parked orders list
        handleSearchParkedOrders('');
      } else {
        show(result.error || 'Failed to delete parked order', 'error');
      }
    } catch (err: any) {
      console.error('[Transactions] Error deleting parked order:', err);
      show(err.message || 'Failed to delete parked order', 'error');
    }
  };

  const handleParkOrder = async () => {
    if (!effectiveSalesOrderRepo || !effectiveParkedOrderRepo) {
      show('Parked orders not available - repositories not initialized', 'error');
      return;
    }

    if (lineItems.length === 0) {
      show('Cannot park empty order', 'error');
      return;
    }

    try {
      // Create the order with status 'Open' (will be changed to 'Parked')
      const orderResult = await effectiveSalesOrderRepo.createOrder(
        {
          locationId: currentLocationId,
          cashierId: currentUserId,
          customerId: customer?.id,
          lineItems: lineItems.map((item) => ({
            variantId: item.productId || item.id,
            salesPersonId: currentUserId, // Default to cashier
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          payments: [], // No payments yet
          orderLevelDiscount: appliedDiscount
            ? appliedDiscount.type === 'percent'
              ? { percent: appliedDiscount.value }
              : { amount: appliedDiscount.value }
            : undefined,
          adjustment: appliedAdjustment
            ? { amount: appliedAdjustment.amount, reason: appliedAdjustment.reason }
            : undefined,
          giftCardNumber: giftCardData?.cardNumber,
        },
        false // Create locally first, don't try server for park operation
      );

      if (!orderResult.success || !orderResult.order) {
        show(orderResult.error || 'Failed to create order for parking', 'error');
        return;
      }

      // Now park the order
      const parkResult = await effectiveParkedOrderRepo.parkOrder({
        orderId: orderResult.order.id,
        parkedBy: currentUserId,
        customerId: customer?.id,
        notes: appliedAdjustment?.reason,
      });

      if (parkResult.success && parkResult.parkedOrder) {
        show(`Order parked successfully! Park #: ${parkResult.parkedOrder.parkNumber}`, 'success');

        // Reset transaction screen
        lineItems.forEach(item => removeItem(item.id));
        clearCustomer();
        setAppliedDiscount(null);
        setGiftCardData(null);
        setAppliedAdjustment(null);
        setNumpadValue('');
        setSelectedItem('');

        // Refresh parked orders list
        handleSearchParkedOrders('');
      } else {
        show(parkResult.error || 'Failed to park order', 'error');
      }
    } catch (err: any) {
      console.error('[Transactions] Failed to park order:', err);
      show(err.message || 'Failed to park order', 'error');
    }
  };

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'p',
        ctrl: true,
        shift: true,
        action: () => setIsQuantityPanelOpen(true),
        description: 'Open quantity panel',
      },
      {
        key: 'a',
        ctrl: true,
        shift: true,
        action: () => navigate('/customers'),
        description: 'Navigate to customers page',
      },
      {
        key: 'd',
        ctrl: true,
        shift: true,
        action: openDiscountModal,
        description: 'Order discount prompt',
      },
      {
        key: 'c',
        ctrl: true,
        shift: true,
        action: openGiftCardModal,
        description: 'Gift card prompt',
      },
      {
        key: 'j',
        ctrl: true,
        shift: true,
        action: openAdjustmentModal,
        description: 'Order adjustment prompt',
      },
      {
        key: 'o',
        ctrl: true,
        shift: true,
        action: () => setIsPreviewModalOpen(true),
        description: 'Preview current order',
      },
      {
        key: 'z',
        ctrl: true,
        shift: true,
        action: openParkedOrdersModal,
        description: 'Open parked orders',
      },
    ],
  });

  // Get selected item details
  const selectedItemData = lineItems.find(item => item.id === selectedItem);

  // Products data for Products tab
  const fallbackProducts = useMemo<Product[]>(() => [
    { id: '81328', productNumber: '81328', name: 'Brown Leopardprint Sunglasses', price: '$130.00', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81300', productNumber: '81300', name: 'Brown Leather Travel Bag', price: '$89.99', rating: 3.8, reviewCount: 195, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
    { id: '81302', productNumber: '81302', name: 'Brown Snakeskin Bag', price: '$95.00', rating: 3.8, reviewCount: 192, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop' },
    { id: '81333', productNumber: '81333', name: 'Silver Stunner Sunglasses', price: '$42.00', rating: 3.7, reviewCount: 192, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81327', productNumber: '81327', name: 'Black Wireframe Sunglasses', price: '$120.00', rating: 3.8, reviewCount: 190, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81329', productNumber: '81329', name: 'Black Thick Rimmed Sunglasses', price: '$48.00', rating: 3.8, reviewCount: 193, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81330', productNumber: '81330', name: 'Brown Aviator Sunglasses', price: '$150.00', rating: 3.9, reviewCount: 195, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81331', productNumber: '81331', name: 'Pink Thick Rimmed Sunglasses', price: '$52.00', rating: 3.7, reviewCount: 188, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81319', productNumber: '81319', name: 'Brown Glove & Scarf Set', price: '$35.99', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop' },
    { id: '81323', productNumber: '81323', name: 'Grey Cotton Gloves', price: '$28.50', rating: 3.8, reviewCount: 192, image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop' },
    { id: '81320', productNumber: '81320', name: 'Brown Leather Gloves', price: '$38.00', rating: 3.8, reviewCount: 190, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop' },
    { id: '81321', productNumber: '81321', name: 'Black Cotton Gloves', price: '$32.00', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop' },
  ], []);
  const [productList, setProductList] = useState<Product[]>(fallbackProducts);

  useEffect(() => {
    let isMounted = true;

    if (!productRepository) {
      setProductList(fallbackProducts);
      return;
    }

    const loadProducts = async () => {
      try {
        const result = await productRepository.getAllProducts({ page: 1, limit: 12 });
        if (!isMounted) return;
        const mapped = (result.products ?? []).map((product: StoreProduct): Product => ({
          id: product.id,
          productNumber: product.productNumber,
          name: product.name,
          price: product.price,
          image: product.image,
          rating: product.rating,
          reviewCount: product.reviewCount,
        }));
        if (mapped.length > 0) {
          setProductList(mapped);
        } else {
          setProductList(fallbackProducts);
        }
      } catch (error) {
        console.error('[Transactions] Failed to load products:', error);
        if (isMounted) {
          show('Unable to load products. Showing defaults.', 'error');
          setProductList(fallbackProducts);
        }
      }
    };

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, [productRepository, fallbackProducts, show]);

  const handleProductClick = (product: Product) => {
    navigate(`/products/${product.id}`);
  };
  const handleAddProduct = (product: Product) => {
    const price = product.price ? Number(product.price.replace(/[^0-9.]/g, '')) : 0;
    addItem({
      id: product.id,
      name: product.name,
      price,
      quantity: 1,
      productId: product.id,
    });
    setActiveTab('lines');
  };

  const orderTotals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountValue =
      appliedDiscount && appliedDiscount.value > 0
        ? appliedDiscount.type === 'percent'
          ? (subtotal * appliedDiscount.value) / 100
          : appliedDiscount.value
        : 0;
    const giftCardValue = giftCardData?.discount ?? 0;
    const adjustmentValue = appliedAdjustment?.amount ?? 0;

    const taxableBase = Math.max(0, subtotal - discountValue - giftCardValue + adjustmentValue);
    const taxValue = Number((taxableBase * TAX_RATE).toFixed(2));
    const total = Math.max(0, taxableBase + taxValue);
    return {
      subtotal,
      discountValue,
      giftCardValue,
      adjustmentValue,
      taxValue,
      total,
    };
  }, [lineItems, appliedDiscount, giftCardData, appliedAdjustment]);

  const loadPaymentMethods = useCallback(async () => {
    if (!effectivePaymentMethodRepo) {
      setAvailablePaymentMethods(FALLBACK_PAYMENT_METHODS);
      return;
    }

    setIsPaymentMethodsLoading(true);
    try {
      const result = await effectivePaymentMethodRepo.getPaymentMethods({ isActive: true });
      if (result.success && result.paymentMethods && result.paymentMethods.length > 0) {
        setAvailablePaymentMethods(
          result.paymentMethods.map((method) => ({
            id: method.id,
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
      console.error('[Transactions] Failed to load payment methods:', error);
      setAvailablePaymentMethods(FALLBACK_PAYMENT_METHODS);
    } finally {
      setIsPaymentMethodsLoading(false);
    }
  }, [effectivePaymentMethodRepo]);

  const buildOrderInput = useCallback(
    (payments: OrderPaymentInput[]): CreateSalesOrderInput => ({
        locationId: currentLocationId,
        cashierId: currentUserId,
        customerId: customer?.id,
        lineItems: lineItems.map((item) => ({
          variantId: item.productId || item.id,
          salesPersonId: currentUserId,
          quantity: item.quantity,
          unitPrice: item.price,
      })),
      payments,
      orderLevelDiscount: appliedDiscount
        ? appliedDiscount.type === 'percent'
          ? { percent: appliedDiscount.value }
          : { amount: appliedDiscount.value }
        : undefined,
      adjustment: appliedAdjustment
        ? { amount: appliedAdjustment.amount, reason: appliedAdjustment.reason }
        : undefined,
      giftCardNumber: giftCardData?.cardNumber,
    }),
    [
      appliedAdjustment,
      appliedDiscount,
      giftCardData,
      currentLocationId,
      currentUserId,
      customer?.id,
      lineItems,
    ]
  );

  const resetTransactionState = useCallback(() => {
    lineItems.forEach((item) => removeItem(item.id));
    clearCustomer();
    setAppliedDiscount(null);
    setGiftCardData(null);
    setAppliedAdjustment(null);
    setNumpadValue('');
    setSelectedItem('');
    setActiveTab('lines');
    setActiveSection('actions');
    setIsPaymentModalOpen(false);
    setPaymentEntries([]);
    setPaymentDialogError(null);
    setCurrentParkedOrderId(null);
  }, [clearCustomer, lineItems, removeItem]);

  const handleVoidTransaction = useCallback(() => {
    if (lineItems.length > 0 || customer) {
      setIsVoidConfirmationOpen(true);
    } else {
      show('No transaction to void', 'info');
    }
  }, [lineItems.length, customer, show]);

  const handleConfirmVoid = useCallback(() => {
    resetTransactionState();
    setIsVoidConfirmationOpen(false);
    show('Transaction voided', 'success');
  }, [resetTransactionState, show]);

  const completeOrder = useCallback(
    async (payments: OrderPaymentInput[]): Promise<boolean> => {
      if (lineItems.length === 0) {
        show('Cannot complete empty order', 'error');
        return false;
      }

      const repo = effectiveSalesOrderRepo;
      if (!repo) {
        show('Sales order repository not configured. Please run the desktop or web build with data access enabled.', 'error');
        return false;
      }

      const orderData = buildOrderInput(payments);

      try {
        const result = await repo.createOrder(orderData);

      if (result.success && result.order) {
        show(`Order completed! Order #: ${result.order.orderNumber}`, 'success');

          if (currentParkedOrderId && effectiveParkedOrderRepo) {
          try {
              await effectiveParkedOrderRepo.completeParkedOrder(currentParkedOrderId);
            setCurrentParkedOrderId(null);
            handleSearchParkedOrders('');
          } catch (err) {
            console.error('[Transactions] Failed to complete parked order:', err);
          }
        }

          resetTransactionState();
          return true;
        }

        show(result.error || 'Failed to complete order', 'error');
        return false;
    } catch (err: any) {
      console.error('[Transactions] Failed to complete order:', err);
      show(err.message || 'Failed to complete order', 'error');
        return false;
      }
    },
    [
      buildOrderInput,
      currentParkedOrderId,
      handleSearchParkedOrders,
      lineItems,
      effectiveParkedOrderRepo,
      effectiveSalesOrderRepo,
      resetTransactionState,
      show,
    ]
  );

  const handleAddPaymentEntry = useCallback((payment: Omit<PaymentCollectionEntry, 'id'>) => {
    setPaymentEntries((prev) => [...prev, { id: createTempId(), ...payment }]);
  }, []);

  const handleRemovePaymentEntry = useCallback((id: string) => {
    setPaymentEntries((prev) => prev.filter((payment) => payment.id !== id));
  }, []);

  const paymentAmountPaid = useMemo(
    () => paymentEntries.reduce((sum, payment) => sum + payment.amount, 0),
    [paymentEntries]
  );

  const paymentAmountDue = useMemo(
    () => Number((orderTotals.total - paymentAmountPaid).toFixed(2)),
    [orderTotals.total, paymentAmountPaid]
  );

  const paymentMethodsToDisplay = availablePaymentMethods.length
    ? availablePaymentMethods
    : FALLBACK_PAYMENT_METHODS;

  const changeDue = Math.max(0, paymentAmountPaid - orderTotals.total);

  const canSubmitPayments =
    paymentEntries.length > 0 && (orderTotals.total === 0 || paymentAmountDue <= 0.01) && !isSubmittingPayment;

  const paymentModalKey = paymentDialogMode ?? 'default';

  const handleClosePaymentModal = useCallback(() => {
    setIsPaymentModalOpen(false);
    setPaymentDialogMode(null);
    setPaymentEntries([]);
    setPaymentDialogError(null);
  }, []);

  const handleInitiatePayment = useCallback(
    (mode: 'cash' | 'card') => {
    if (lineItems.length === 0) {
      show('Cannot complete empty order', 'error');
      return;
    }

      setPaymentEntries([]);
      setPaymentDialogMode(mode);
      setPaymentDialogError(null);
      setIsPaymentModalOpen(true);
      void loadPaymentMethods();
    },
    [lineItems.length, loadPaymentMethods, show]
  );

  const handleSubmitPayments = useCallback(async () => {
    if (paymentEntries.length === 0) {
      setPaymentDialogError('Add at least one payment to continue.');
      return;
    }

    if (orderTotals.total > 0 && paymentAmountDue > 0.01) {
      setPaymentDialogError('Collect the remaining balance before completing the order.');
      return;
    }

    setPaymentDialogError(null);
    setIsSubmittingPayment(true);
    try {
      const payments: OrderPaymentInput[] = paymentEntries.map((payment) => ({
        paymentMethodId: payment.paymentMethodId,
        amount: payment.amount,
        cardLast4: payment.cardLast4,
        cardBrand: payment.cardBrand,
        authorizationCode: payment.authorizationCode,
        transactionId: payment.transactionId,
      }));

      const success = await completeOrder(payments);
      if (success) {
        handleClosePaymentModal();
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  }, [completeOrder, handleClosePaymentModal, paymentAmountDue, paymentEntries, orderTotals.total]);

  const handleApplyDiscount = () => {
    const parsed = parseFloat(discountInput);
    if (Number.isNaN(parsed) || parsed < 0) {
      show('Enter a valid discount value', 'error');
      return;
    }
    setAppliedDiscount({ type: discountMode, value: parsed });
    setIsDiscountModalOpen(false);
    show('Discount applied', 'success');
  };

  const handleApplyGiftCard = () => {
    if (!giftCardNumberInput.trim()) {
      show('Enter a gift card number', 'error');
      return;
    }
    const parsed = giftCardValueInput ? parseFloat(giftCardValueInput) : 0;
    if (Number.isNaN(parsed) || parsed < 0) {
      show('Enter a valid gift card value', 'error');
      return;
    }
    setGiftCardData({ cardNumber: giftCardNumberInput.trim(), discount: parsed });
    setIsGiftCardModalOpen(false);
    show('Gift card applied', 'success');
  };

  const handleApplyAdjustment = () => {
    if (!adjustmentAmountInput.trim()) {
      show('Enter an adjustment amount', 'error');
      return;
    }
    const parsed = parseFloat(adjustmentAmountInput);
    if (Number.isNaN(parsed)) {
      show('Enter a valid number', 'error');
      return;
    }
    setAppliedAdjustment({ amount: parsed, reason: adjustmentReasonInput.trim() || undefined });
    setIsAdjustmentModalOpen(false);
    show('Order adjustment saved', 'success');
  };

  const actionButtons: ActionButton[] = [
    // Orange/Reddish-Brown Section
    {
      id: 'set-quantity',
      label: 'Set quantity',
      color: 'bg-orange-600',
      onClick: () => setIsQuantityPanelOpen(true),
    },
    {
      id: 'return-product',
      icon: (
        <div className="relative">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="14" height="14" rx="2" />
            <path d="M8 12h8M12 8l-4 4 4 4" />
          </svg>
        </div>
      ),
      label: 'Return product',
      color: 'bg-orange-600',
      square: true,
      rowSpan: 2,
      onClick: () => console.log('Return product'),
    },
    {
      id: 'change-unit-split',
      label: '',
      color: 'bg-orange-600',
      split: {
        left: {
          icon: <Trash2 className="w-5 h-5" />,
          onClick: () => {
            if (!selectedItem) { show('Select a line first', 'error'); return; }
            removeItem(selectedItem);
            show('Item removed', 'success');
            setSelectedItem('');
          },
        },
        right: { icon: <Ruler className="w-5 h-5" />, onClick: () => console.log('Change unit') },
      },
    },
    {
      id: 'line-comment',
      label: 'Line comment',
      color: 'bg-orange-600',
      onClick: () => setShowInvoice(true),
    },
    {
      id: 'inventory-lookup',
      label: 'Inventory lookup',
      color: 'bg-orange-600',
      onClick: () => console.log('Inventory lookup'),
    },
    // Dark Gray Section
    {
      id: 'gift-cards',
      icon: <Gift className="w-5 h-5" />,
      label: 'Gift cards',
      color: 'bg-gray-700',
      square: true,
      rectangular: true,
      onClick: openGiftCardModal,
    },
    {
      id: 'transaction-options',
      icon: <ShoppingBag className="w-5 h-5" />,
      label: 'Transaction options',
      color: 'bg-gray-700',
      square: true,
      rectangular: true,
      onClick: () => console.log('Transaction options'),
    },
    {
      id: 'voids',
      icon: <X className="w-6 h-6" />,
      label: 'Voids',
      color: 'bg-gray-700',
      square: true,
      rectangular: true,
      onClick: handleVoidTransaction,
    },
    {
      id: 'tax-overrides',
      icon: <RotateCcw className="w-5 h-5" />,
      label: 'Tax overrides',
      color: 'bg-gray-700',
      square: true,
      rectangular: true,
      onClick: () => console.log('Tax overrides'),
    },
    {
      id: 'order-discount',
      icon: <Percent className="w-5 h-5" />,
      label: 'Order discount',
      color: 'bg-gray-700',
      square: true,
      onClick: openDiscountModal,
    },
    {
      id: 'order-adjustment',
      icon: <SlidersHorizontal className="w-5 h-5" />,
      label: 'Order adjustment',
      color: 'bg-gray-700',
      square: true,
      onClick: openAdjustmentModal,
    },
    // Green Section - Small square buttons
    {
      id: 'equals',
      icon: <Equal className="w-4 h-4" />,
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => console.log('Equals'),
    },
    {
      id: 'dollars',
      icon: (
        <div className="relative w-4 h-4">
          <DollarSign className="w-4 h-4 absolute" style={{ transform: 'translateX(-2px)' }} />
          <DollarSign className="w-4 h-4 absolute" />
          <DollarSign className="w-4 h-4 absolute" style={{ transform: 'translateX(2px)' }} />
        </div>
      ),
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => console.log('Dollars'),
    },
    {
      id: 'profile',
      icon: <User className="w-4 h-4" />,
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => console.log('Profile'),
    },
    {
      id: 'heart',
      icon: <Heart className="w-4 h-4" />,
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => console.log('Heart'),
    },
    // Green Section - Payment buttons
    {
      id: 'pay-cash',
      icon: <Banknote className="w-5 h-5" />,
      label: 'Pay cash',
      color: 'bg-green-600',
      square: true,
      onClick: () => handleInitiatePayment('cash'),
    },
    {
      id: 'pay-card',
      icon: <CreditCard className="w-5 h-5" />,
      label: 'Pay card',
      color: 'bg-green-600',
      square: true,
      onClick: () => handleInitiatePayment('card'),
    },
  ];

  return (
    <div
      className="w-full flex flex-col md:flex-row"
      style={{ 
        backgroundColor: 'var(--color-bg-primary)',
        height: 'calc(100vh - var(--navbar-height, 80px))',
      }}
    >
      {/* Mobile/Tablet: Show sections in tabs or stacked */}
      <div className="flex-1 flex flex-col md:flex-row">
        <div className="w-full md:flex-1 md:max-w-[500px] lg:max-w-[600px] h-1/2 md:h-full min-h-0">
          <TransactionLines
            lineItems={lineItems}
            selectedItem={selectedItem}
            onItemSelect={setSelectedItem}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAddCustomer={() => navigate('/customers')}
            customer={customer}
            onRemoveCustomer={clearCustomer}
            billingSummary={{
              subtotal: orderTotals.subtotal,
              discount: orderTotals.discountValue,
              giftCardValue: orderTotals.giftCardValue,
              adjustment: orderTotals.adjustmentValue,
              tax: orderTotals.taxValue,
              total: orderTotals.total,
              paid: paymentEntries.length > 0 ? paymentAmountPaid : 0,
            }}
          />
        </div>

        <div className="w-full md:w-auto md:flex-shrink-0 h-1/2 md:h-full min-h-0">
          <TransactionNumpad
            value={numpadValue}
            onValueChange={setNumpadValue}
            onAddCustomer={() => navigate('/customers')}
          />
        </div>
      </div>

      <div className="w-full md:w-auto md:flex-shrink-0 hidden md:flex">
        <TransactionActions
          actions={actionButtons}
          activeSection={activeSection}
          onSectionClick={(section) => {
            setActiveSection(section);
            console.log('Section:', section);
          }}
          products={productList}
          onProductClick={handleProductClick}
          onAddProduct={handleAddProduct}
        />
      </div>

      {/* Mobile Action Bar - Show key actions at bottom */}
      <div className="md:hidden w-full flex gap-2 p-2 bg-gray-800 border-t border-gray-700">
        <button
          onClick={() => handleInitiatePayment('cash')}
          className="flex-1 py-3 rounded bg-green-600 text-white font-semibold flex items-center justify-center gap-2"
        >
          <Banknote className="w-5 h-5" />
          Cash
        </button>
        <button
          onClick={() => handleInitiatePayment('card')}
          className="flex-1 py-3 rounded bg-green-600 text-white font-semibold flex items-center justify-center gap-2"
        >
          <CreditCard className="w-5 h-5" />
          Card
        </button>
        <button
          onClick={() => console.log('More actions')}
          className="px-4 py-3 rounded bg-gray-700 text-white font-semibold"
        >
          •••
        </button>
      </div>

      {/* Quantity Panel - Opens with Ctrl+Shift+P */}
      <TransactionQuantityPanel
        isOpen={isQuantityPanelOpen}
        onClose={() => setIsQuantityPanelOpen(false)}
        itemName={selectedItemData?.name}
        unitOfMeasure={selectedItemData ? 'Each' : undefined}
        initialQuantity={selectedItemData?.quantity.toString() || '1'}
        onQuantityConfirm={(quantity) => {
          const q = Math.max(0, parseInt(quantity, 10) || 0);
          if (selectedItem) {
            if (q === 0) {
              removeItem(selectedItem);
            } else {
              setItemQuantity(selectedItem, q, show);
            }
          }
        }}
      />

      {/* Test Invoice Modal */}
      {showInvoice && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowInvoice(false)}
        >
          <div
            className="bg-[var(--color-bg-primary)] p-3 rounded-none max-h-[90vh] overflow-auto border"
            style={{ borderColor: 'var(--color-border-light)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Invoice
              brand={{ storeName: 'PayFlow' }}
              invoiceNo="TEST-0001"
              date={new Date().toLocaleString()}
              cashier="Tester"
              items={lineItems.map(li => ({ id: li.id, name: li.name, quantity: li.quantity, unitPrice: li.price }))}
              subTotal={lineItems.reduce((s, li) => s + li.price * li.quantity, 0)}
              tax={0}
              discount={0}
              grandTotal={lineItems.reduce((s, li) => s + li.price * li.quantity, 0)}
              paymentMethod="Cash"
            />
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div
          className="fixed inset-0 z-[205] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-3xl bg-[var(--color-bg-primary)] border rounded-lg shadow-xl flex flex-col max-h-[90vh]"
            style={{ borderColor: 'var(--color-border-light)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--color-border-light)' }}
            >
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                  {paymentDialogMode === 'card' ? 'Card Payment' : 'Cash Payment'}
                </p>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Collect payment
                </h3>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="p-2 rounded hover:bg-[var(--color-bg-secondary)]"
                aria-label="Close payment dialog"
                disabled={isSubmittingPayment}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isPaymentMethodsLoading && (
              <div className="px-4 py-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Loading payment methods...
              </div>
            )}

            <div className="p-4 overflow-y-auto">
              <PaymentCollection
                key={paymentModalKey}
                payments={paymentEntries}
                paymentMethods={paymentMethodsToDisplay}
                totalAmount={orderTotals.total}
                amountPaid={paymentAmountPaid}
                amountDue={paymentAmountDue}
                onAddPayment={handleAddPaymentEntry}
                onRemovePayment={handleRemovePaymentEntry}
                disabled={isSubmittingPayment}
              />

              {paymentDialogError && (
                <div className="mt-3 text-sm font-medium text-red-500">{paymentDialogError}</div>
              )}
            </div>

            <div
              className="px-4 py-3 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              style={{ borderColor: 'var(--color-border-light)' }}
            >
              <div className="space-y-1 text-sm">
                <div style={{ color: 'var(--color-text-secondary)' }}>Order total</div>
                <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(orderTotals.total)}
                </div>
                <div
                  className="text-sm"
                  style={{ color: paymentAmountDue > 0 ? 'var(--color-error)' : 'var(--color-success)' }}
                >
                  {paymentAmountDue > 0
                    ? `Remaining balance: ${formatCurrency(paymentAmountDue)}`
                    : `Change due: ${formatCurrency(changeDue)}`}
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-end">
                <button
                  onClick={handleClosePaymentModal}
                  className="px-4 py-2 rounded border text-sm font-medium"
                  style={{
                    borderColor: 'var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                  }}
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPayments}
                  disabled={!canSubmitPayments}
                  className="px-5 py-2 rounded text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--color-accent-blue)' }}
                >
                  {isSubmittingPayment ? 'Processing...' : 'Confirm & Complete Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DiscountPrompt
        isOpen={isDiscountModalOpen}
        mode={discountMode}
        value={discountInput}
        current={appliedDiscount}
        onModeChange={setDiscountMode}
        onValueChange={setDiscountInput}
        onApply={handleApplyDiscount}
        onClose={() => setIsDiscountModalOpen(false)}
      />

      <CouponPrompt
        isOpen={isGiftCardModalOpen}
        code={giftCardNumberInput}
        value={giftCardValueInput}
        current={giftCardData ? { code: giftCardData.cardNumber, discount: giftCardData.discount } : null}
        onCodeChange={setGiftCardNumberInput}
        onValueChange={setGiftCardValueInput}
        onApply={handleApplyGiftCard}
        onClose={() => setIsGiftCardModalOpen(false)}
        title="Gift Card"
        codeLabel="Card Number"
      />

      <AdjustmentPrompt
        isOpen={isAdjustmentModalOpen}
        amount={adjustmentAmountInput}
        reason={adjustmentReasonInput}
        current={appliedAdjustment}
        onAmountChange={setAdjustmentAmountInput}
        onReasonChange={setAdjustmentReasonInput}
        onApply={handleApplyAdjustment}
        onClose={() => setIsAdjustmentModalOpen(false)}
      />

      <PreviewPrompt
        isOpen={isPreviewModalOpen}
        lineItems={lineItems}
        totals={orderTotals}
        giftCard={giftCardData}
        adjustment={appliedAdjustment}
        onClose={() => setIsPreviewModalOpen(false)}
      />

      {/* Parked Orders Search Modal - Opens with Ctrl+Shift+Z */}
      <ParkedOrderSearch
        isOpen={isParkedOrdersModalOpen}
        onClose={() => setIsParkedOrdersModalOpen(false)}
        onLoadOrder={handleLoadParkedOrder}
        onDeleteOrder={handleDeleteParkedOrder}
        parkedOrders={parkedOrders}
        onSearch={handleSearchParkedOrders}
        isLoading={loadingParkedOrders}
      />

      {/* Void Confirmation Modal */}
      <ConfirmationModal
        isOpen={isVoidConfirmationOpen}
        onClose={() => setIsVoidConfirmationOpen(false)}
        onConfirm={handleConfirmVoid}
        title="Void Transaction"
        message="Are you sure you want to void this transaction? All cart data will be cleared."
        confirmText="Void Transaction"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}

export default Transactions;

