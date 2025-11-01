import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, SidebarItem } from '@monorepo/shared-ui';
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
import { Dashboard } from '../pages/Dashboard';
import { Products } from '../pages/Products';
import { Transactions } from '../pages/Transactions';

// Logo component
const StoreLogo = () => <Store className="w-full h-full" />;

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Sidebar items configuration
  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-full h-full" />, path: '/' },
    { id: 'products', label: 'Products', icon: <Package className="w-full h-full" />, path: '/products' },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-full h-full" />, path: '/transactions', badge: 12 },
    { id: 'customers', label: 'Customers', icon: <Users className="w-full h-full" />, path: '/customers' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-full h-full" />, path: '/settings' },
  ];

  // Get active item based on current path
  const activeItemId = sidebarItems.find(item => item.path === location.pathname)?.id || 'dashboard';

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
        activeItemId,
        onItemClick: handleNavigation,
        logo: <StoreLogo />,
        appName: 'PayFlow POS',
      }}
      navbarProps={{
        searchPlaceholder: 'Search',
        onSearch: handleSearch,
        actions: [
          {
            id: 'globe',
            icon: <Globe className="w-full h-full" />,
            label: 'Language',
            onClick: () => console.log('Language clicked'),
          },
          {
            id: 'settings',
            icon: <Settings className="w-full h-full" />,
            label: 'Settings',
            onClick: () => console.log('Settings clicked'),
          },
          {
            id: 'help',
            icon: <HelpCircle className="w-full h-full" />,
            label: 'Help',
            onClick: () => console.log('Help clicked'),
          },
        ],
        userInfo: {
          name: 'Alexander Eggerer',
          role: '4 - HOUSTON_39',
        },
      }}
    >
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/customers" element={
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
            <p className="mt-4 text-gray-600">Customer management coming soon...</p>
          </div>
        } />
        <Route path="/settings" element={
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="mt-4 text-gray-600">Settings panel coming soon...</p>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
