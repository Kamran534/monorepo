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
  type ActionButton,
  type Product,
  useCart,
  useTransactionCustomer,
  useToast,
  useKeyboardShortcuts,
} from '@monorepo/shared-ui';
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

export interface TransactionsProps {
  productRepository?: ProductRepository;
}

export function Transactions({ productRepository }: TransactionsProps = {}) {
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
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: 'amount' | 'percent'; value: number } | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponValueInput, setCouponValueInput] = useState('');
  const [couponData, setCouponData] = useState<{ code: string; discount: number } | null>(null);
  const [adjustmentAmountInput, setAdjustmentAmountInput] = useState('');
  const [adjustmentReasonInput, setAdjustmentReasonInput] = useState('');
  const [appliedAdjustment, setAppliedAdjustment] = useState<{ amount: number; reason?: string } | null>(null);

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
  const { customer, clearCustomer } = useTransactionCustomer();
  const { show } = useToast();
  const [showInvoice, setShowInvoice] = useState(false);

  // Keyboard shortcuts
  const openDiscountModal = useCallback(() => {
    setDiscountMode(appliedDiscount?.type ?? 'amount');
    setDiscountInput(appliedDiscount ? String(appliedDiscount.value) : '');
    setIsDiscountModalOpen(true);
  }, [appliedDiscount]);

  const openCouponModal = useCallback(() => {
    setCouponCodeInput(couponData?.code ?? '');
    setCouponValueInput(couponData ? String(couponData.discount) : '');
    setIsCouponModalOpen(true);
  }, [couponData]);

  const openAdjustmentModal = useCallback(() => {
    setAdjustmentAmountInput(appliedAdjustment ? String(appliedAdjustment.amount) : '');
    setAdjustmentReasonInput(appliedAdjustment?.reason ?? '');
    setIsAdjustmentModalOpen(true);
  }, [appliedAdjustment]);

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
        action: openCouponModal,
        description: 'Coupon code prompt',
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
    const couponValue = couponData?.discount ?? 0;
    const adjustmentValue = appliedAdjustment?.amount ?? 0;
    const total = Math.max(0, subtotal - discountValue - couponValue + adjustmentValue);
    return {
      subtotal,
      discountValue,
      couponValue,
      adjustmentValue,
      total,
    };
  }, [lineItems, appliedDiscount, couponData, appliedAdjustment]);

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

  const handleApplyCoupon = () => {
    if (!couponCodeInput.trim()) {
      show('Enter a coupon code', 'error');
      return;
    }
    const parsed = couponValueInput ? parseFloat(couponValueInput) : 0;
    if (Number.isNaN(parsed) || parsed < 0) {
      show('Enter a valid coupon value', 'error');
      return;
    }
    setCouponData({ code: couponCodeInput.trim(), discount: parsed });
    setIsCouponModalOpen(false);
    show('Coupon applied', 'success');
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
      onClick: () => console.log('Gift cards'),
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
      onClick: () => console.log('Voids'),
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
      id: 'coupon-code',
      icon: <TicketPercent className="w-5 h-5" />,
      label: 'Apply coupon',
      color: 'bg-gray-700',
      square: true,
      onClick: openCouponModal,
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
      onClick: () => console.log('Pay cash'),
    },
    {
      id: 'pay-card',
      icon: <CreditCard className="w-5 h-5" />,
      label: 'Pay card',
      color: 'bg-green-600',
      square: true,
      onClick: () => console.log('Pay card'),
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
          onClick={() => console.log('Pay cash')}
          className="flex-1 py-3 rounded bg-green-600 text-white font-semibold flex items-center justify-center gap-2"
        >
          <Banknote className="w-5 h-5" />
          Cash
        </button>
        <button
          onClick={() => console.log('Pay card')}
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
        isOpen={isCouponModalOpen}
        code={couponCodeInput}
        value={couponValueInput}
        current={couponData}
        onCodeChange={setCouponCodeInput}
        onValueChange={setCouponValueInput}
        onApply={handleApplyCoupon}
        onClose={() => setIsCouponModalOpen(false)}
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
        coupon={couponData}
        adjustment={appliedAdjustment}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
}

export default Transactions;

