import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TransactionLines,
  TransactionNumpad,
  TransactionActions,
  TransactionQuantityPanel,
  TransactionDiscountPanel,
  TransactionAdjustmentPanel,
  TransactionCouponPanel,
  TransactionGiftCardPanel,
  Invoice,
  PreviewPrompt,
  ParkedOrderSearch,
  CompactPaymentPanel,
  ConfirmationModal,
  SalesPersonModal,
  type SalesPersonData,
  type Payment as PaymentCollectionEntry,
  type PaymentMethod as PaymentCollectionMethod,
  type ActionButton,
  type Product,
  useCart,
  useTransactionCustomer,
  useToast,
  useKeyboardShortcuts,
  useSalesPersonModal,
  usePrintReceipt,
  PrintConfirmationDialog,
} from '@monorepo/shared-ui';
import { useBarcodeScanner } from '@monorepo/shared-hooks-scanner';
import { useCurrency, type Currency } from '@monorepo/shared-hooks-currency';
import { parsePriceValue } from '../utils/price';
import { useAppDateTime } from '@monorepo/shared-hooks-datetime';
import type { Customer as TransactionCustomer } from '../components/customer/CustomerCard';
import {
  Archive,
  FolderOpen,
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
  Trash2,
  Percent,
  TicketPercent,
  SlidersHorizontal,
  Eye,
  BadgeDollarSign,
  BadgePercent,
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
  SalesPersonRepository,
  SalesPerson as RepoSalesPerson,
} from '@monorepo/shared-data-access';
import {
  WebIndexedDbClient,
  HttpApiClient,
  SalesOrderRepository as SalesOrderRepositoryClass,
  ParkedOrderRepository as ParkedOrderRepositoryClass,
  PaymentMethodRepository as PaymentMethodRepositoryClass,
  SalesPersonRepository as SalesPersonRepositoryClass,
  seedPaymentMethods,
  type IndexedDBSchema,
} from '@monorepo/shared-data-access';

const TAX_RATE = 0.03;
const AUTO_IDB_DB_NAME = 'transactions-autoconfig';
const AUTO_IDB_DB_VERSION = 1;
const LAST_PAYMENT_SESSION_KEY = 'transactions-last-payment-session';

const buildPaymentSessionKey = (items: Array<{ id: string }>, total: number) => {
  if (!items || items.length === 0) {
    return null;
  }
  const itemIds = [...items].map((item) => item.id).sort().join(',');
  const normalizedTotal = Number.isFinite(total) ? total : 0;
  return `payment-session-${itemIds}-${normalizedTotal}`;
};

type SalesPersonSelectionTarget =
  | { type: 'order' }
  | { type: 'line'; lineId: string };

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

const SAMPLE_COUPONS: Record<string, { type: 'amount' | 'percent'; value: number; description: string }> = {
  SAVE5: { type: 'amount', value: 5, description: '$5 off order' },
  SAVE10: { type: 'amount', value: 10, description: '$10 off order' },
  TAKE15: { type: 'percent', value: 15, description: '15% off order' },
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
  salesPersonRepo?: SalesPersonRepository;
  // Current user/location - injected by app
  currentUserId?: string;
  currentLocationId?: string;
}

export function Transactions({
  productRepository,
  salesOrderRepo,
  parkedOrderRepo,
  paymentMethodRepo,
  salesPersonRepo,
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
  const location = useLocation();
  
  // Load initial state from localStorage
  const [activeTab, setActiveTabState] = useState<'lines' | 'payments'>(() => {
    const saved = localStorage.getItem('transactions-activeTab');
    return (saved === 'lines' || saved === 'payments') ? saved : 'lines';
  });
  
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [numpadValue, setNumpadValue] = useState<string>('');
  const [isManualBarcodeMode, setIsManualBarcodeMode] = useState(false);
  const manualBarcodeModeRef = useRef(isManualBarcodeMode);
  const numpadValueRef = useRef(numpadValue);
  
  const [activeSection, setActiveSectionState] = useState<string>(() => {
    const saved = localStorage.getItem('transactions-activeSection');
    return saved || 'actions';
  });
  
  const [isQuantityPanelOpen, setIsQuantityPanelOpen] = useState(false);
  const [isCouponPanelOpen, setIsCouponPanelOpen] = useState(false);
  const [isAmountDiscountPanelOpen, setIsAmountDiscountPanelOpen] = useState(false);
  const [isPercentDiscountPanelOpen, setIsPercentDiscountPanelOpen] = useState(false);
  const [isGiftCardPanelOpen, setIsGiftCardPanelOpen] = useState(false);
  const [isAdjustmentPanelOpen, setIsAdjustmentPanelOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isVoidConfirmationOpen, setIsVoidConfirmationOpen] = useState(false);
  const [discountAmountInput, setDiscountAmountInput] = useState('');
  const [discountPercentInput, setDiscountPercentInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: 'amount' | 'percent'; value: number } | null>(null);
  const [discountSource, setDiscountSource] = useState<'manual' | 'coupon' | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: 'amount' | 'percent'; value: number } | null>(null);
  const [giftCardNumberInput, setGiftCardNumberInput] = useState('');
  const [giftCardValueInput, setGiftCardValueInput] = useState('');
  const [giftCardData, setGiftCardData] = useState<{ cardNumber: string; discount: number } | null>(null);
  const [requireLineItemSalesPerson, setRequireLineItemSalesPerson] = useState(false);
  const [adjustmentAmountInput, setAdjustmentAmountInput] = useState('');
  const [adjustmentReasonInput, setAdjustmentReasonInput] = useState('');
  const [appliedAdjustment, setAppliedAdjustment] = useState<{ amount: number; reason?: string } | null>(null);
  const salesOrderRepoRef = useRef<SalesOrderRepository | null>(null);
  const { items: lineItems, setItemQuantity, removeItem, addItem, updateItem } = useCart();
  const { customer, setCustomer, clearCustomer } = useTransactionCustomer();
  const { show } = useToast();
  const { formatAmount, setCurrency } = useCurrency({ defaultCurrency: 'PKR' });
  const { formatDateTime } = useAppDateTime();
  // Product catalog data to resolve names for recalled orders
  const fallbackProducts = useMemo<Product[]>(() => [
    { id: '81328', productNumber: '81328', name: 'Brown Leopardprint Sunglasses', price: '$130.00', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81300', productNumber: '81300', name: 'Brown Leather Travel Bag', price: '$89.99', rating: 3.8, reviewCount: 195, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
    { id: '81302', productNumber: '81302', name: 'Brown Snakeskin Bag', price: '$95.00', rating: 3.8, reviewCount: 192, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop' },
    { id: '81333', productNumber: '81333', name: 'Silver Stunner Sunglasses', price: '$42.00', rating: 3.7, reviewCount: 192, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81327', productNumber: '81327', name: 'Black Wireframe Sunglasses', price: '$120.00', rating: 3.8, reviewCount: 190, image: 'https://images.unsplash.com/photo-1518288774672-b94e8088736b?w=400&h=400&fit=crop' },
    { id: '81329', productNumber: '81329', name: 'Black Thick Rimmed Sunglasses', price: '$48.00', rating: 3.8, reviewCount: 193, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81330', productNumber: '81330', name: 'Brown Aviator Sunglasses', price: '$150.00', rating: 3.9, reviewCount: 195, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81331', productNumber: '81331', name: 'Pink Thick Rimmed Sunglasses', price: '$52.00', rating: 3.7, reviewCount: 188, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81319', productNumber: '81319', name: 'Brown Glove & Scarf Set', price: '$35.99', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop' },
    { id: '81323', productNumber: '81323', name: 'Grey Cotton Gloves', price: '$28.50', rating: 3.8, reviewCount: 192, image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop' },
    { id: '81320', productNumber: '81320', name: 'Brown Leather Gloves', price: '$38.00', rating: 3.8, reviewCount: 190, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop' },
    { id: '81321', productNumber: '81321', name: 'Black Cotton Gloves', price: '$32.00', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop' },
  ], []);
  const [productList, setProductList] = useState<Product[]>(fallbackProducts);
  const variantNameCacheRef = useRef<Map<string, { name?: string | null; productId?: string | null }>>(new Map());
  const productNameCacheRef = useRef<Map<string, string>>(new Map());
  const partialPaymentsHydratedAtRef = useRef<number>(0);

  const cacheVariantMapping = useCallback(
    (variantId?: string | null, productId?: string | null, name?: string | null) => {
      if (productId && name) {
        productNameCacheRef.current.set(productId, name);
      }
      if (variantId) {
        const existing = variantNameCacheRef.current.get(variantId) ?? {};
        variantNameCacheRef.current.set(variantId, {
          name: name ?? existing.name ?? null,
          productId: productId ?? existing.productId ?? null,
        });
      }
    },
    [],
  );

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

  const resolveNameFromCatalog = useCallback(
    (variantId?: string | null, fallbackProductId?: string | null) => {
      const normalizedVariantId = variantId ?? undefined;
      let normalizedProductId = fallbackProductId ?? undefined;

      if (!normalizedVariantId && !normalizedProductId) {
        return null;
      }

      if (normalizedVariantId) {
        const cachedVariant = variantNameCacheRef.current.get(normalizedVariantId);
        if (cachedVariant?.name) {
          return cachedVariant.name;
        }
        if (!normalizedProductId && cachedVariant?.productId) {
          normalizedProductId = cachedVariant.productId ?? undefined;
        }
      }

      if (normalizedProductId) {
        const cachedProductName = productNameCacheRef.current.get(normalizedProductId);
        if (cachedProductName) {
          cacheVariantMapping(normalizedVariantId, normalizedProductId, cachedProductName);
          return cachedProductName;
        }
      }

      const localProduct = productList.find((product) => {
        const productId = (product as any).productId || product.id;
        return product.id === normalizedVariantId || productId === normalizedProductId;
      });

      if (localProduct) {
        const derivedProductId = (localProduct as any).productId || localProduct.id;
        cacheVariantMapping(normalizedVariantId, derivedProductId, localProduct.name);
        return localProduct.name;
      }

      return null;
    },
    [productList, cacheVariantMapping],
  );

  const prefetchVariantNames = useCallback(
    async (
      items: Array<{ variantId?: string | null; productId?: string | null; productVariantId?: string | null }>,
    ) => {
      const repoWithLookups = productRepository as unknown as {
        getVariantById?: (
          variantId: string,
        ) => Promise<{ name?: string; variantName?: string; sku?: string; productId?: string; product?: { id?: string; name?: string } } | null>;
        getProductById?: (productId: string) => Promise<{ name?: string | null } | null>;
      };
      const salesOrderRepo = salesOrderRepoRef.current;

      const variantIdsToFetch = new Set<string>();
      const productIdsToFetch = new Set<string>();

      items.forEach((item) => {
        const variantId = item.variantId ?? item.productVariantId ?? undefined;
        const productId = item.productId ?? undefined;
        const existingName = resolveNameFromCatalog(variantId, productId);

        if (!existingName) {
          if (
            variantId &&
            (typeof repoWithLookups?.getVariantById === 'function' ||
              typeof salesOrderRepo?.getVariantDetails === 'function')
          ) {
            variantIdsToFetch.add(variantId);
          } else if (productId && typeof repoWithLookups?.getProductById === 'function') {
            productIdsToFetch.add(productId);
          }
        }
      });

      await Promise.all(
        Array.from(variantIdsToFetch).map(async (variantId) => {
          try {
            let variant = await repoWithLookups?.getVariantById?.(variantId);
            if (variant) {
              const derivedProductId = variant.productId || variant.product?.id;
              const variantName = variant.name || variant.variantName || variant.sku || null;
              if (variantName || derivedProductId) {
                cacheVariantMapping(variantId, derivedProductId, variantName);
              }

              if (!variantName && derivedProductId && typeof repoWithLookups?.getProductById === 'function') {
                const product = await repoWithLookups.getProductById?.(derivedProductId);
                if (product?.name) {
                  cacheVariantMapping(variantId, derivedProductId, product.name);
                }
              }
            } else if (salesOrderRepo?.getVariantDetails) {
              const details = await salesOrderRepo.getVariantDetails(variantId);
              if (details) {
                const variantName =
                  details.variantName ||
                  details.productName ||
                  details.sku ||
                  null;
                cacheVariantMapping(variantId, details.productId, variantName);
              }
            }
          } catch (error) {
            // Ignore lookup errors, we'll fall back to default names later
          }
        }),
      );

      await Promise.all(
        Array.from(productIdsToFetch)
          .filter((productId) => !productNameCacheRef.current.has(productId))
          .map(async (productId) => {
            try {
              const product = await repoWithLookups?.getProductById?.(productId);
              if (product?.name) {
                cacheVariantMapping(undefined, productId, product.name);
              }
            } catch (error) {
              // Ignore lookup errors
            }
          }),
      );
    },
    [productRepository, resolveNameFromCatalog, cacheVariantMapping],
  );
  useEffect(() => {
    manualBarcodeModeRef.current = isManualBarcodeMode;
  }, [isManualBarcodeMode]);
  useEffect(() => {
    numpadValueRef.current = numpadValue;
  }, [numpadValue]);
  // Parked orders state
  const [isParkedOrdersModalOpen, setIsParkedOrdersModalOpen] = useState(false);
  const [parkedOrders, setParkedOrders] = useState<ParkedOrderListItem[]>([]);
  const [loadingParkedOrders, setLoadingParkedOrders] = useState(false);
  const [currentParkedOrderId, setCurrentParkedOrderId] = useState<string | null>(null);
  const [currentParkedOrderOriginalId, setCurrentParkedOrderOriginalId] = useState<string | null>(null); // Original order ID for parked orders
  const [pendingResumeOrder, setPendingResumeOrder] = useState<ParkedOrderListItem | null>(null);
  const [pendingResumeIds, setPendingResumeIds] = useState<{ parkedOrderId: string; orderId: string } | null>(null);
  const [isResumeConfirmOpen, setIsResumeConfirmOpen] = useState(false);
  
  // Track if current transaction is from a recalled order (not a new order)
  const [isRecalledOrder, setIsRecalledOrder] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return sessionStorage.getItem('transactions-isRecalledOrder') === 'true';
  });
  const [recalledOrderId, setRecalledOrderId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem('transactions-recalledOrderId');
  });
  // Persist recalled order state so navigating away (e.g. to the return page) doesn't reset it
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (isRecalledOrder) {
      sessionStorage.setItem('transactions-isRecalledOrder', 'true');
    } else {
      sessionStorage.removeItem('transactions-isRecalledOrder');
    }
  }, [isRecalledOrder]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (recalledOrderId) {
      sessionStorage.setItem('transactions-recalledOrderId', recalledOrderId);
    } else {
      sessionStorage.removeItem('transactions-recalledOrderId');
    }
  }, [recalledOrderId]);

  // Sales person state
  const [salesPersons, setSalesPersons] = useState<SalesPersonData[]>([]);
  const [salesPersonsLoading, setSalesPersonsLoading] = useState(false);
  const [assignedSalesPerson, setAssignedSalesPerson] = useState<SalesPersonData | null>(null);
  const getSalesPersonNameForLine = useCallback(
    (lineItem?: any): string | undefined => {
      if (!lineItem) {
        return assignedSalesPerson?.name || undefined;
      }

      const directName =
        (typeof lineItem.salesPersonName === 'string' && lineItem.salesPersonName.trim()) ||
        (lineItem.salesPerson && typeof lineItem.salesPerson === 'object'
          ? lineItem.salesPerson.name ||
            `${lineItem.salesPerson.firstName ?? ''} ${lineItem.salesPerson.lastName ?? ''}`.trim()
          : '') ||
        '';

      if (directName) {
        return directName;
      }

      if (lineItem.salesPersonId) {
        const match = salesPersons.find((person) => person.id === lineItem.salesPersonId);
        if (match) {
          return match.name || match.code || match.id;
        }
      }

      return assignedSalesPerson?.name || undefined;
    },
    [assignedSalesPerson?.name, salesPersons],
  );

  const salesPersonModal = useSalesPersonModal({
    enabled: true,
  });
  const [salesPersonSelectionTarget, setSalesPersonSelectionTarget] = useState<SalesPersonSelectionTarget>({ type: 'order' });
  const [missingSalesPersonLineIds, setMissingSalesPersonLineIds] = useState<string[]>([]);

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
    storeName: 'AL IMRAN BOUTIQUE',
    storeNameArabic: 'العمران',
    storeUrl: 'http://www.alimranboutique.com',
    posNumber: 'ALIMRAN BOUTIQUE',
    onPrintSuccess: () => {
      console.log('[Transactions] Receipt printed successfully');
    },
    onPrintError: (error) => {
      console.error('[Transactions] Print error:', error);
      show('Failed to print receipt: ' + error.message, 'error');
    },
  });
  const formatCurrency = useCallback(
    (amount: number) => formatAmount(amount, { showSymbol: true }),
    [formatAmount],
  );
  // Get selected item data
  const selectedItemData = useMemo(() => {
    return selectedItem ? lineItems.find(item => item.id === selectedItem) : null;
  }, [selectedItem, lineItems]);
  const selectedLineItem = useMemo(
    () => (selectedItem ? lineItems.find((item) => item.id === selectedItem) ?? null : null),
    [lineItems, selectedItem]
  );
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
    salesPersonRepo?: SalesPersonRepository;
  }>({});
  const handleRemoveCustomer = useCallback(() => {
    clearCustomer();
    show('Customer removed from transaction', 'info');
  }, [clearCustomer, show]);

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

        // Auto-seed payment methods after database initialization
        console.log('[Transactions] Auto-seeding payment methods...');
        await seedPaymentMethods(dbClient);
        console.log('[Transactions] Payment methods seeding complete');

        try {
          const storeConfigs = await dbClient.query<{
            defaultCurrency?: string;
            requireLineItemSalesPerson?: number | boolean;
          }>('StoreConfig');
          const storeConfigRecord = storeConfigs[0];
          if (storeConfigRecord) {
            if (storeConfigRecord.defaultCurrency) {
              setCurrency(storeConfigRecord.defaultCurrency as Currency);
              // console.log('[Transactions] Applied currency from StoreConfig:', storeConfigRecord.defaultCurrency);
            }
            if (typeof storeConfigRecord.requireLineItemSalesPerson !== 'undefined') {
              const requireFlag =
                storeConfigRecord.requireLineItemSalesPerson === true ||
                storeConfigRecord.requireLineItemSalesPerson === 1;
              setRequireLineItemSalesPerson(requireFlag);
            }
          }
        } catch (currencyError) {
          // console.warn('[Transactions] Failed to load currency from StoreConfig:', currencyError);
        }

        const apiClient = new HttpApiClient();
        await apiClient.initialize().catch((err) => {
          // console.warn('[Transactions] API client initialization warning:', err);
        });

        if (!isActive) return;

        setAutoRepos({
          salesOrderRepo: new SalesOrderRepositoryClass(dbClient, apiClient),
          parkedOrderRepo: new ParkedOrderRepositoryClass(dbClient, apiClient),
          paymentMethodRepo: new PaymentMethodRepositoryClass(dbClient, apiClient),
          salesPersonRepo: new SalesPersonRepositoryClass(dbClient, apiClient),
        });
      } catch (err) {
        if (!isActive) return;
        // console.error('[Transactions] Failed to auto-configure repositories:', err);
      }
    };

    void configureRepos();

    return () => {
      isActive = false;
    };
  }, [autoRepos.salesOrderRepo, salesOrderRepo, setCurrency]);

  const effectiveSalesOrderRepo = useMemo(
    () => salesOrderRepo ?? autoRepos.salesOrderRepo,
    [salesOrderRepo, autoRepos.salesOrderRepo]
  );
  useEffect(() => {
    salesOrderRepoRef.current = effectiveSalesOrderRepo ?? null;
  }, [effectiveSalesOrderRepo]);
  const effectiveParkedOrderRepo = useMemo(
    () => parkedOrderRepo ?? autoRepos.parkedOrderRepo,
    [parkedOrderRepo, autoRepos.parkedOrderRepo]
  );
  const effectivePaymentMethodRepo = useMemo(
    () => paymentMethodRepo ?? autoRepos.paymentMethodRepo,
    [paymentMethodRepo, autoRepos.paymentMethodRepo]
  );
  const effectiveSalesPersonRepo = useMemo(
    () => salesPersonRepo ?? autoRepos.salesPersonRepo,
    [salesPersonRepo, autoRepos.salesPersonRepo]
  );

  const loadSalesPersons = useCallback(async () => {
    if (!effectiveSalesPersonRepo) {
      return;
    }
    setSalesPersonsLoading(true);
    try {
      const result = await effectiveSalesPersonRepo.getSalesPersons({ isActive: true, limit: 200 });
      if (result.success && result.salesPersons) {
        setSalesPersons(
          result.salesPersons.map((person: RepoSalesPerson) => ({
            id: person.id,
            code: person.code,
            name: person.name,
            email: person.email ?? undefined,
            phone: person.phone ?? undefined,
            commission: person.commission ?? undefined,
            isActive: person.isActive,
          }))
        );
      } else if (result.error) {
        show(result.error, 'error');
      }
    } catch (error: any) {
      // console.error('[Transactions] Failed to load sales persons:', error);
      show(error?.message || 'Failed to load sales reps', 'error');
    } finally {
      setSalesPersonsLoading(false);
    }
  }, [effectiveSalesPersonRepo, show]);

  useEffect(() => {
    if (!effectiveSalesPersonRepo) {
      return;
    }
    void loadSalesPersons();
  }, [effectiveSalesPersonRepo, loadSalesPersons]);

  useEffect(() => {
    if (
      !salesPersonModal.isOpen ||
      salesPersonsLoading ||
      salesPersons.length > 0
    ) {
      return;
    }
    void loadSalesPersons();
  }, [salesPersonModal.isOpen, salesPersons.length, salesPersonsLoading, loadSalesPersons]);

  useEffect(() => {
    // Only update if assignedSalesPerson exists and needs to be synced with latest data
    // Do NOT automatically assign first sales person - let user choose manually
    if (assignedSalesPerson && salesPersons.length > 0) {
      const match = salesPersons.find((sp) => sp.id === assignedSalesPerson.id);
      if (match && (match.name !== assignedSalesPerson.name || match.code !== assignedSalesPerson.code)) {
        setAssignedSalesPerson(match);
      }
    }
  }, [assignedSalesPerson, salesPersons]);

  useEffect(() => {
    if (salesPersonSelectionTarget.type !== 'order') {
      return;
    }
    if (assignedSalesPerson) {
      salesPersonModal.setSelectedPerson(assignedSalesPerson);
    } else {
      salesPersonModal.setSelectedPerson(null);
    }
  }, [assignedSalesPerson, salesPersonModal, salesPersonSelectionTarget.type]);

  useEffect(() => {
    if (!missingSalesPersonLineIds.length) {
      return;
    }
    const unresolved = missingSalesPersonLineIds.filter((lineId) => {
      const line = lineItems.find((item) => item.id === lineId);
      return line && !line.salesPersonId;
    });
    if (unresolved.length !== missingSalesPersonLineIds.length) {
      setMissingSalesPersonLineIds(unresolved);
    }
  }, [lineItems, missingSalesPersonLineIds]);


  // Keyboard shortcuts
  const openAmountDiscountPanel = useCallback(() => {
    if (selectedLineItem && selectedLineItem.lineDiscountType === 'amount') {
      const existing =
        selectedLineItem.lineDiscountValue ??
        selectedLineItem.lineDiscount ??
        0;
      setDiscountAmountInput(existing ? String(existing) : '');
    } else if (!selectedLineItem && appliedDiscount?.type === 'amount') {
      setDiscountAmountInput(String(appliedDiscount.value));
    } else {
      setDiscountAmountInput('');
    }
    setIsAmountDiscountPanelOpen(true);
  }, [selectedLineItem, appliedDiscount]);

  const openPercentDiscountPanel = useCallback(() => {
    if (selectedLineItem && selectedLineItem.lineDiscountType === 'percent') {
      const existing =
        selectedLineItem.lineDiscountValue ??
        selectedLineItem.lineDiscount ??
        0;
      setDiscountPercentInput(existing ? String(existing) : '');
    } else if (!selectedLineItem && appliedDiscount?.type === 'percent') {
      setDiscountPercentInput(String(appliedDiscount.value));
    } else {
      setDiscountPercentInput('');
    }
    setIsPercentDiscountPanelOpen(true);
  }, [selectedLineItem, appliedDiscount]);

  const openGiftCardPanel = useCallback(() => {
    setGiftCardNumberInput(giftCardData?.cardNumber ?? '');
    setGiftCardValueInput(giftCardData ? String(giftCardData.discount) : '');
    setIsGiftCardPanelOpen(true);
  }, [giftCardData]);

  const openAdjustmentPanel = useCallback(() => {
    setAdjustmentAmountInput(appliedAdjustment ? String(appliedAdjustment.amount) : '');
    setAdjustmentReasonInput(appliedAdjustment?.reason ?? '');
    setIsAdjustmentPanelOpen(true);
  }, [appliedAdjustment]);

  // ============ Parked Order Handlers ============

  const handleSearchParkedOrders = useCallback(async (searchTerm: string) => {
    if (!effectiveParkedOrderRepo) {
      // console.warn('[Transactions] ParkedOrderRepository not available');
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
        // console.error('[Transactions] Failed to search parked orders:', result.error);
        setParkedOrders([]);
      }
    } catch (err: any) {
      // console.error('[Transactions] Error searching parked orders:', err);
      setParkedOrders([]);
    } finally {
      setLoadingParkedOrders(false);
    }
  }, [effectiveParkedOrderRepo]);

  const openParkedOrdersModal = useCallback(() => {
    setIsParkedOrdersModalOpen(true);
    void handleSearchParkedOrders('');
  }, [handleSearchParkedOrders]);

  const closeResumeModal = () => {
    setIsResumeConfirmOpen(false);
    setPendingResumeOrder(null);
    setPendingResumeIds(null);
  };

  const handleCloseParkedOrdersModal = () => {
    closeResumeModal();
    setIsParkedOrdersModalOpen(false);
  };

  const formatCustomerDisplayName = (
    input?: { name?: string | null; firstName?: string | null; lastName?: string | null } | null,
  ) => {
    if (!input) return '';
    if (input.name?.trim()) return input.name.trim();
    return `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim();
  };

  const parseDecimal = useCallback((value: any): number | undefined => {
    if (value === null || value === undefined) return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }, []);

  const hydrateTransactionFromOrder = useCallback(
    async ({
      order,
      orderLineItems,
      customerData,
    }: {
      order: any;
      orderLineItems: Array<{
        id?: string;
        variantId?: string;
        productId?: string;
        salesPersonId?: string | null;
        quantity: number;
        unitPrice: number;
        lineTotal?: number;
        variantName?: string | null;
        productName?: string | null;
      }>;
      customerData?:
        | {
            id?: string | null;
            name?: string | null;
            firstName?: string | null;
            lastName?: string | null;
            email?: string | null;
            phone?: string | null;
            address?: string | null;
          }
        | null;
    }) => {
      lineItems.forEach((item) => removeItem(item.id));
      setPaymentEntries([]);
      clearCustomer();
      setAppliedDiscount(null);
      setGiftCardData(null);
      setAppliedAdjustment(null);
      
      // Mark as recalled order (not a new order)
      setIsRecalledOrder(true);
      setRecalledOrderId(order?.id || order?.orderNumber || null);

      for (const item of orderLineItems) {
        const unitPrice = parseDecimal(item.unitPrice) ?? 0;
        const quantity = parseDecimal(item.quantity) ?? 0;
        const lineSubtotal = unitPrice * quantity;
        const dbLineTotal = parseDecimal((item as any).lineTotal);

        const saleDiscountAmount = parseDecimal((item as any).lineDiscount ?? (item as any).discount);
        let customDiscountAmount = parseDecimal(
          (item as any).customDiscountAmount ?? (item as any).customDiscount?.amount,
        );
        const customDiscountPercent = parseDecimal(
          (item as any).customDiscountPercent ?? (item as any).customDiscount?.percent,
        );

        if (customDiscountAmount === undefined && customDiscountPercent !== undefined) {
          customDiscountAmount = (Math.abs(lineSubtotal) * customDiscountPercent) / 100;
        }

        const combinedDiscountFromTotal =
          dbLineTotal !== undefined ? Math.max(0, lineSubtotal - dbLineTotal) : undefined;

        let resolvedSaleDiscount = saleDiscountAmount;
        if (resolvedSaleDiscount === undefined && customDiscountAmount === undefined && combinedDiscountFromTotal !== undefined) {
          resolvedSaleDiscount = combinedDiscountFromTotal;
        }

        const finalLineTotal =
          dbLineTotal ?? lineSubtotal - ((resolvedSaleDiscount ?? 0) + (customDiscountAmount ?? 0));

        let resolvedName = '';
        let resolvedProductId = item.productId;
        let resolvedSku = (item as any).sku;

        // Debug: Log the incoming item data
        console.log('[Transactions] Hydrating line item:', {
          variantId: item.variantId,
          productId: item.productId,
          productName: item.productName,
          variantName: item.variantName,
          sku: (item as any).sku,
        });

        // Priority 1: Try productName from database query (most reliable for recalled orders)
        if (item.productName) {
          resolvedName = item.productName;
          // If we have variant name, append it
          if (item.variantName && item.variantName !== item.productName) {
            resolvedName = `${item.productName} - ${item.variantName}`;
          }
          console.log('[Transactions] Resolved name from productName:', resolvedName);
        }
        // Priority 2: Try variantName from database query
        else if (item.variantName) {
          resolvedName = item.variantName;
          console.log('[Transactions] Resolved name from variantName:', resolvedName);
        }
        // Priority 3: Try any other name field
        else if ((item as any).name) {
          resolvedName = (item as any).name;
          console.log('[Transactions] Resolved name from name field:', resolvedName);
        }
        // Priority 4: Try SKU-based name
        else if (resolvedSku) {
          resolvedName = `Item ${resolvedSku}`;
          console.log('[Transactions] Resolved name from SKU:', resolvedName);
        }

        // Priority 5: Try catalog cache
        if (!resolvedName) {
          const catalogName = resolveNameFromCatalog(item.variantId, item.productId);
          if (catalogName) {
            resolvedName = catalogName;
            console.log('[Transactions] Resolved name from catalog cache:', resolvedName);
          }
        }

        // Priority 6: Fetch from repositories if still not resolved
        if (!resolvedName && item.variantId) {
          console.log('[Transactions] Attempting to fetch variant details for:', item.variantId);

          // Try getVariantDetails first (faster, local DB query)
          if (salesOrderRepoRef.current?.getVariantDetails) {
            try {
              const variantDetails = await salesOrderRepoRef.current.getVariantDetails(item.variantId);
              if (variantDetails) {
                console.log('[Transactions] Got variant details:', variantDetails);
                // Build name from variant and product
                if (variantDetails.productName) {
                  resolvedName = variantDetails.productName;
                  if (variantDetails.variantName && variantDetails.variantName !== variantDetails.productName) {
                    resolvedName = `${variantDetails.productName} - ${variantDetails.variantName}`;
                  }
                } else if (variantDetails.variantName) {
                  resolvedName = variantDetails.variantName;
                } else if (variantDetails.sku) {
                  resolvedName = `Item ${variantDetails.sku}`;
                }

                if (!resolvedProductId) {
                  resolvedProductId = variantDetails.productId;
                }
                if (!resolvedSku) {
                  resolvedSku = variantDetails.sku;
                }
                console.log('[Transactions] Resolved name from getVariantDetails:', resolvedName);
              }
            } catch (error) {
              console.warn(`[Transactions] Failed to get variant details for ${item.variantId}:`, error);
            }
          }

          // Try productRepository as fallback
          if (!resolvedName) {
            const repoWithLookups = productRepository as unknown as {
              getVariantById?: (variantId: string) => Promise<{
                name?: string;
                variantName?: string;
                sku?: string;
                productId?: string;
                product?: { id?: string; name?: string };
              } | null>;
            };

            if (typeof repoWithLookups?.getVariantById === 'function') {
              try {
                const variant = await repoWithLookups.getVariantById(item.variantId);
                if (variant) {
                  console.log('[Transactions] Got variant from product repository:', variant);
                  if (variant.product?.name) {
                    resolvedName = variant.product.name;
                    if (variant.variantName && variant.variantName !== variant.product.name) {
                      resolvedName = `${variant.product.name} - ${variant.variantName}`;
                    }
                  } else if (variant.name) {
                    resolvedName = variant.name;
                  } else if (variant.variantName) {
                    resolvedName = variant.variantName;
                  } else if (variant.sku) {
                    resolvedName = `Item ${variant.sku}`;
                  }

                  if (!resolvedProductId) {
                    resolvedProductId = variant.productId || variant.product?.id;
                  }
                  if (!resolvedSku) {
                    resolvedSku = variant.sku;
                  }
                  console.log('[Transactions] Resolved name from productRepository:', resolvedName);
                }
              } catch (error) {
                console.warn(`[Transactions] Failed to get variant from product repository for ${item.variantId}:`, error);
              }
            }
          }
        }

        // Final fallback
        if (!resolvedName) {
          if (resolvedSku) {
            resolvedName = `Item ${resolvedSku}`;
          } else if (item.variantId) {
            resolvedName = `Item (${item.variantId.substring(0, 8)})`;
          } else {
            resolvedName = 'Unknown item';
          }
          console.warn('[Transactions] Using fallback name:', resolvedName);
        }

        cacheVariantMapping(item.variantId, resolvedProductId, resolvedName);

        // Determine discount type and value for proper reconstruction
        const lineDiscountType = (item as any).lineDiscountType as 'amount' | 'percent' | undefined;
        const lineDiscountPercentValue = parseDecimal((item as any).lineDiscountPercent);

        // Calculate lineDiscountValue and default type for old orders
        let lineDiscountValue: number | undefined;
        let effectiveLineDiscountType = lineDiscountType;

        if (lineDiscountType === 'percent' && lineDiscountPercentValue !== undefined) {
          lineDiscountValue = lineDiscountPercentValue;
        } else if (lineDiscountType === 'amount' && resolvedSaleDiscount !== undefined) {
          lineDiscountValue = resolvedSaleDiscount;
        } else if (resolvedSaleDiscount !== undefined) {
          // Fallback for old orders without lineDiscountType:
          // Assume amount-based discount
          effectiveLineDiscountType = 'amount';
          lineDiscountValue = resolvedSaleDiscount;
        }

        // Debug logging
        console.log('[Transactions] Hydrating line item discount:', {
          variantId: item.variantId,
          resolvedSaleDiscount,
          lineDiscountType,
          effectiveLineDiscountType,
          lineDiscountPercentValue,
          lineDiscountValue,
        });

        addItem({
          id: item.id || item.variantId || createTempId(),
          name: resolvedName,
          price: unitPrice,
          quantity: quantity,
          productId: resolvedProductId || item.variantId || item.id,
          productVariantId: item.variantId,
          salesPersonId: item.salesPersonId || undefined,
          salesPersonName:
            (item as any).salesPersonName ||
            (item as any).salesPerson?.name ||
            assignedSalesPerson?.name,
          lineDiscount: resolvedSaleDiscount,
          lineDiscountType: effectiveLineDiscountType,
          lineDiscountValue: lineDiscountValue,
          lineDiscountPercent: lineDiscountPercentValue,
          customDiscountAmount,
          customDiscountPercent,
          lineTax: parseDecimal((item as any).lineTax),
          color:
            (item as any).color ??
            (item as any).variantColor ??
            (item as any).productColor ??
            undefined,
          size:
            (item as any).size ??
            (item as any).variantSize ??
            (item as any).productSize ??
            undefined,
          initialTotal: finalLineTotal,
          // Don't automatically mark as return - user will manually mark items
        });
      }

      const resolveCustomerName = (input?: {
        name?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      }) => {
        if (!input) return '';
        if (input.name?.trim()) return input.name.trim();
        return `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim();
      };

      const customerName =
        formatCustomerDisplayName(customerData) ||
        formatCustomerDisplayName(
          order.customer
            ? { firstName: order.customer.firstName, lastName: order.customer.lastName }
            : undefined,
        ) ||
        (order.customerId ? `Customer ${order.customerId}` : '');

      if (customerName) {
        setCustomer({
          id: customerData?.id || order.customer?.id || order.customerId || '',
          name: customerName,
          email: customerData?.email || order.customer?.email || '',
          phone: customerData?.phone || order.customer?.phone || '',
          address: customerData?.address || order.customer?.address || '',
        });
      } else {
        clearCustomer();
      }

      if (order.salesPersonId) {
        const matchedPerson = salesPersons.find((person) => person.id === order.salesPersonId);
        if (matchedPerson) {
          setAssignedSalesPerson(matchedPerson);
        } else {
          setAssignedSalesPerson({
            id: order.salesPersonId,
            code: (order as any).salesPersonCode || order.salesPersonId.slice(0, 6),
            name: (order as any).salesPersonName || 'Assigned rep',
          });
        }
      }

      if (order.discountAmount && order.discountAmount > 0) {
        setAppliedDiscount({ type: 'amount', value: order.discountAmount });
      }
      if (order.adjustmentAmount && order.adjustmentAmount !== 0) {
        setAppliedAdjustment({ amount: order.adjustmentAmount, reason: order.adjustmentReason });
      }

      setSelectedItem('');
      setActiveTab('lines');
    },
    [
      addItem,
      cacheVariantMapping,
      clearCustomer,
      assignedSalesPerson?.name,
      lineItems,
      productRepository,
      parseDecimal,
      removeItem,
      resolveNameFromCatalog,
      salesPersons,
      salesOrderRepoRef,
      setActiveTab,
      setAppliedAdjustment,
      setAppliedDiscount,
      setAssignedSalesPerson,
      setCustomer,
      setGiftCardData,
      setPaymentEntries,
      setSelectedItem,
    ],
  );

  const loadParkedOrderData = async (parkedOrderId: string, orderId: string) => {
    if (!effectiveParkedOrderRepo) {
      show('Parked orders not available', 'error');
      return;
    }

    try {
      const result = await effectiveParkedOrderRepo.loadParkedOrder(parkedOrderId);

      if (result.success && result.data) {
        const { order, lineItems: parkedLineItems, customer: parkedCustomer } = result.data;

        await prefetchVariantNames(
          parkedLineItems.map((item) => ({
            variantId: item.variantId,
            productId: (item as any).productId,
          })),
        );

        await hydrateTransactionFromOrder({
          order,
          orderLineItems: parkedLineItems,
          customerData: parkedCustomer
            ? {
                id: parkedCustomer.id,
                firstName: parkedCustomer.firstName,
                lastName: parkedCustomer.lastName,
                email: parkedCustomer.email,
                phone: parkedCustomer.phone,
                address: parkedCustomer.address,
              }
            : undefined,
        });

        // Parked orders are not completed, so don't mark as recalled (returns not allowed)
        setIsRecalledOrder(false);
        setRecalledOrderId(null);
        setCurrentParkedOrderId(parkedOrderId);
        // Store the original order ID only if it's a real order (not a temporary PARKED- ID)
        // If orderId starts with PARKED-, there's no SaleOrder yet, so we'll create one on completion
        setCurrentParkedOrderOriginalId(order.id.startsWith('PARKED-') ? null : order.id);

        // Close modal and show success
        handleCloseParkedOrdersModal();
        const customerName =
          formatCustomerDisplayName({
            firstName: parkedCustomer?.firstName ?? undefined,
            lastName: parkedCustomer?.lastName ?? undefined,
          }) ||
          formatCustomerDisplayName(
            order.customer
              ? { firstName: order.customer.firstName, lastName: order.customer.lastName }
              : undefined,
          ) ||
          'Walk-in Customer';
        show(
          `Resumed ${order.orderNumber} for ${customerName}`,
          'success'
        );
      } else {
        show(result.error || 'Failed to load parked order', 'error');
      }
    } catch (err: any) {
      // console.error('[Transactions] Error loading parked order:', err);
      show(err.message || 'Failed to load parked order', 'error');
    }
  };

  const handleResumeParkedOrder = (
    parkedOrderId: string,
    orderId: string,
    order?: ParkedOrderListItem
  ) => {
    setPendingResumeIds({ parkedOrderId, orderId });
    setPendingResumeOrder(order ?? null);
    setIsResumeConfirmOpen(true);
  };

  const confirmResumeParkedOrder = () => {
    if (!pendingResumeIds) return;
    void loadParkedOrderData(pendingResumeIds.parkedOrderId, pendingResumeIds.orderId);
    closeResumeModal();
  };

  const handleParkTransaction = useCallback(async () => {
    if (!effectiveSalesOrderRepo || !effectiveParkedOrderRepo) {
      show('Parking is not available yet. Please wait for repositories to initialize.', 'error');
      return;
    }

    if (lineItems.length === 0) {
      show('Add at least one product before parking the transaction.', 'error');
      return;
    }

    const missingVariant = lineItems.find(
      (item) => !(item.productVariantId || item.productId)
    );
    if (missingVariant) {
      show('One or more items are missing product references and cannot be parked.', 'error');
      return;
    }

    try {
      const salesPersonId = assignedSalesPerson?.id ?? undefined;
      const orderInput: CreateSalesOrderInput = {
        locationId: currentLocationId,
        cashierId: currentUserId,
        salesPersonId,
        customerId: customer?.id,
        lineItems: lineItems.map((item) => ({
          variantId: item.productVariantId || item.productId || item.id,
          salesPersonId: item.salesPersonId || undefined,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        payments: paymentEntries.map((payment) => ({
          paymentMethodId: payment.paymentMethodId,
          amount: payment.amount,
          transactionId: payment.transactionId,
          authorizationCode: payment.authorizationCode,
          cardLast4: payment.cardLast4,
          cardBrand: payment.cardBrand,
        })),
        orderLevelDiscount: appliedDiscount
          ? appliedDiscount.type === 'percent'
            ? { percent: appliedDiscount.value }
            : { amount: appliedDiscount.value }
          : undefined,
        adjustment: appliedAdjustment
          ? { amount: appliedAdjustment.amount, reason: appliedAdjustment.reason }
          : undefined,
        giftCardNumber: giftCardData?.cardNumber,
        notes: undefined,
        customerNotes: undefined,
      };

      const orderResult = await effectiveSalesOrderRepo.createOrder(orderInput, false);

      if (!orderResult.success || !orderResult.order) {
        show(orderResult.error || 'Failed to create order for parking.', 'error');
        return;
      }

      const parkResult = await effectiveParkedOrderRepo.parkOrder({
        orderId: orderResult.order.id,
        parkedBy: currentUserId,
        customerId: customer?.id,
        notes: orderResult.order.notes,
      });

      if (!parkResult.success || !parkResult.parkedOrder) {
        show(parkResult.error || 'Failed to park order.', 'error');
        return;
      }

      lineItems.forEach((item) => removeItem(item.id));
      setPaymentEntries([]);
      setAppliedDiscount(null);
      setGiftCardData(null);
      setAppliedAdjustment(null);
      clearCustomer();
      setSelectedItem('');
      setCurrentParkedOrderId(parkResult.parkedOrder.id);
      setIsParkedOrdersModalOpen(true);
      await handleSearchParkedOrders('');
      show(
        `Order parked successfully${parkResult.parkedOrder.parkNumber ? ` (Park #${parkResult.parkedOrder.parkNumber})` : ''}.`,
        'success'
      );
    } catch (error: any) {
      // console.error('[Transactions] Failed to park transaction:', error);
      show(error.message || 'Failed to park order.', 'error');
    }
  }, [
    assignedSalesPerson?.id,
    effectiveSalesOrderRepo,
    effectiveParkedOrderRepo,
    lineItems,
    customer,
    paymentEntries,
    appliedDiscount,
    appliedAdjustment,
    giftCardData,
    currentLocationId,
    currentUserId,
    removeItem,
    setPaymentEntries,
    setAppliedDiscount,
    setGiftCardData,
    setAppliedAdjustment,
    clearCustomer,
    setSelectedItem,
    handleSearchParkedOrders,
    setCurrentParkedOrderId,
    show,
  ]);

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
      // console.error('[Transactions] Error deleting parked order:', err);
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
      const salesPersonId = assignedSalesPerson?.id ?? undefined;
      
      // Calculate order totals for storage
      const lineItemsData = lineItems.map((item) => ({
        variantId: item.productId || item.id,
        salesPersonId: item.salesPersonId || undefined,
        quantity: item.quantity,
        unitPrice: item.price,
        saleDiscount: (item as any).lineDiscount 
          ? { amount: (item as any).lineDiscount }
          : undefined,
        customDiscount: undefined,
      }));

      // Park the order without creating a SaleOrder record
      const parkResult = await effectiveParkedOrderRepo.parkOrder({
        parkedBy: currentUserId,
        customerId: customer?.id,
        notes: appliedAdjustment?.reason,
        orderData: {
          locationId: currentLocationId,
          cashierId: currentUserId,
          salesPersonId,
          lineItems: lineItemsData,
          orderLevelDiscount: appliedDiscount
            ? appliedDiscount.type === 'percent'
              ? { percent: appliedDiscount.value }
              : { amount: appliedDiscount.value }
            : undefined,
          adjustment: appliedAdjustment
            ? { amount: appliedAdjustment.amount, reason: appliedAdjustment.reason }
            : undefined,
          giftCardNumber: giftCardData?.cardNumber,
          subtotal: orderTotals.subtotal,
          taxAmount: orderTotals.taxValue,
          totalAmount: orderTotals.total,
        },
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
      // console.error('[Transactions] Failed to park order:', err);
      show(err.message || 'Failed to park order', 'error');
    }
  };

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Escape',
        action: () => {
          if (isVoidConfirmationOpen) return;
          if (lineItems.length === 0) return;
          setIsVoidConfirmationOpen(true);
        },
        description: 'Open void confirmation',
      },
      {
        key: 'p',
        ctrl: true,
        shift: true,
        action: () => setIsQuantityPanelOpen(true),
        description: 'Open quantity panel',
      },
      {
        key: 'u',
        ctrl: true,
        shift: true,
        action: () => setIsCouponPanelOpen(true),
        description: 'Open coupon panel',
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
        action: openAmountDiscountPanel,
        description: 'Order discount prompt',
      },
      {
        key: 'c',
        ctrl: true,
        shift: true,
        action: openGiftCardPanel,
        description: 'Gift card prompt',
      },
      {
        key: 'j',
        ctrl: true,
        shift: true,
        action: openAdjustmentPanel,
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

  const openSalesPersonModal = useCallback(
    (target: SalesPersonSelectionTarget) => {
      setSalesPersonSelectionTarget(target);

      if (salesPersons.length === 0 && !salesPersonsLoading && effectiveSalesPersonRepo) {
        void loadSalesPersons();
      }

      if (target.type === 'line') {
        const line = lineItems.find((li) => li.id === target.lineId);
        if (line?.salesPersonId) {
          const match = salesPersons.find((sp) => sp.id === line.salesPersonId);
          salesPersonModal.setSelectedPerson(match ?? null);
        } else {
          salesPersonModal.setSelectedPerson(null);
        }
      } else if (assignedSalesPerson) {
        salesPersonModal.setSelectedPerson(assignedSalesPerson);
      } else {
        salesPersonModal.setSelectedPerson(null);
      }

      salesPersonModal.open();
    },
    [
      assignedSalesPerson,
      effectiveSalesPersonRepo,
      lineItems,
      loadSalesPersons,
      salesPersonModal,
      salesPersons,
      salesPersonsLoading,
    ],
  );
  const handleSalesPersonSelection = useCallback(
    (person: SalesPersonData) => {
      if (salesPersonSelectionTarget?.type === 'line') {
        updateItem(salesPersonSelectionTarget.lineId, { salesPersonId: person.id });
        show(`Sales rep set to ${person.name} for line`, 'success');
      } else {
        setAssignedSalesPerson(person);
        show(`Sales rep set to ${person.name}`, 'success');
      }
      salesPersonModal.setSelectedPerson(person);
      setSalesPersonSelectionTarget({ type: 'order' });
    },
    [salesPersonSelectionTarget, setAssignedSalesPerson, show, salesPersonModal, updateItem]
  );

  const handleCloseSalesPersonModal = useCallback(() => {
    setSalesPersonSelectionTarget({ type: 'order' });
    salesPersonModal.close();
  }, [salesPersonModal]);

  const salesPersonModalSubtitle =
    salesPersonSelectionTarget.type === 'line'
      ? 'Assign to selected line item'
      : 'Assign to entire transaction';

  const sanitizeBarcodeValue = (value: string) => value?.trim().replace(/\//g, '-');

  const handleProductClick = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  const handleAddProduct = (product: Product) => {
    const price = parsePriceValue(product.price ?? null) ?? 0;
    // If adding a new item and we have a recalled order, clear the recalled state (new transaction)
    if (isRecalledOrder && lineItems.length === 0) {
      setIsRecalledOrder(false);
      setRecalledOrderId(null);
    }
    // Add product to cart with default quantity of 1
    addItem({
      id: product.id,
      name: product.name,
      price,
      quantity: 1,
      productId: product.id,
      salesPersonId: assignedSalesPerson?.id ?? undefined,
    });
    setActiveTab('lines');
  };
  
  // Clear recalled order state when lineItems becomes empty (new transaction)
  useEffect(() => {
    if (lineItems.length === 0 && isRecalledOrder) {
      setIsRecalledOrder(false);
      setRecalledOrderId(null);
    }
  }, [lineItems.length, isRecalledOrder]);
  const recallTransactionByOrderCode = useCallback(
    async (orderCode: string) => {
      if (!effectiveParkedOrderRepo) {
        show('Order recall is unavailable. Please try again later.', 'error');
        return;
      }

      const normalizedCode = orderCode.toUpperCase();
      const normalize = (value?: string | null) =>
        (value ? value.replace(/\//g, '-').toUpperCase() : '');
      const findMatch = (orders?: ParkedOrderListItem[] | null) =>
        orders?.find(
          (parked) =>
            normalize(parked.orderNumber) === normalizedCode ||
            normalize(parked.orderId) === normalizedCode,
        );

      let target = findMatch(parkedOrders);

      if (!target) {
        setLoadingParkedOrders(true);
        try {
          const searchResult = await effectiveParkedOrderRepo.searchParkedOrders({
            searchTerm: orderCode,
            useServer: true,
          });
          if (searchResult.success) {
            setParkedOrders(searchResult.parkedOrders || []);
            target = findMatch(searchResult.parkedOrders);
          } else {
            show(searchResult.error || 'Failed to search orders', 'error');
            return;
          }
        } catch (error: any) {
          show(error?.message || 'Failed to search orders', 'error');
          return;
        } finally {
          setLoadingParkedOrders(false);
        }
      }

      if (target) {
        await loadParkedOrderData(target.id, target.orderId);
        show(`Order ${target.orderNumber || orderCode} loaded`, 'success');
        return;
      }

      if (!effectiveSalesOrderRepo || typeof effectiveSalesOrderRepo.getOrderByNumber !== 'function') {
        show(`No order found for ${orderCode}`, 'error');
        return;
      }

      try {
        const recallResult = await effectiveSalesOrderRepo.getOrderByNumber(orderCode);
        if (recallResult.success && recallResult.data) {
          await prefetchVariantNames(
            recallResult.data.lineItems.map((item) => ({
              variantId: item.variantId,
              productId: (item as any).productId,
            })),
          );
          await hydrateTransactionFromOrder({
            order: recallResult.data.order,
            orderLineItems: recallResult.data.lineItems,
            customerData: {
              id: recallResult.data.customer?.id,
              firstName: recallResult.data.customer?.firstName,
              lastName: recallResult.data.customer?.lastName,
              name: recallResult.data.customer?.name,
              email: recallResult.data.customer?.email,
              phone: recallResult.data.customer?.phone,
              address: recallResult.data.customer?.address,
            },
          });
          setCurrentParkedOrderId(null);
          show(`Order ${recallResult.data.order.orderNumber || orderCode} loaded`, 'success');
        } else {
          show(recallResult.error || `No order found for ${orderCode}`, 'error');
        }
      } catch (error: any) {
        show(error?.message || `Failed to load order ${orderCode}`, 'error');
      }
    },
    [
      effectiveParkedOrderRepo,
      effectiveSalesOrderRepo,
      hydrateTransactionFromOrder,
      loadParkedOrderData,
      prefetchVariantNames,
      parkedOrders,
      setCurrentParkedOrderId,
      setParkedOrders,
      setLoadingParkedOrders,
      show,
    ],
  );

  // Track last scanned barcode to prevent duplicates
  const lastScanRef = useRef<{ barcode: string; timestamp: number } | null>(null);
  const isProcessingRef = useRef(false); // Prevent concurrent processing

  // Barcode scanner handler - lookup product and add to cart
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    // console.log('[Transactions] 🔍 Handler called, isProcessing:', isProcessingRef.current);

    // Prevent concurrent calls (React Strict Mode can cause double renders)
    if (isProcessingRef.current) {
      // console.log('[Transactions] ⚠️ Already processing a scan, ignoring duplicate call');
      return;
    }
    isProcessingRef.current = true;
    // console.log('[Transactions] 🔒 Processing lock SET');

    try {
    const sanitizedBarcode = sanitizeBarcodeValue(barcode);
    if (!sanitizedBarcode) {
      return;
    }
    const normalizedBarcode = sanitizedBarcode.toUpperCase();
    const scanTimestamp = Date.now();
    // console.log('[Transactions] ========== BARCODE SCAN START ==========');
    // console.log('[Transactions] Barcode scanned:', sanitizedBarcode);
    // console.log('[Transactions] Scan timestamp:', scanTimestamp);
    // console.log('[Transactions] Last scan:', lastScanRef.current);
    // console.log('[Transactions] Stack trace:', new Error().stack);

    // Debounce: Ignore if same barcode scanned within 500ms
    const now = Date.now();
    if (lastScanRef.current &&
        lastScanRef.current.barcode === sanitizedBarcode &&
        now - lastScanRef.current.timestamp < 500) {
      // console.log('[Transactions] ❌ Duplicate scan ignored (debounced) - time diff:', now - lastScanRef.current.timestamp, 'ms');
      return;
    }
    lastScanRef.current = { barcode: sanitizedBarcode, timestamp: now };
    // console.log('[Transactions] ✅ Scan accepted, updated lastScanRef');

    if (normalizedBarcode.startsWith('ORD-') || normalizedBarcode.startsWith('INV-')) {
      await recallTransactionByOrderCode(sanitizedBarcode);
      return;
    }
    if (normalizedBarcode.startsWith('SYS-')) {
      show('System barcode detected. This code requires manual handling.', 'info');
      return;
    }

    // If we have electronAPI (desktop), use barcode lookup first (most accurate)
    if (typeof window !== 'undefined' && (window as any).electronAPI?.product?.lookupByBarcode) {
      try {
        // console.log('[Transactions] 📞 About to call lookupByBarcode');
        const result = await (window as any).electronAPI.product.lookupByBarcode(sanitizedBarcode);
        // console.log('[Transactions] 📥 Received barcode lookup result:', result);

        if (result.success && result.product) {
          const product = result.product;
          // console.log('[Transactions] ✅ Product found:', product);
          // console.log('[Transactions] Adding to cart with:', {
          //   productId: product.productId,
          //   productVariantId: product.variantId,
          //   name: product.name,
          //   price: product.price,
          // });
          // Add to cart using the looked up product with default quantity of 1
          // Use productId as the item id for proper duplicate detection
          // Only pass availableQuantity if it's a valid positive number, otherwise undefined (unlimited)
          const availableQty = product.availableQuantity != null && product.availableQuantity > 0 
            ? product.availableQuantity 
            : undefined;
          addItem({
            productId: product.productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            productVariantId: product.variantId,
            availableQuantity: availableQty,
            salesPersonId: assignedSalesPerson?.id ?? undefined,
          }, show);
          // console.log('[Transactions] ✅ addItem called');
          setActiveTab('lines');
          show(`Added ${product.name} to cart`, 'success');
          // console.log('[Transactions] ========== BARCODE SCAN END ==========');
          return;
        }
        // If desktop lookup failed, log the error but continue to fallback search
        // console.log('[Transactions] Desktop barcode lookup returned no results, trying fallback search');
      } catch (error) {
        // console.error('[Transactions] Barcode lookup error:', error);
        // Continue to fallback search
      }
    }

    // Fallback: try to find in current product list (for web or if desktop lookup failed)
    const localProduct = productList.find(p =>
      p.id === sanitizedBarcode ||
      (p as any).productNumber === sanitizedBarcode ||
      (p as any).productCode === sanitizedBarcode ||
      (p as any).sku === sanitizedBarcode
    );

    if (localProduct) {
      handleAddProduct(localProduct);
      show(`Added ${localProduct.name} to cart`, 'success');
      return;
    }

    // No product found
    show(`Product not found for barcode: ${sanitizedBarcode}`, 'error');
    } finally {
      // Always reset processing flag
      isProcessingRef.current = false;
      // console.log('[Transactions] Processing flag reset');
    }
  }, [productList, addItem, show, handleAddProduct, setActiveTab, assignedSalesPerson?.id]);

  // Initialize barcode scanner
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    onError: (error: string) => {
      // console.error('[Transactions] Barcode scanner error:', error);
    },
    minLength: 3,
    maxLength: 200,
    scanTimeout: 100,
    enabled: !isPaymentModalOpen, // Disable during payment input
    preventDefault: true,
  });
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditableTarget =
        (target && (target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select')) ||
        false;

      const isShortcutTrigger =
        (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) ||
        (event.key === '/' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey);

      if (!manualBarcodeModeRef.current) {
        if (!isEditableTarget && isShortcutTrigger) {
          event.preventDefault();
          setIsManualBarcodeMode(true);
          setSelectedItem('');
          setNumpadValue('');
          show('Manual barcode entry enabled. Type the code and press Enter.', 'info');
        }
        return;
      }

      if (isEditableTarget) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const code = numpadValueRef.current.trim();
        if (code) {
          void handleBarcodeScan(code);
        }
        setIsManualBarcodeMode(false);
        setNumpadValue('');
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsManualBarcodeMode(false);
        setNumpadValue('');
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        setNumpadValue((prev) => prev.slice(0, -1));
        return;
      }

      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setNumpadValue((prev) => {
          if (prev.length >= 40) {
            return prev;
          }
          return prev + event.key;
        });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleBarcodeScan, show]);

  // Handle numpad enter: set quantity if product selected, or search by barcode if not
  const handleNumpadEnter = useCallback(async (value: string) => {
    if (!value || !value.trim()) return;

    // Evaluate multiplication if * is present (should already be handled in numpad, but double-check)
    let finalValue = value.trim();
    if (finalValue.includes('*')) {
      try {
        const parts = finalValue.split('*');
        if (parts.length === 2) {
          const num1 = parseFloat(parts[0].trim()) || 0;
          const num2 = parseFloat(parts[1].trim()) || 0;
          const result = Math.floor(num1 * num2); // Use floor to get integer result
          finalValue = result.toString();
        }
      } catch (error) {
        // console.error('[Transactions] Multiplication error:', error);
      }
    }

    // If a product is selected, use the value to set quantity
    if (selectedItem && selectedItemData) {
      const quantity = Math.max(0, parseInt(finalValue, 10) || 0);
      if (quantity === 0) {
        removeItem(selectedItem);
        show('Item removed from cart', 'success');
      } else {
        setItemQuantity(selectedItem, quantity, show);
        show(`Quantity set to ${quantity}`, 'success');
      }
      return;
    }

    // If no product selected, use value as barcode to search and add product
    // (multiplication result would be a number, which won't match barcodes, but that's okay)
    const barcode = finalValue;
    await handleBarcodeScan(barcode);
  }, [selectedItem, selectedItemData, setItemQuantity, removeItem, show, handleBarcodeScan]);

  const orderTotals = useMemo(() => {
    const summary = lineItems.reduce(
      (acc, item) => {
        const lineValue = item.price * item.quantity;
        const isReturn = item.isReturn || (item.price < 0 && item.quantity < 0);
        if (isReturn) {
          acc.subtotal -= Math.abs(lineValue);
          return acc;
        }

        const lineDiscountAmount = Math.min(
          Math.max(item.lineDiscount ?? item.discount ?? 0, 0),
          Math.abs(lineValue),
        );
        acc.subtotal += lineValue;
        acc.taxableSubtotal += lineValue;
        acc.lineDiscountTotal += lineDiscountAmount;
        return acc;
      },
      { subtotal: 0, taxableSubtotal: 0, lineDiscountTotal: 0 },
    );

    const adjustedSubtotal = summary.subtotal - summary.lineDiscountTotal;

    const discountValue =
      appliedDiscount && appliedDiscount.value > 0
        ? appliedDiscount.type === 'percent'
          ? (Math.abs(adjustedSubtotal) * appliedDiscount.value) / 100
          : appliedDiscount.value
        : 0;
    const giftCardValue = giftCardData?.discount ?? 0;
    const adjustmentValue = appliedAdjustment?.amount ?? 0;

    const taxableBase = Math.max(0, summary.taxableSubtotal);
    const taxValue = Number((taxableBase * TAX_RATE).toFixed(2));
    const total = adjustedSubtotal - discountValue - giftCardValue + adjustmentValue + taxValue;
    return {
      subtotal: adjustedSubtotal,
      discountValue,
      giftCardValue,
      adjustmentValue,
      taxValue,
      total,
    };
  }, [lineItems, appliedDiscount, giftCardData, appliedAdjustment]);

  const paymentSessionKey = useMemo(
    () => buildPaymentSessionKey(lineItems, orderTotals.total),
    [lineItems, orderTotals.total],
  );

  const clearPaymentSessionTracking = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const lastSessionKey = window.sessionStorage.getItem(LAST_PAYMENT_SESSION_KEY);
      if (lastSessionKey) {
        window.sessionStorage.removeItem(lastSessionKey);
      }
      window.sessionStorage.removeItem(LAST_PAYMENT_SESSION_KEY);
    } catch (error) {
      // Silently ignore storage errors
    }
  }, []);

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
      // console.error('[Transactions] Failed to load payment methods:', error);
      setAvailablePaymentMethods(FALLBACK_PAYMENT_METHODS);
    } finally {
      setIsPaymentMethodsLoading(false);
    }
  }, [effectivePaymentMethodRepo]);

  // Load payment methods on mount
  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  const buildOrderInput = useCallback(
    (payments: OrderPaymentInput[]): CreateSalesOrderInput => {
      const salesPersonId = assignedSalesPerson?.id ?? undefined;
      return {
        locationId: currentLocationId,
        cashierId: currentUserId,
        salesPersonId,
        customerId: customer?.id,
        lineItems: lineItems.map((item) => ({
          variantId: item.productId || item.id,
          salesPersonId: item.salesPersonId || salesPersonId,
          quantity: item.quantity,
          unitPrice: item.price,
          saleDiscount:
            item.lineDiscount && item.lineDiscount > 0
              ? {
                  amount: Math.min(
                    Math.abs(item.lineDiscount),
                    Math.abs(item.price * item.quantity),
                  ),
                }
              : undefined,
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
        taxAmountOverride: orderTotals.taxValue,
        totalAmountOverride: orderTotals.total,
      };
    },
    [
      assignedSalesPerson?.id,
      appliedAdjustment,
      appliedDiscount,
      giftCardData,
      currentLocationId,
      currentUserId,
      customer?.id,
      lineItems,
      orderTotals.taxValue,
      orderTotals.total,
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
    setIsRecalledOrder(false);
    setRecalledOrderId(null);
    clearPaymentSessionTracking();
    partialPaymentsHydratedAtRef.current = 0;
  }, [clearCustomer, clearPaymentSessionTracking, lineItems, removeItem]);

  // Check for order completion from Payments page and reset state
  useEffect(() => {
    const navigationState = location.state as { orderCompleted?: boolean; orderNumber?: string } | null;
    if (navigationState?.orderCompleted) {
      // console.log('[Transactions] Order completed, resetting transaction state...');
      // Reset transaction state (cart should already be cleared by Payments page)
      // But ensure all other state is reset
      // Note: Don't clear cart here as it's already cleared in Payments page
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
      clearPaymentSessionTracking();
      partialPaymentsHydratedAtRef.current = 0;
      // Clear navigation state to prevent resetting on every render
      window.history.replaceState({}, document.title);
      
      // Show success message
      if (navigationState.orderNumber) {
        show(`Order ${navigationState.orderNumber} completed successfully!`, 'success');
      }
    }
  }, [location.state, clearCustomer, clearPaymentSessionTracking, show]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!paymentSessionKey) {
      return;
    }

    const lastSessionKey = window.sessionStorage.getItem(LAST_PAYMENT_SESSION_KEY);
    if (lastSessionKey !== paymentSessionKey) {
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(paymentSessionKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as {
        payments?: PaymentCollectionEntry[];
        updatedAt?: number;
        total?: number;
      };
      if (!Array.isArray(parsed.payments) || parsed.payments.length === 0) {
        return;
      }
      const updatedAt = typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0;
      if (updatedAt && updatedAt <= partialPaymentsHydratedAtRef.current) {
        return;
      }

      const totalPaid = parsed.payments.reduce(
        (sum, payment) => sum + Number(payment.amount ?? 0),
        0,
      );
      const remainingBalance = Number((orderTotals.total - totalPaid).toFixed(2));
      if (remainingBalance <= 0.01) {
        partialPaymentsHydratedAtRef.current = updatedAt || Date.now();
        return;
      }

      const sanitizedPayments = parsed.payments.map((payment, index) => ({
        ...payment,
        id: payment.id ?? `session-${index}-${createTempId()}`,
      }));

      setPaymentEntries(sanitizedPayments);
      setActiveTab('payments');
      partialPaymentsHydratedAtRef.current = updatedAt || Date.now();
    } catch (error) {
      console.error('[Transactions] Failed to hydrate partial payments from session storage:', error);
    }
  }, [orderTotals.total, paymentSessionKey, setActiveTab, setPaymentEntries]);

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
        // console.log('[Transactions] Calling createOrder with data:', {
          // lineItemsCount: orderData.lineItems.length,
        //   paymentsCount: orderData.payments.length,
        //   locationId: orderData.locationId,
        //   cashierId: orderData.cashierId,
        // });
        // If this is a parked order, pass the original order ID to update instead of creating new
        const existingOrderId = currentParkedOrderOriginalId || undefined;
        const result = await repo.createOrder(orderData, true, existingOrderId);
        // console.log('[Transactions] createOrder result:', {
        //   success: result.success,
        //   hasOrder: !!result.order,
        //   orderNumber: result.order?.orderNumber,
        //   error: result.error,
        // });

        if (result.success && result.order) {
          // console.log('[Transactions] Order completed successfully, clearing transaction state...');
          show(`Order completed! Order #: ${result.order.orderNumber}`, 'success');

          // Always delete the ParkedOrder record after successful order completion
          if (currentParkedOrderId && effectiveParkedOrderRepo) {
            try {
              console.log('[Transactions] Deleting ParkedOrder record:', currentParkedOrderId);
              const completeResult = await effectiveParkedOrderRepo.completeParkedOrder(currentParkedOrderId);
              if (completeResult.success) {
                console.log('[Transactions] ParkedOrder record deleted successfully');
                setCurrentParkedOrderId(null);
                setCurrentParkedOrderOriginalId(null);
                handleSearchParkedOrders(''); // Refresh parked orders list
              } else {
                console.error('[Transactions] Failed to delete ParkedOrder record:', completeResult.error);
                show(`Warning: Parked order record may not have been removed: ${completeResult.error}`, 'error');
                // Still clear the state even if deletion failed
                setCurrentParkedOrderId(null);
                setCurrentParkedOrderOriginalId(null);
              }
            } catch (err: any) {
              console.error('[Transactions] Error deleting ParkedOrder record:', err);
              show(`Warning: Failed to remove parked order record: ${err.message || 'Unknown error'}`, 'error');
              // Still clear the state even if deletion failed
              setCurrentParkedOrderId(null);
              setCurrentParkedOrderOriginalId(null);
            }
          }

          // Convert cart items to receipt line items
          const receiptLineItems = lineItems.map(item => ({
            id: item.id,
            variantId: item.id,
            sku: (item as any).sku || item.productVariantId || '',
            productName: item.name,
            variantName: '',
            quantity: item.quantity,
            unitPrice: item.price,
            saleDiscount: (item as any).discount ? { amount: (item as any).discount } : undefined,
            customDiscount: undefined,
            lineSubtotal: item.price * item.quantity,
            lineDiscount: (item as any).discount || item.lineDiscount || 0,
            lineTotal: (item.price * item.quantity) - ((item as any).discount || item.lineDiscount || 0),
          }));

          // Calculate receipt totals before resetting state
          // Sum of all line item discounts (from cart line items)
          const totalLineItemDiscounts = receiptLineItems.reduce((sum, item) => sum + (item.lineDiscount || 0), 0);
          const grossTotal = orderTotals.subtotal + totalLineItemDiscounts; // Add back discounts to get gross
          const itemDiscount = totalLineItemDiscounts; // Use sum of all line item discounts
          const netTotal = orderTotals.total;
          const tendered = payments.reduce((sum, p) => sum + p.amount, 0);
          const change = Math.max(0, tendered - netTotal);

          // Convert payment entries to receipt payments
          const receiptPayments = payments.map(payment => {
            const paymentMethod = (payment as any).paymentMethod;
            return {
              id: payment.paymentMethodId,
              paymentMethodId: payment.paymentMethodId,
              paymentMethod: paymentMethod ? {
                id: paymentMethod.id || payment.paymentMethodId,
                code: paymentMethod.code || 'CASH',
                name: paymentMethod.name || 'Cash',
                type: paymentMethod.type || 'Cash',
                isActive: true,
              } : {
                id: payment.paymentMethodId,
                code: 'CASH',
                name: 'Cash',
                type: 'Cash' as const,
                isActive: true,
              },
              amount: payment.amount,
              cardLast4: (payment as any).cardLast4,
              cardBrand: (payment as any).cardBrand,
              authorizationCode: (payment as any).authorizationCode,
              transactionId: (payment as any).transactionId,
            };
          });

          // Show print dialog BEFORE resetting state
          const invoiceNumber = (result.order as any).invoiceNumber || result.order.orderNumber || result.order.id;
          promptPrintReceipt({
            invoiceNumber,
            orderNumber: result.order.orderNumber || invoiceNumber,
            orderId: result.order.id,
            orderDate: result.order.orderDate || result.order.completedAt,
            lineItems: receiptLineItems,
            payments: receiptPayments,
            customer: customer ? {
              id: customer.id || '',
              firstName: customer.name.split(' ')[0] || '',
              lastName: customer.name.split(' ').slice(1).join(' ') || '',
              email: customer.email,
              phone: customer.phone,
            } : undefined,
            cashier: assignedSalesPerson?.name || 'Cashier',
            grossTotal,
            itemDiscount,
            taxAmount: orderTotals.taxValue,
            adjustmentAmount: appliedAdjustment?.amount ?? 0,
            netTotal,
            tendered,
            change,
          });

          // Reset state after a short delay to allow print dialog to show
          setTimeout(() => {
            resetTransactionState();
            // Clear recalled order state when transaction is completed
            setIsRecalledOrder(false);
            setRecalledOrderId(null);
            // console.log('[Transactions] Transaction state cleared');
          }, 500);

          return true;
        }

        // console.error('[Transactions] Order creation failed:', result.error);
        show(result.error || 'Failed to complete order', 'error');
        return false;
    } catch (err: any) {
      // console.error('[Transactions] Failed to complete order:', err);
      show(err.message || 'Failed to complete order', 'error');
        return false;
      }
    },
    [
      buildOrderInput,
      currentParkedOrderId,
      currentParkedOrderOriginalId,
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
    setPaymentDialogError(null);
    // Don't clear paymentEntries - keep them for split payments
  }, []);

  const handleCancelAllPayments = useCallback(() => {
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

      const missingLineSalesPersonIds = lineItems
        .filter((item) => !item.salesPersonId)
        .map((item) => item.id);

      if (missingLineSalesPersonIds.length > 0) {
        setMissingSalesPersonLineIds(missingLineSalesPersonIds);
        show(
          `Assign a sales person to the highlighted line item${missingLineSalesPersonIds.length > 1 ? 's' : ''} before taking payment.`,
          'error'
        );
        setActiveTab('lines');
        return;
      }

      setMissingSalesPersonLineIds([]);
      if (typeof window !== 'undefined') {
        try {
          const sessionKey = buildPaymentSessionKey(lineItems, orderTotals.total);
          if (sessionKey) {
            window.sessionStorage.setItem(LAST_PAYMENT_SESSION_KEY, sessionKey);
          }
        } catch {
          // Ignore storage errors
        }
      }
      // Pass order data via navigation state
      navigate(`/payments?mode=${mode}`, {
        state: {
          orderTotal: orderTotals.total,
          subtotal: orderTotals.subtotal,
          discountValue: orderTotals.discountValue,
          giftCardValue: orderTotals.giftCardValue,
          adjustmentValue: orderTotals.adjustmentValue,
          taxValue: orderTotals.taxValue,
          lineItems: lineItems,
          discount: appliedDiscount,
          giftCard: giftCardData,
          adjustment: appliedAdjustment,
          // Pass IDs for order creation (repo passed via props)
          salesPersonId: assignedSalesPerson?.id ?? undefined,
          salesPersonName: assignedSalesPerson?.name, // Pass sales person name
          customerId: customer?.id,
          customer: customer
            ? {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
              }
            : undefined,
          parkedOrderId: currentParkedOrderId, // Pass parked order ID if resuming
          parkedOrderOriginalId: currentParkedOrderOriginalId, // Pass original order ID to update instead of create
        },
      });
    },
    [
      lineItems,
      navigate,
      show,
      orderTotals,
      appliedDiscount,
      giftCardData,
      appliedAdjustment,
      customer,
      currentParkedOrderId,
      setActiveTab,
      setMissingSalesPersonLineIds,
    ]
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
        // Clear payment entries after successful order completion
        setPaymentEntries([]);
        handleClosePaymentModal();
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  }, [completeOrder, handleClosePaymentModal, paymentAmountDue, paymentEntries, orderTotals.total]);

  const handleApplyDiscount = useCallback(
    (mode: 'amount' | 'percent', rawValue: string) => {
      const parsed = parseFloat(rawValue);
      if (Number.isNaN(parsed) || parsed < 0) {
        show('Enter a valid discount value', 'error');
        return;
      }

      if (selectedLineItem) {
        if (selectedLineItem.isReturn) {
          show('Line discounts cannot be applied to returns.', 'error');
          return;
        }

        const baseSubtotal = Math.abs(selectedLineItem.price) * Math.abs(selectedLineItem.quantity);
        if (baseSubtotal === 0) {
          show('Cannot apply a discount to a zero-value line.', 'error');
          return;
        }

        const discountAmount =
          mode === 'percent' ? (baseSubtotal * parsed) / 100 : parsed;
        const clampedDiscount = Math.min(Math.max(discountAmount, 0), baseSubtotal);
        const discountedSubtotal = baseSubtotal - clampedDiscount;
        const lineTaxAmount = Number((discountedSubtotal * TAX_RATE).toFixed(2));

        updateItem(selectedLineItem.id, {
          lineDiscount: clampedDiscount,
          discount: clampedDiscount,
          lineDiscountType: mode,
          lineDiscountValue: parsed,
          lineTax: lineTaxAmount,
          total: selectedLineItem.price >= 0 ? discountedSubtotal : -discountedSubtotal,
        });

        if (mode === 'amount') {
          setDiscountAmountInput('');
          setIsAmountDiscountPanelOpen(false);
        } else {
          setDiscountPercentInput('');
          setIsPercentDiscountPanelOpen(false);
        }

        show('Line discount applied', 'success');
        return;
      }

      setAppliedDiscount({ type: mode, value: parsed });
      setDiscountSource('manual');
      setAppliedCoupon(null);
      setCouponCodeInput('');
      if (mode === 'amount') {
        setDiscountAmountInput('');
        setIsAmountDiscountPanelOpen(false);
      } else {
        setDiscountPercentInput('');
        setIsPercentDiscountPanelOpen(false);
      }
      show('Discount applied', 'success');
    },
    [
      selectedLineItem,
      updateItem,
      show,
      setDiscountSource,
      setAppliedCoupon,
      setAppliedDiscount,
      setCouponCodeInput,
    ],
  );

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
    setIsGiftCardPanelOpen(false);
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
    setIsAdjustmentPanelOpen(false);
    show('Order adjustment saved', 'success');
  };

  const handleApplyCouponCode = useCallback(
    (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized) {
        show('Enter a coupon code first', 'error');
        return;
      }

      const coupon = SAMPLE_COUPONS[normalized] ?? {
        type: 'amount' as const,
        value: 5,
        description: 'Courtesy $5 discount',
      };

      setAppliedDiscount({ type: coupon.type, value: coupon.value });
      if (coupon.type === 'amount') {
        setDiscountAmountInput(String(coupon.value));
        setDiscountPercentInput('');
      } else {
        setDiscountPercentInput(String(coupon.value));
        setDiscountAmountInput('');
      }
      setDiscountSource('coupon');
      setCouponCodeInput(normalized);
      setAppliedCoupon({ code: normalized, type: coupon.type, value: coupon.value });
      setIsCouponPanelOpen(false);

      const valueText = coupon.type === 'percent' ? `${coupon.value}%` : formatCurrency(coupon.value);
      show(`Coupon ${normalized} applied (${valueText})`, 'success');
    },
    [show, formatCurrency],
  );

  const handleClearAppliedCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    if (discountSource === 'coupon') {
      setAppliedDiscount(null);
      setDiscountAmountInput('');
      setDiscountPercentInput('');
      setDiscountSource(null);
    }
    show('Coupon removed', 'info');
  }, [discountSource, show]);

  const handleClearGiftCard = useCallback(() => {
    setGiftCardData(null);
    setGiftCardNumberInput('');
    setGiftCardValueInput('');
    show('Gift card removed', 'info');
  }, [show]);

  const handleClearDiscount = useCallback(() => {
    if (discountSource === 'coupon' && appliedCoupon) {
      handleClearAppliedCoupon();
      return;
    }
    setAppliedDiscount(null);
    setDiscountAmountInput('');
    setDiscountPercentInput('');
    setDiscountSource(null);
    show('Discount removed', 'info');
  }, [appliedCoupon, discountSource, handleClearAppliedCoupon, show]);

  const handleClearLineDiscount = useCallback(() => {
    if (!selectedLineItem) {
      show('Select a line to clear its discount.', 'error');
      return;
    }
    updateItem(selectedLineItem.id, {
      lineDiscount: undefined,
      discount: undefined,
      lineDiscountType: undefined,
      lineDiscountValue: undefined,
      lineTax: undefined,
      total: selectedLineItem.price * selectedLineItem.quantity,
    });
    setDiscountAmountInput('');
    setDiscountPercentInput('');
    setIsAmountDiscountPanelOpen(false);
    setIsPercentDiscountPanelOpen(false);
    show('Line discount removed', 'info');
  }, [selectedLineItem, updateItem, show]);

  const handleClearAdjustment = useCallback(() => {
    setAppliedAdjustment(null);
    setAdjustmentAmountInput('');
    setAdjustmentReasonInput('');
    show('Adjustment removed', 'info');
  }, [show]);

  const primaryActionButtons: ActionButton[] = [
    // Orange/Reddish-Brown Section
    {
      id: 'set-quantity',
      label: 'Set quantity',
      color: 'bg-orange-600',
      onClick: () => setIsQuantityPanelOpen(true),
    },
    {
      id: 'return-product',
      icon: <RotateCcw className="w-5 h-5" />,
      label: 'Return',
      color: 'bg-orange-600',
      square: true,
      rowSpan: 2,
      onClick: () => {
        if (!selectedItem) {
          show('Select an item to return', 'error');
          return;
        }
        
        // Only allow returns for recalled completed orders (not parked orders or new orders)
        // A recalled completed order must have isRecalledOrder=true and currentParkedOrderId=null
        if (!isRecalledOrder || currentParkedOrderId !== null) {
          show('Returns are only available for completed orders recalled by scanning a bill. Please recall a completed order first.', 'error');
          return;
        }
        
        const itemToReturn = lineItems.find((item) => item.id === selectedItem);
        if (!itemToReturn) {
          show('Selected item not found', 'error');
          return;
        }
        // Navigate to return page with item data
        navigate('/transactions/return', {
          state: {
            returnItems: [
              {
                id: itemToReturn.id,
                productId: itemToReturn.productId,
                productName: itemToReturn.name,
                quantity: itemToReturn.quantity,
                unitPrice: itemToReturn.price,
                total: itemToReturn.price * itemToReturn.quantity,
                sku: (itemToReturn as any).sku,
                variantId: (itemToReturn as any).variantId,
                // Line-level details
                lineDiscount: parseDecimal((itemToReturn as any).lineDiscount),
                lineDiscountPercent: parseDecimal((itemToReturn as any).lineDiscountPercent),
                lineTax: parseDecimal((itemToReturn as any).lineTax),
                customDiscountAmount: parseDecimal(
                  (itemToReturn as any).customDiscountAmount ??
                    (itemToReturn as any).customDiscount?.amount,
                ),
                customDiscountPercent: parseDecimal(
                  (itemToReturn as any).customDiscountPercent ??
                    (itemToReturn as any).customDiscount?.percent,
                ),
                color: (itemToReturn as any).color,
                size: (itemToReturn as any).size,
                salesPersonId: itemToReturn.salesPersonId,
                salesPersonName: getSalesPersonNameForLine(itemToReturn),
                originalPrice: (itemToReturn as any).originalPrice || itemToReturn.price,
              },
            ],
            originalOrderId: recalledOrderId || currentParkedOrderId,
          },
        });
      },
    },
    {
      id: 'change-unit-split',
      label: '',
      color: 'bg-orange-600',
      split: {
        left: {
          icon: <Trash2 className="w-5 h-5" />,
          label: 'Remove line',
          onClick: () => {
            if (!selectedItem) { show('Select a line first', 'error'); return; }
            removeItem(selectedItem);
            show('Item removed', 'success');
            setSelectedItem('');
          },
        },
        right: {
          icon: <Archive className="w-5 h-5" />,
          label: 'Park order',
          onClick: () => {
            if (lineItems.length === 0) {
              show('Add items before parking the transaction.', 'error');
              return;
            }
            void handleParkTransaction();
          },
        },
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
      onClick: openGiftCardPanel,
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
      id: 'parked-orders',
      icon: <FolderOpen className="w-5 h-5" />,
      label: 'Parked orders',
      color: 'bg-gray-700',
      square: true,
      rectangular: true,
      onClick: openParkedOrdersModal,
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
    // Green Section - Small square buttons
    {
      id: 'profile',
      icon: <User className="w-4 h-4" />,
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => {
        openSalesPersonModal(
          selectedItem
            ? { type: 'line', lineId: selectedItem }
            : { type: 'order' }
        );
      },
    },
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
      id: 'heart',
      icon: <Heart className="w-4 h-4" />,
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => console.log('Heart'),
    },
    // {
    //   id: 'profile',
    //   icon: <User className="w-4 h-4" />,
    //   label: '',
    //   color: 'bg-green-700',
    //   square: true,
    //   onClick: () => salesPersonModal.open(),
    // },
    // {
    //   id: 'heart',
    //   icon: <Heart className="w-4 h-4" />,
    //   label: '',
    //   color: 'bg-green-700',
    //   square: true,
    //   onClick: () => console.log('Heart'),
    // },
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

  const discountActionButtons: ActionButton[] = [
    {
      id: 'tax-overrides',
      icon: <RotateCcw className="w-5 h-5" />,
      label: 'Tax overrides',
      color: 'bg-gray-700',
      section: 'discounts',
      square: true,
      // iconOnly: true,
      rectangular: true,
      onClick: () => console.log('Tax overrides'),
    },
    {
      id: 'add-coupon',
      icon: <TicketPercent className="w-5 h-5" />,
      label: 'Add coupon',
      color: 'bg-orange-600',
      section: 'discounts',
      square: true,
      // iconOnly: true,
      onClick: () => setIsCouponPanelOpen(true),
    },
    {
      id: 'order-discount',
      label: '',
      color: 'bg-orange-600',
      section: 'discounts',
      square: true,
      split: {
        left: {
          icon: (
            <div className="flex flex-col items-center leading-none">
              <BadgeDollarSign className="w-6 h-6" />
            </div>
          ),
          label: 'Amount discount',
          onClick: openAmountDiscountPanel,
        },
        right: {
          icon: (
            <div className="flex flex-col items-center leading-none">
              <BadgePercent className="w-6 h-6" />
            </div>
          ),
          label: 'Percent discount',
          onClick: openPercentDiscountPanel,
        },
      },
    },
    {
      id: 'order-adjustment',
      icon: <SlidersHorizontal className="w-5 h-5" />,
      label: 'Order adjustment',
      color: 'bg-gray-700',
      section: 'discounts',
      square: true,
      onClick: openAdjustmentPanel,
    },
  ];

  const actionButtons: ActionButton[] = [...primaryActionButtons, ...discountActionButtons];

  const amountPanelCurrent =
    selectedLineItem && selectedLineItem.lineDiscountType === 'amount'
      ? ({
          type: 'amount',
          value:
            selectedLineItem.lineDiscountValue ??
            selectedLineItem.lineDiscount ??
            0,
        } as const)
      : !selectedLineItem && appliedDiscount?.type === 'amount'
      ? appliedDiscount
      : null;

  const percentPanelCurrent =
    selectedLineItem && selectedLineItem.lineDiscountType === 'percent'
      ? ({
          type: 'percent',
          value:
            selectedLineItem.lineDiscountValue ??
            selectedLineItem.lineDiscount ??
            0,
        } as const)
      : !selectedLineItem && appliedDiscount?.type === 'percent'
      ? appliedDiscount
      : null;

  const amountPanelClearHandler =
    selectedLineItem && selectedLineItem.lineDiscountType === 'amount'
      ? handleClearLineDiscount
      : !selectedLineItem && appliedDiscount?.type === 'amount'
      ? handleClearDiscount
      : undefined;

  const percentPanelClearHandler =
    selectedLineItem && selectedLineItem.lineDiscountType === 'percent'
      ? handleClearLineDiscount
      : !selectedLineItem && appliedDiscount?.type === 'percent'
      ? handleClearDiscount
      : undefined;

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
            billingSummary={{
              subtotal: orderTotals.subtotal,
              discount: orderTotals.discountValue,
              giftCardValue: orderTotals.giftCardValue,
              adjustment: orderTotals.adjustmentValue,
              tax: orderTotals.taxValue,
              total: orderTotals.total,
              paid: paymentEntries.length > 0 ? paymentAmountPaid : 0,
            }}
            salesPersonName={
              salesPersonModal.selectedPerson?.code ||
              salesPersonModal.selectedPerson?.name ||
              null
            }
            paymentMethods={availablePaymentMethods}
            salesPersons={salesPersons}
            payments={paymentEntries}
            linesMissingSalesPerson={missingSalesPersonLineIds}
            isRecalledOrder={isRecalledOrder}
          />
        </div>

        <div className="w-full md:w-auto md:flex-shrink-0 h-1/2 md:h-full min-h-0">
          <TransactionNumpad
            value={numpadValue}
            onValueChange={setNumpadValue}
            onEnter={handleNumpadEnter}
            onAddCustomer={() => navigate('/customers')}
            customer={customer}
            onRemoveCustomer={handleRemoveCustomer}
            manualBarcodeMode={isManualBarcodeMode}
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

      <TransactionDiscountPanel
        isOpen={isAmountDiscountPanelOpen}
        onClose={() => setIsAmountDiscountPanelOpen(false)}
        mode="amount"
        value={discountAmountInput}
        current={amountPanelCurrent}
        onValueChange={setDiscountAmountInput}
        onApply={() => handleApplyDiscount('amount', discountAmountInput)}
        onClear={amountPanelClearHandler}
      />

      <TransactionDiscountPanel
        isOpen={isPercentDiscountPanelOpen}
        onClose={() => setIsPercentDiscountPanelOpen(false)}
        mode="percent"
        value={discountPercentInput}
        current={percentPanelCurrent}
        onValueChange={setDiscountPercentInput}
        onApply={() => handleApplyDiscount('percent', discountPercentInput)}
        onClear={percentPanelClearHandler}
      />

      <TransactionAdjustmentPanel
        isOpen={isAdjustmentPanelOpen}
        onClose={() => setIsAdjustmentPanelOpen(false)}
        amount={adjustmentAmountInput}
        reason={adjustmentReasonInput}
        current={appliedAdjustment}
        onAmountChange={setAdjustmentAmountInput}
        onReasonChange={setAdjustmentReasonInput}
        onApply={handleApplyAdjustment}
        onClear={appliedAdjustment ? handleClearAdjustment : undefined}
      />

      <TransactionCouponPanel
        isOpen={isCouponPanelOpen}
        onClose={() => setIsCouponPanelOpen(false)}
        initialCode={couponCodeInput}
        appliedCoupon={appliedCoupon}
        onApply={handleApplyCouponCode}
        onClear={appliedCoupon ? handleClearAppliedCoupon : undefined}
      />

      {/* Test Invoice Modal */}
      {showInvoice && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowInvoice(false)}
        >
          <div
            className="bg-[var(--color-bg-primary)] p-3 rounded-none max-h-[90vh] overflow-auto border transaction-invoice-modal-scroll-container"
            style={{ 
              borderColor: 'var(--color-border-light)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-border-light) var(--color-bg-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              .transaction-invoice-modal-scroll-container::-webkit-scrollbar {
                width: 10px;
                height: 10px;
              }
              .transaction-invoice-modal-scroll-container::-webkit-scrollbar-track {
                background: var(--color-bg-primary);
                border-radius: 10px;
              }
              .transaction-invoice-modal-scroll-container::-webkit-scrollbar-thumb {
                background-color: var(--color-border-light);
                border-radius: 10px;
                border: 2px solid var(--color-bg-primary);
                transition: background-color 0.2s ease;
              }
              .transaction-invoice-modal-scroll-container::-webkit-scrollbar-thumb:hover {
                background-color: var(--color-border-medium);
              }
            `}</style>
            <Invoice
              brand={{ storeName: 'PayFlow' }}
              invoiceNo="TEST-0001"
              date={formatDateTime()}
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

            <div 
              className="p-4 overflow-y-auto transaction-payment-modal-scroll-container"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--color-border-light) var(--color-bg-primary)',
              }}
            >
              <style>{`
                .transaction-payment-modal-scroll-container::-webkit-scrollbar {
                  width: 10px;
                  height: 10px;
                }
                .transaction-payment-modal-scroll-container::-webkit-scrollbar-track {
                  background: var(--color-bg-primary);
                  border-radius: 10px;
                }
                .transaction-payment-modal-scroll-container::-webkit-scrollbar-thumb {
                  background-color: var(--color-border-light);
                  border-radius: 10px;
                  border: 2px solid var(--color-bg-primary);
                  transition: background-color 0.2s ease;
                }
                .transaction-payment-modal-scroll-container::-webkit-scrollbar-thumb:hover {
                  background-color: var(--color-border-medium);
                }
              `}</style>
              <CompactPaymentPanel
                key={paymentModalKey}
                payments={paymentEntries}
                paymentMethods={paymentMethodsToDisplay}
                totalAmount={orderTotals.total}
                amountPaid={paymentAmountPaid}
                amountDue={paymentAmountDue}
                onAddPayment={handleAddPaymentEntry}
                onRemovePayment={handleRemovePaymentEntry}
                disabled={isSubmittingPayment}
                mode={paymentDialogMode ?? undefined}
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
                {paymentEntries.length > 0 && paymentAmountDue > 0 && (
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
                    Add Another Payment
                  </button>
                )}
                <button
                  onClick={handleCancelAllPayments}
                  className="px-4 py-2 rounded border text-sm font-medium"
                  style={{
                    borderColor: 'var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                  }}
                  disabled={isSubmittingPayment}
                >
                  Cancel All
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

      <TransactionGiftCardPanel
        isOpen={isGiftCardPanelOpen}
        onClose={() => setIsGiftCardPanelOpen(false)}
        cardNumber={giftCardNumberInput}
        appliedGiftCard={giftCardData}
        onCardNumberChange={setGiftCardNumberInput}
        onApply={handleApplyGiftCard}
        onClear={giftCardData ? handleClearGiftCard : undefined}
      />

      <PreviewPrompt
        isOpen={isPreviewModalOpen}
        lineItems={lineItems}
        totals={orderTotals}
        giftCard={giftCardData}
        adjustment={appliedAdjustment}
        onClose={() => setIsPreviewModalOpen(false)}
      />

      {/* Parked Orders Search Panel - Opens with Ctrl+Shift+Z */}
      <div className="relative z-[260]">
        <ParkedOrderSearch
          isOpen={isParkedOrdersModalOpen}
          onClose={handleCloseParkedOrdersModal}
          onLoadOrder={handleResumeParkedOrder}
          parkedOrders={parkedOrders}
          onSearch={handleSearchParkedOrders}
          isLoading={loadingParkedOrders}
        />
      </div>

      <div className="relative z-[270]">
        <ConfirmationModal
          isOpen={isResumeConfirmOpen}
          onClose={closeResumeModal}
          onConfirm={confirmResumeParkedOrder}
          title="Resume Parked Order"
          message={
            pendingResumeOrder
              ? `Resume ${pendingResumeOrder.orderNumber} for ${pendingResumeOrder.customerName ?? 'Walk-in Customer'}?`
              : 'Resume this parked order?'
          }
          confirmText="Resume Order"
          cancelText="Cancel"
          variant="info"
        />
      </div>

      {/* Void Confirmation Modal */}
      <ConfirmationModal
        isOpen={isVoidConfirmationOpen}
        onClose={() => setIsVoidConfirmationOpen(false)}
        onConfirm={handleConfirmVoid}
        title="Void Transaction"
        message="Are you sure you want to void this transaction? All cart data will be cleared."
        confirmText="Void Transaction"
        variant="warning"
        showCancelButton={false}
      />

      {/* Sales Person Modal - Ctrl+Shift+I to open */}
      <SalesPersonModal
        isOpen={salesPersonModal.isOpen}
        onClose={handleCloseSalesPersonModal}
        onSelect={handleSalesPersonSelection}
        salesPersons={salesPersons}
        selectedId={salesPersonModal.selectedPerson?.id}
        isLoading={salesPersonsLoading}
        subtitle={salesPersonModalSubtitle}
      />

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

export default Transactions;

