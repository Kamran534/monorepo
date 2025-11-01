# Shared UI Components

Professional, responsive React components for Web and Desktop applications, styled with the Store Commerce theme.

## Components

### Sidebar

A responsive sidebar navigation component with collapsible functionality.

**Features:**
- ✅ Responsive design (mobile drawer, desktop persistent)
- ✅ Collapsible on desktop (toggle button)
- ✅ Active item highlighting
- ✅ Badge support for notifications
- ✅ Custom logo and app name
- ✅ Smooth animations
- ✅ Touch-friendly on mobile

**Usage:**

```tsx
import { Sidebar, SidebarItem } from '@monorepo/shared-ui';

const sidebarItems: SidebarItem[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/' 
  },
  { 
    id: 'products', 
    label: 'Products', 
    icon: <ProductsIcon />, 
    path: '/products',
    badge: 12 // Optional notification badge
  },
];

<Sidebar
  items={sidebarItems}
  activeItemId="dashboard"
  onItemClick={(item) => navigate(item.path)}
  logo={<YourLogoComponent />}
  appName="Your App Name"
  collapsed={false}
  onToggleCollapse={() => setCollapsed(!collapsed)}
/>
```

### Navbar

A responsive navbar with search, actions, and user menu.

**Features:**
- ✅ Responsive search bar (desktop centered, mobile below)
- ✅ Custom action buttons with badge support
- ✅ User info with dropdown menu
- ✅ Mobile menu button
- ✅ Smooth animations
- ✅ Sticky positioning

**Usage:**

```tsx
import { Navbar, NavbarAction } from '@monorepo/shared-ui';

const actions: NavbarAction[] = [
  {
    id: 'notifications',
    icon: <NotificationIcon />,
    label: 'Notifications',
    onClick: () => console.log('Notifications'),
    badge: 3 // Optional notification count
  },
];

<Navbar
  title="Dashboard"
  searchPlaceholder="Search products..."
  onSearch={(query) => handleSearch(query)}
  actions={actions}
  userInfo={{
    name: 'Admin User',
    role: 'Administrator',
    avatar: '/path/to/avatar.jpg' // Optional
  }}
  onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  showMenuButton={true}
/>
```

### Layout

A complete layout wrapper that combines Sidebar and Navbar.

**Features:**
- ✅ Automatic responsive behavior
- ✅ Mobile sidebar overlay
- ✅ Sticky navbar
- ✅ Scroll management
- ✅ All-in-one layout solution

**Usage:**

```tsx
import { Layout } from '@monorepo/shared-ui';

function App() {
  return (
    <Layout
      sidebarProps={{
        items: sidebarItems,
        activeItemId: activeId,
        onItemClick: handleNavigation,
        logo: <Logo />,
        appName: 'PayFlow POS',
      }}
      navbarProps={{
        title: 'Dashboard',
        searchPlaceholder: 'Search...',
        onSearch: handleSearch,
        actions: navbarActions,
        userInfo: {
          name: 'Admin',
          role: 'Administrator',
        },
      }}
    >
      {/* Your page content here */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
      </Routes>
    </Layout>
  );
}
```

## Component Styles

Pre-built CSS classes available for common components:

### Buttons

```tsx
<button className="btn btn-primary">Primary Button</button>
<button className="btn btn-secondary">Secondary Button</button>
<button className="btn btn-success">Success Button</button>
<button className="btn btn-error">Error Button</button>
```

### Cards

```tsx
<div className="card">
  <div className="card-header">
    <h2 className="card-title">Card Title</h2>
  </div>
  <p>Card content...</p>
</div>
```

### Inputs

```tsx
<input type="text" className="input" placeholder="Enter text..." />
<input type="text" className="input" disabled placeholder="Disabled" />
```

### Tables

```tsx
<table className="table">
  <thead className="table-header">
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr className="table-row">
      <td className="table-cell">Data 1</td>
      <td className="table-cell">Data 2</td>
    </tr>
  </tbody>
</table>
```

### Badges

```tsx
<span className="badge badge-primary">Primary</span>
<span className="badge badge-success">Success</span>
<span className="badge badge-error">Error</span>
<span className="badge badge-warning">Warning</span>
<span className="badge badge-info">Info</span>
```

## Responsive Breakpoints

All components are responsive and adapt to the following breakpoints:

- **Mobile Small**: 320px - 479px (xs)
- **Mobile**: 480px - 639px (sm)
- **Tablet**: 640px - 767px (md)
- **Tablet Large**: 768px - 1023px (lg)
- **Desktop**: 1024px - 1279px (xl)
- **Desktop Large**: 1280px+ (2xl)

## Color Palette

The components use the Store Commerce color scheme:

- **Primary**: Blue (#3b82f6)
- **Secondary**: Purple (#8b5cf6)
- **Success**: Green (#10b981)
- **Error**: Red (#ef4444)
- **Warning**: Yellow (#f59e0b)
- **Info**: Cyan (#06b6d4)

## Icons

This project uses **lucide-react** for all icons. Lucide provides beautiful, consistent icons with a clean API.

**Installation:**
```bash
npm install lucide-react
```

**Usage Example:**
```tsx
import { Home, Package, Receipt, Users, Settings, Bell, Store } from 'lucide-react';

// In your component
const sidebarItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: <Home className="w-full h-full" />, 
    path: '/' 
  },
  { 
    id: 'products', 
    label: 'Products', 
    icon: <Package className="w-full h-full" />, 
    path: '/products' 
  },
];
```

**Popular Icons:**
- `Home` - Dashboard/Home icon
- `Package` - Products/Inventory icon
- `Receipt` - Transactions/Orders icon
- `Users` - Customers/People icon
- `Settings` - Settings/Configuration icon
- `Bell` - Notifications icon
- `Store` - Shop/Store icon
- `Search` - Search icon
- `Plus` - Add/Create icon
- `Edit` - Edit icon
- `Trash2` - Delete icon
- `Eye` - View icon
- `Printer` - Print icon

See all available icons at: https://lucide.dev/icons/

## Integration with Router

The components work seamlessly with React Router:

```tsx
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
// For Electron apps, use HashRouter instead:
// import { HashRouter, useNavigate, useLocation } from 'react-router-dom';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleNavigation = (item: SidebarItem) => {
    navigate(item.path);
  };
  
  // Get active item from current route
  const activeItemId = sidebarItems.find(
    item => item.path === location.pathname
  )?.id;
  
  return (
    <Layout
      sidebarProps={{
        items: sidebarItems,
        activeItemId,
        onItemClick: handleNavigation,
        ...
      }}
      ...
    >
      <Routes>
        <Route path="/" element={<Dashboard />} />
        ...
      </Routes>
    </Layout>
  );
}
```

## TypeScript Support

All components are fully typed with TypeScript:

```typescript
interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
}

interface NavbarAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: string | number;
}

interface SidebarProps extends ComponentProps {
  items: SidebarItem[];
  activeItemId?: string;
  onItemClick?: (item: SidebarItem) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  logo?: React.ReactNode;
  appName?: string;
}

// ... and more
```

## Examples

See the following apps for complete examples:
- **Web App**: `apps/web/src/app/app.tsx`
- **Desktop App**: `apps/desktop/src/renderer/main.tsx`

## Support

For issues or questions, please refer to the main project documentation.

