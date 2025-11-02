import React from 'react';
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
  const { theme, toggleTheme, isDark } = useTheme();

  // Sidebar items configuration
  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-full h-full" />, path: '/' },
    { id: 'products', label: 'Products', icon: <Package className="w-full h-full" />, path: '/products' },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-full h-full" />, path: '/transactions', badge: 12 },
    { id: 'customers', label: 'Customers', icon: <Users className="w-full h-full" />, path: '/customers' },
  ];

  // Footer items (Settings and Help at bottom)
  const footerItems: SidebarItem[] = [
    { id: 'settings', label: 'Settings', icon: <Settings className="w-full h-full" />, path: '/settings' },
    { id: 'help', label: 'Help', icon: <HelpCircle className="w-full h-full" />, path: '/help' },
  ];

  // Get active item based on current path
  const allItems = [...sidebarItems, ...footerItems];
  const activeItemId = allItems.find(item => item.path === location.pathname)?.id || 'dashboard';
  const currentPageName = allItems.find(item => item.path === location.pathname)?.label;

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
