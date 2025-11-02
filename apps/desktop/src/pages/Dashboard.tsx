// import { useState } from 'react';
import {
  ImageSlider,
  StartSection,
  ProductSection,
  InventorySection,
  ShiftDrawerSection,
  AccountSettingsSection,
  type SlideItem,
  type NavigationTile,
  type ProductCategory,
  type InventoryTile,
  type ShiftDrawerTile,
  type AccountSettingsTile
} from '@monorepo/shared-ui';
import { allCollections, allCategories } from '@monorepo/shared-assets';
import {
  ShoppingBag,
  PackageSearch,
  FileText,
  PackageCheck,
  Truck,
  TrendingUp,
  Search,
  ClipboardList,
  PackagePlus,
  DollarSign,
  ArrowRightLeft,
  PackageMinus,
  PackageOpen,
  BarChart3,
  Clock,
  XCircle,
  Printer,
  Lock,
  HandCoins,
  Wallet,
  User,
  Shield,
  Bell,
  Settings,
  Key,
  Mail,
  Smartphone,
  Globe,
  CreditCard,
  Download,
  HelpCircle,
  LogOut
} from 'lucide-react';

export function Dashboard() {
  // const [name, setName] = useState('');
  // const [collectedName, setCollectedName] = useState<string | null>(null);

  const handleSlideClick = (slide: SlideItem, index: number) => {
    console.log(`Clicked on ${slide.title} (slide ${index + 1})`);
    // TODO: Navigate to collection page or show details
  };

  const handleSlideChange = (index: number) => {
    console.log(`Now showing slide ${index + 1}`);
  };

  // Convert category images to ProductCategory format
  const productCategories: ProductCategory[] = allCategories.map((category) => ({
    id: category.name.toLowerCase(),
    name: category.name,
    image: category.path,
    onClick: () => console.log(`${category.name} category clicked`),
  }));

  const shiftDrawerTiles: ShiftDrawerTile[] = [
    // Row 1-2: Large squares + Float entry (tall)
    {
      id: 'suspend-shift',
      title: 'Suspend shift',
      icon: <Clock />,
      colSpan: 1,
      rowSpan: 2,
      backgroundColor: 'var(--color-tile-brown-1)',
      onClick: () => console.log('Suspend shift clicked'),
    },
    {
      id: 'show-journal',
      title: 'Show journal',
      icon: <FileText />,
      colSpan: 1,
      rowSpan: 2,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Show journal clicked'),
    },
    {
      id: 'declare-start-amount',
      title: 'Declare start amount',
      icon: <HandCoins />,
      colSpan: 1,
      rowSpan: 2,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Declare start amount clicked'),
    },
    {
      id: 'float-entry',
      title: 'Float entry',
      colSpan: 1,
      rowSpan: 2,
      backgroundColor: 'var(--color-tile-brown-4)',
      onClick: () => console.log('Float entry clicked'),
    },
    // Row 3-4: Large squares + Tender removal (tall)
    {
      id: 'close-shift',
      title: 'Close shift',
      icon: <XCircle />,
      colSpan: 1,
      rowSpan: 2,
      backgroundColor: 'var(--color-tile-brown-1)',
      onClick: () => console.log('Close shift clicked'),
    },
    {
      id: 'print-x-report',
      title: 'Print X-report',
      icon: <Printer />,
      colSpan: 1,
      rowSpan: 2,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Print X-report clicked'),
    },
    {
      id: 'declare-tender',
      title: 'Declare tender',
      icon: <DollarSign />,
      colSpan: 1,
      rowSpan: 2,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Declare tender clicked'),
    },
    {
      id: 'tender-removal',
      title: 'Tender removal',
      colSpan: 1,
      rowSpan: 2,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Tender removal clicked'),
    },
    // Row 5: Blind close shift (wide) + Declare tender + Tender removal
    {
      id: 'blind-close-shift',
      title: 'Blind close shift',
      colSpan: 2,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-4)',
      onClick: () => console.log('Blind close shift clicked'),
    },
    {
      id: 'print-z-report',
      title: 'Print Z-report',
      icon: <Printer />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Print Z-report clicked'),
    },
    {
      id: 'open-drawer',
      title: 'Open drawer',
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-1)',
      onClick: () => console.log('Open drawer clicked'),
    },
    // Row 6: Manage shifts + Income accounts + Print Z-report + Open drawer
    {
      id: 'manage-shifts',
      title: 'Manage shifts',
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Manage shifts clicked'),
    },
    {
      id: 'income-accounts',
      title: 'Income accounts',
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Income accounts clicked'),
    },
    // Row 7: All small tiles (Manage safes + Expense + Safe drop + Bank drop)
    {
      id: 'manage-safes',
      title: 'Manage safes',
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Manage safes clicked'),
    },
    {
      id: 'expense-accounts',
      title: 'Expense accounts',
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Expense accounts clicked'),
    },
    {
      id: 'safe-drop',
      title: 'Safe drop',
      icon: <Lock />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-4)',
      onClick: () => console.log('Safe drop clicked'),
    },
    {
      id: 'bank-drop',
      title: 'Bank drop',
      icon: <Wallet />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Bank drop clicked'),
    },
  ];

  const inventoryTiles: InventoryTile[] = [
    // Row 1
    {
      id: 'inventory-lookup',
      title: 'Inventory lookup',
      icon: <Search />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-1)',
      onClick: () => console.log('Inventory lookup clicked'),
    },
    {
      id: 'inventory-adjustment',
      title: 'Inventory adjustment',
      icon: <ClipboardList />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Inventory adjustment clicked'),
    },
    {
      id: 'inbound-inventory',
      title: 'Inbound inventory',
      icon: <PackagePlus />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Inbound inventory clicked'),
    },
    // Row 2
    {
      id: 'price-check',
      title: 'Price check',
      icon: <DollarSign />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-1)',
      onClick: () => console.log('Price check clicked'),
    },
    {
      id: 'inventory-movement',
      title: 'Inventory movement',
      icon: <ArrowRightLeft />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Inventory movement clicked'),
    },
    {
      id: 'outbound-inventory',
      title: 'Outbound inventory',
      icon: <PackageMinus />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Outbound inventory clicked'),
    },
    // Row 3
    {
      id: 'view-discounts',
      title: 'View all discounts',
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-4)',
      onClick: () => console.log('View all discounts clicked'),
    },
    {
      id: 'disassemble-kits',
      title: 'Disassemble kits',
      icon: <PackageOpen />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Disassemble kits clicked'),
    },
    {
      id: 'stock-count',
      title: 'Stock count',
      icon: <BarChart3 />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Stock count clicked'),
    },
  ];

  const navigationTiles: NavigationTile[] = [
    // Row 1: Current transaction (2 cols) + Return transaction
    {
      id: 'current-transaction',
      title: 'Current transaction',
      icon: <ShoppingBag />,
      colSpan: 2,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-1)',
      onClick: () => console.log('Current transaction clicked'),
    },
    {
      id: 'return-transaction',
      title: 'Return transaction',
      icon: <PackageSearch />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Return transaction clicked'),
    },
    // Row 2: Three square tiles
    {
      id: 'find-manage-orders',
      title: 'Find and manage orders',
      icon: <FileText />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Find and manage orders clicked'),
    },
    {
      id: 'orders-pick-up',
      title: 'Orders to pick up',
      icon: <PackageCheck />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Orders to pick up clicked'),
    },
    {
      id: 'orders-ship',
      title: 'Orders to ship',
      icon: <Truck />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-3)',
      onClick: () => console.log('Orders to ship clicked'),
    },
    // Row 3: Order lines + My clients + Store reports (lighter)
    {
      id: 'order-lines-fulfil',
      title: 'Order lines to fulfil',
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-4)',
      onClick: () => console.log('Order lines to fulfil clicked'),
    },
    {
      id: 'my-clients',
      title: 'My clients',
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-4)',
      onClick: () => console.log('My clients clicked'),
    },
    {
      id: 'store-reports',
      title: 'Store reports',
      icon: <TrendingUp />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Store reports clicked'),
    },
    // Row 4: Two icon-only tiles + Store clients
    {
      id: 'icon-1',
      icon: <ShoppingBag />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-4)',
      onClick: () => console.log('Icon 1 clicked'),
    },
    {
      id: 'icon-2',
      icon: <FileText />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-4)',
      onClick: () => console.log('Icon 2 clicked'),
    },
    {
      id: 'store-clients',
      title: 'Store clients',
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-2)',
      onClick: () => console.log('Store clients clicked'),
    },
    // Row 5: Tasks (2 cols wide)
    {
      id: 'tasks',
      title: 'Tasks',
      colSpan: 2,
      rowSpan: 1,
      backgroundColor: 'var(--color-tile-brown-4)',
      onClick: () => console.log('Tasks clicked'),
    },
  ];

  const accountSettingsTiles: AccountSettingsTile[] = [
    // Row 1: Profile + Security + Notifications
    {
      id: 'profile',
      title: 'Profile',
      icon: <User />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-dark)',
      onClick: () => console.log('Profile clicked'),
    },
    {
      id: 'security',
      title: 'Security',
      icon: <Shield />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-medium)',
      onClick: () => console.log('Security clicked'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-grey)',
      onClick: () => console.log('Notifications clicked'),
    },
    // Row 2: Preferences + Password + Email
    {
      id: 'preferences',
      title: 'Preferences',
      icon: <Settings />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-light)',
      onClick: () => console.log('Preferences clicked'),
    },
    {
      id: 'password',
      title: 'Password',
      icon: <Key />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-dark)',
      onClick: () => console.log('Password clicked'),
    },
    {
      id: 'email',
      title: 'Email',
      icon: <Mail />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-medium)',
      onClick: () => console.log('Email clicked'),
    },
    // Row 3: Device + Language + Billing
    {
      id: 'devices',
      title: 'Devices',
      icon: <Smartphone />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-grey)',
      onClick: () => console.log('Devices clicked'),
    },
    {
      id: 'language',
      title: 'Language',
      icon: <Globe />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-light)',
      onClick: () => console.log('Language clicked'),
    },
    {
      id: 'billing',
      title: 'Billing',
      icon: <CreditCard />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-dark)',
      onClick: () => console.log('Billing clicked'),
    },
    // Row 4: Export Data + Help + Logout
    {
      id: 'export',
      title: 'Export Data',
      icon: <Download />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-medium)',
      onClick: () => console.log('Export Data clicked'),
    },
    {
      id: 'help',
      title: 'Help',
      icon: <HelpCircle />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-grey)',
      onClick: () => console.log('Help clicked'),
    },
    {
      id: 'logout',
      title: 'Logout',
      icon: <LogOut />,
      colSpan: 1,
      rowSpan: 1,
      backgroundColor: 'var(--color-bg-settings-dark)',
      onClick: () => console.log('Logout clicked'),
    },
  ];

  // const handleSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (name.trim()) {
  //     setCollectedName(name.trim());
  //     setName('');
  //     console.log('Collected name:', name.trim());
  //   }
  // };

  return (
    <div
      className="flex"
      style={{
        margin: 0,
        padding: '0 24px 0 0',
        minWidth: 'fit-content',
      }}
    >
      {/* Hero Slider */}
      <div className="flex-shrink-0" style={{ margin: 0, padding: 0, lineHeight: 0, display: 'block' }}>
        <ImageSlider
          slides={allCollections}
          autoPlay={true}
          autoPlayInterval={5000}
          showControls={true}
          showIndicators={true}
          height="85vh"
          width="35vw"
          onSlideClick={handleSlideClick}
          onSlideChange={handleSlideChange}
        />
      </div>

      {/* Start Section */}
      <div className="flex-shrink-0 w-96">
        <StartSection tiles={navigationTiles} title="Start" />
      </div>

      {/* Product Categories Section */}
      <div className="flex-shrink-0" style={{ width: '450px' }}>
        <ProductSection categories={productCategories} title="Products" />
      </div>

      {/* Inventory Section */}
      <div className="flex-shrink-0 w-96">
        <InventorySection tiles={inventoryTiles} title="Inventory" />
      </div>

      {/* Shift and Drawer Section */}
      <div className="flex-shrink-0" style={{ width: '550px' }}>
        <ShiftDrawerSection tiles={shiftDrawerTiles} title="Shift and drawer" />
      </div>

      {/* Account Settings Section */}
      <div className="flex-shrink-0 w-96">
        <AccountSettingsSection tiles={accountSettingsTiles} title="Account Settings" />
      </div>
    </div>
  );
}
