import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Layout, SidebarItem, useTheme, CartProvider, TransactionCustomerProvider, ToastProvider, SplashScreen, useCart, useToast } from '@monorepo/shared-ui';
import { DesktopAuthProvider, useDesktopAuth } from '@monorepo/shared-ui';
import { StoreProvider, setCustomerRepository } from '@monorepo/shared-store';
import {
  Home,
  Package,
  Receipt,
  Users,
  Settings,
  Store,
  HelpCircle
} from 'lucide-react';
import { AppRoutes } from './routes.js';
import { Login } from '../pages/Login.js';
import { ConnectionStatus } from './components/ConnectionStatus.js';
import { getDesktopCustomerRepository } from './repositories/DesktopCustomerRepository.js';
import { useBarcodeScanner } from '@monorepo/shared-hooks-scanner';
import { lookupProductByBarcode } from './services/barcodeLookup.js';

// Import styles
import '@monorepo/shared-ui/styles/globals.css';
import '@monorepo/shared-ui/styles/components.css';
import './styles.css';

// Configure repositories before app initialization
setCustomerRepository(getDesktopCustomerRepository());

// Logo component
const StoreLogo = () => <Store className="w-full h-full" />;

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  const { isReady, isAuthenticated, logout, user } = useDesktopAuth();
  // Show splash only once per app load
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem('ui.splashShown');
    } catch {
      return true;
    }
  });
  // Navigation stack to track path history
  const navigationStackRef = useRef<string[]>([]);
  const isNavigatingBackRef = useRef<boolean>(false);
  const navigationSourceRef = useRef<string | null>(null);
  const categoryNameRef = useRef<string | null>(null);
  const productIdRef = useRef<string | null>(null);
  const [showBackButton, setShowBackButton] = useState(false);
  // Transaction line count for badges
  const { items, addItem, setItemQuantity } = useCart();
  const { show } = useToast();
  const scanLockRef = useRef(false);
  const lineCount = items.length;

  const isLoginRoute = location.pathname === '/login';
  const isTransactionsRoute = location.pathname === '/transactions';
  // Disable global scanner on Transactions page since it has its own scanner
  const scannerEnabled = isAuthenticated && !isLoginRoute && !isTransactionsRoute;

  const handleScannedBarcode = useCallback(
    async (barcode: string) => {
      if (!barcode || !isAuthenticated) {
        return;
      }

      if (scanLockRef.current) {
        return;
      }

      scanLockRef.current = true;
      const trimmed = barcode.trim();

      try {
        const result = await lookupProductByBarcode(trimmed);

        if (!result) {
          show(`No product found for barcode ${trimmed}`, 'error');
          return;
        }

        if (result.availableQuantity <= 0) {
          show(`${result.name} is out of stock`, 'error');
          return;
        }

        const targetId = result.variantId || result.productId || trimmed;

        const existingLine = items.find((item) => {
          if (result.variantId && item.productVariantId) {
            return item.productVariantId === result.variantId;
          }
          if (!result.variantId && result.productId && item.productId) {
            return item.productId === result.productId;
          }
          return false;
        });

        if (existingLine) {
          setItemQuantity(existingLine.id, existingLine.quantity + 1);
          show(`${result.name} quantity updated`, 'success');
          return;
        }

        addItem({
          id: targetId,
          name: result.name,
          price: result.price,
          quantity: 1,
          availableQuantity: result.availableQuantity,
          productId: result.productId,
          productVariantId: result.variantId,
        });
        show(`${result.name} added to cart`, 'success');
      } catch (error) {
        console.error('[Desktop] Failed to handle scanned barcode', error);
        show('Unable to add scanned product to cart', 'error');
      } finally {
        scanLockRef.current = false;
      }
    },
    [addItem, isAuthenticated, items, setItemQuantity, show]
  );

  useBarcodeScanner({
    onScan: handleScannedBarcode,
    onError: (message) => show(message, 'error'),
    enabled: scannerEnabled,
  });

  // Track navigation using stack
  useEffect(() => {
    const currentPath = location.pathname;
    const stack = navigationStackRef.current;
    const lastPath = stack.length > 0 ? stack[stack.length - 1] : null;

    // Only process if path actually changed
    if (currentPath !== lastPath) {
      // Check if current path is a category detail page (/category/:categoryName)
      const isCategoryDetail = /^\/category\//.test(currentPath) && currentPath !== '/category';
      // Check if current path is a product detail page (/products/:productId)
      const isProductDetail = /^\/products\//.test(currentPath) && currentPath !== '/products';

      if (isNavigatingBackRef.current) {
        // We're navigating back - find the current path in stack and trim everything after it
        const currentIndex = stack.lastIndexOf(currentPath);
        if (currentIndex !== -1 && currentIndex < stack.length - 1) {
          // If current path is in stack but not at the top, trim everything after it
          stack.length = currentIndex + 1;
        } else if (currentIndex === -1) {
          // If current path is not in stack, add it (shouldn't happen but handle gracefully)
          stack.push(currentPath);
        }
        // If current path is already at top of stack, do nothing
        isNavigatingBackRef.current = false;
      } else {
        // We're navigating forward - push to stack (but don't add duplicates)
        if (stack.length === 0 || stack[stack.length - 1] !== currentPath) {
          stack.push(currentPath);
        }
      }

      // Check if current path is payments page
      const isPayments = currentPath === '/payments';
      // Check if current path is customers page and previous page was transactions
      const isCustomers = currentPath === '/customers';
      const previousPath = stack.length > 1 ? stack[stack.length - 2] : null;
      const isCustomersFromTransactions = isCustomers && previousPath === '/transactions';

      // Extract category name or product ID for navbar display
      if (isCategoryDetail) {
        const categoryNameMatch = currentPath.match(/^\/category\/(.+)$/);
        if (categoryNameMatch) {
          categoryNameRef.current = decodeURIComponent(categoryNameMatch[1]);
          navigationSourceRef.current = '/category';
        }
        // Show back button if we have a previous path in stack
        setShowBackButton(stack.length > 1);
      } else if (isProductDetail) {
        const productIdMatch = currentPath.match(/^\/products\/(.+)$/);
        if (productIdMatch) {
          productIdRef.current = productIdMatch[1];
        }
        // Show back button if we have a previous path in stack
        setShowBackButton(stack.length > 1);
      } else if (isPayments) {
        // Payments page - always show back button
        setShowBackButton(true);
      } else if (isCustomersFromTransactions) {
        // Customers page opened from transactions - show back button
        setShowBackButton(true);
      } else {
        // Not a detail page - clear refs and hide back button
        navigationSourceRef.current = null;
        categoryNameRef.current = null;
        productIdRef.current = null;
        setShowBackButton(false);
      }
    }
  }, [location.pathname]);

  // Handle splash timing and persist flag for this session
  useEffect(() => {
    if (showSplash) {
      const t = setTimeout(() => {
        try { sessionStorage.setItem('ui.splashShown', '1'); } catch { void 0; }
        setShowSplash(false);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [showSplash]);

  const handleBackClick = () => {
    const stack = navigationStackRef.current;

    // Special handling for payments page - always go back to transactions
    if (location.pathname === '/payments') {
      isNavigatingBackRef.current = true;
      navigate('/transactions');
      return;
    }

    // Special handling for customers page opened from transactions
    if (location.pathname === '/customers' && stack.length >= 2) {
      const previousPath = stack[stack.length - 2];
      if (previousPath === '/transactions') {
        isNavigatingBackRef.current = true;
        navigate('/transactions');
        return;
      }
    }

    // If we have at least 2 items in stack, navigate to the previous one
    if (stack.length >= 2) {
      // Get the previous path (second to last item)
      const previousPath = stack[stack.length - 2];

      // Mark that we're navigating back
      isNavigatingBackRef.current = true;
      // Navigate to previous path
      navigate(previousPath);
    } else if (stack.length === 1) {
      // If only one item in stack, go to category as fallback
      isNavigatingBackRef.current = true;
      navigate('/category');
    }
  };

  // Sidebar items configuration
  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-full h-full" />, path: '/' },
    { id: 'category', label: 'Category', icon: <Package className="w-full h-full" />, path: '/category' },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-full h-full" />, path: '/transactions', badge: lineCount > 0 ? lineCount : undefined },
    { id: 'customers', label: 'Customers', icon: <Users className="w-full h-full" />, path: '/customers' },
  ];

  // Footer items (Settings and Help at bottom)
  const footerItems: SidebarItem[] = [
    { id: 'settings', label: 'Settings', icon: <Settings className="w-full h-full" />, path: '/settings' },
    { id: 'help', label: 'Help', icon: <HelpCircle className="w-full h-full" />, path: '/help' },
  ];

  // Check if current path is a category detail page or product detail page
  const isCategoryDetailPage = /^\/category\//.test(location.pathname) && location.pathname !== '/category';
  const isProductDetailPage = /^\/products\//.test(location.pathname) && location.pathname !== '/products';
  const isPaymentsPage = location.pathname === '/payments';

  // Check if customers page was opened from transactions (check navigation stack)
  const navigationStack = navigationStackRef.current;
  const isCustomersFromTransactionsPage =
    location.pathname === '/customers' &&
    navigationStack.length >= 2 &&
    navigationStack[navigationStack.length - 2] === '/transactions';

  // Get active item based on current path
  // If on category detail page or product detail page, don't show any sidebar item as active
  const allItems = [...sidebarItems, ...footerItems];
  const activeItemId = (isCategoryDetailPage || isProductDetailPage || isPaymentsPage || isCustomersFromTransactionsPage)
    ? undefined
    : (allItems.find(item => item.path === location.pathname)?.id || (location.pathname === '/' ? 'dashboard' : undefined));
  
  // Custom page name mapping for navbar
  const getCurrentPageName = () => {
    if (location.pathname === '/payments') {
      const mode = new URLSearchParams(location.search).get('mode');
      if (mode === 'cash') {
        return 'Cash';
      }
      if (mode === 'card') {
        return 'Card';
      }
      return 'Payments';
    }
    if (location.pathname === '/category') {
      return 'All Categories';
    }
    if (location.pathname === '/sales') {
      return 'Sales & Order';
    }
    if (location.pathname === '/payments') {
      return 'Payments';
    }
    // Category detail page - show category name
    if (isCategoryDetailPage && categoryNameRef.current) {
      return categoryNameRef.current;
    }
    // Product detail page - show product name or "Product Details"
    if (isProductDetailPage) {
      return 'Product Details';
    }
    if (location.pathname === '/products') {
      return 'Products';
    }
    return allItems.find(item => item.path === location.pathname)?.label;
  };
  const currentPageName = getCurrentPageName();

  // Navigation handler
  const handleNavigation = (item: SidebarItem) => {
    navigate(item.path);
  };

  // Search handler - navigate to products page with search query
  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    } else {
      // If search is empty, navigate to products page without query
      if (location.pathname === '/products') {
        navigate('/products');
      }
    }
  };

  // Show splash first time only, independent of auth readiness
  if (showSplash) {
    return <SplashScreen appName="PayFlow POS" logo={<Store className="w-24 h-24" style={{ color: 'var(--color-primary-500)' }} />} />;
  }
  // Wait for auth to initialize to avoid login flicker (no splash here)
  if (!isReady) {
    return null;
  }
  // Auth gate
  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }
  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  // Render Login page outside the Layout to cover the entire screen
  if (location.pathname === '/login') {
    return <Login />;
  }

  return (
    <Layout
      sidebarProps={{
        items: sidebarItems,
        footerItems: footerItems,
        activeItemId,
        onItemClick: handleNavigation,
        logo: <StoreLogo />,
        appName: 'PayFlow POS',
        showBackButton: showBackButton,
        onBackClick: handleBackClick,
        cartItemCount: lineCount,
      }}
      navbarProps={{
        searchPlaceholder: 'Search',
        currentPageName: currentPageName,
        onSearch: handleSearch,
        onThemeToggle: toggleTheme,
        isDarkMode: isDark,
        onSignOut: () => {
          logout();
          navigate('/login');
        },
        actions: [
          {
            id: 'connection',
            component: <ConnectionStatus />,
            label: 'Connection Status',
          },
        ],
        userInfo: user ? {
          name: `${user.firstName} ${user.lastName}`.trim() || user.username,
          role: user.roleName || user.roleId || 'User',
        } : undefined,
      }}
    >
      <AppRoutes />
    </Layout>
  );
}

function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <DesktopAuthProvider>
          <CartProvider>
            <TransactionCustomerProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </TransactionCustomerProvider>
          </CartProvider>
        </DesktopAuthProvider>
      </StoreProvider>
    </HashRouter>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
