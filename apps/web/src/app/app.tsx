import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { Layout, SidebarItem, useTheme } from '@monorepo/shared-ui';
import { 
  Home, 
  Package, 
  Receipt, 
  Users, 
  Settings, 
  Store,
  Globe,
  HelpCircle
} from 'lucide-react';
import { AppRoutes } from './routes';

// Logo component
const StoreLogo = () => <Store className="w-full h-full" />;

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  // Navigation stack to track path history
  const navigationStackRef = useRef<string[]>([]);
  const isNavigatingBackRef = useRef<boolean>(false);
  const navigationSourceRef = useRef<string | null>(null);
  const categoryNameRef = useRef<string | null>(null);
  const productIdRef = useRef<string | null>(null);
  const [showBackButton, setShowBackButton] = useState(false);
  // TODO: Replace with actual cart state management
  const [cartItemCount] = useState<number>(3); // Sample value - replace with actual cart count

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
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-full h-full" />, path: '/transactions', badge: 12 },
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

  // Search handler
  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
    // TODO: Implement search functionality
  };

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
        cartItemCount: cartItemCount,
      }}
      navbarProps={{
        searchPlaceholder: 'Search',
        currentPageName: currentPageName,
        onSearch: handleSearch,
        onThemeToggle: toggleTheme,
        isDarkMode: isDark,
        actions: [
          {
            id: 'globe',
            icon: <Globe className="w-full h-full" />,
            label: 'Language',
            onClick: () => console.log('Language clicked'),
          },
        ],
        userInfo: {
          name: 'Alexander Eggerer',
          role: '4 - HOUSTON_39',
        },
      }}
    >
      <AppRoutes />
    </Layout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
