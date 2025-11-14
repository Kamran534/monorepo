import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Layout, SidebarItem, useTheme, CartProvider, ToastProvider, SplashScreen, useCart } from '@monorepo/shared-ui';
import { DesktopAuthProvider, useDesktopAuth } from '@monorepo/shared-ui';
import { StoreProvider } from '@monorepo/shared-store';
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

// Import styles
import '@monorepo/shared-ui/styles/globals.css';
import '@monorepo/shared-ui/styles/components.css';
import './styles.css';

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
  const { items } = useCart();
  const lineCount = items.length;

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

  // Get active item based on current path
  // If on category detail page or product detail page, don't show any sidebar item as active
  const allItems = [...sidebarItems, ...footerItems];
  const activeItemId = (isCategoryDetailPage || isProductDetailPage)
    ? undefined
    : (allItems.find(item => item.path === location.pathname)?.id || (location.pathname === '/' ? 'dashboard' : undefined));
  
  // Custom page name mapping for navbar
  const getCurrentPageName = () => {
    if (location.pathname === '/category') {
      return 'All Categories';
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
            <ToastProvider>
              <AppContent />
            </ToastProvider>
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
