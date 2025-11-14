# 🪙 PayFlow Experience Platform - Monorepo

A **production-ready, cross-platform** Point of Sale (POS) system powered by Nx, delivering unified web, desktop, and mobile experiences with offline-first architecture, hardware integration, and real-time synchronization.

[![Nx](https://img.shields.io/badge/Nx-22+-0E1128.svg)](https://nx.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-28+-47848F.svg)](https://www.electronjs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.79+-61DAFB.svg)](https://reactnative.dev/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Workspace Structure](#-workspace-structure)
- [Applications](#-applications)
- [Shared Libraries](#-shared-libraries)
- [Setup & Installation](#-setup--installation)
- [Configuration](#-configuration)
- [Running the Apps](#-running-the-apps)
- [Building & Packaging](#-building--packaging)
- [Development Workflow](#-development-workflow)
- [Testing & Quality](#-testing--quality)
- [Hardware Integration](#-hardware-integration)
- [Offline Support](#-offline-support)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Project Status](#-project-status)

---

## 🎯 Overview

**PayFlow** is an enterprise-grade Point of Sale system that unifies retail operations across multiple platforms. Built as an Nx monorepo, it enables code sharing between web, desktop, and mobile applications while maintaining platform-specific optimizations.

### 🎨 Design Philosophy

1. **Cross-Platform First** – Write once, deploy everywhere with platform-specific enhancements.
2. **Offline-Ready Architecture** – Full functionality without internet connectivity using IndexedDB and SQLite.
3. **Hardware Integration** – Native support for barcode scanners, receipt printers, and POS peripherals.
4. **Real-Time Synchronization** – Seamless data sync between devices and backend services.
5. **Developer Experience** – Nx-powered incremental builds, caching, and affected-based testing.
6. **Type Safety** – End-to-end TypeScript with shared types across all platforms.

### 💡 Use Cases

- **Retail Stores** – Full-featured POS terminals with offline support
- **Restaurants** – Fast order entry with kitchen printing
- **Mobile Sales** – Field sales with handheld devices
- **Pop-up Shops** – Quick deployment without complex infrastructure
- **Multi-location** – Centralized inventory across stores

---

## ✨ Key Features

### 🖥️ Multi-Platform Applications

- ✅ **Web App** – Progressive Web App (PWA) with offline-first capabilities
- ✅ **Desktop App** – Native Windows/Mac/Linux application via Electron
- ✅ **Mobile App** – iOS and Android native apps with React Native

### 🏪 Core POS Features

- ✅ **Product Catalog** – Hierarchical categories with rich product information
- ✅ **Product Search** – Real-time search with URL-based filtering and auto-routing
- ✅ **Transaction Management** – Fast checkout with multiple payment methods
- ✅ **Inventory Tracking** – Real-time stock levels and alerts
- ✅ **Receipt Printing** – Thermal printer support with custom templates
- ✅ **Barcode Scanning** – Hardware scanner integration across platforms
- ✅ **Keyboard Shortcuts** – Power-user workflows for speed
- ✅ **Multi-currency** – International sales support
- ✅ **State Management** – Redux store with intelligent caching for categories and products

### 🌐 Offline & Sync

- ✅ **Full Offline Mode** – Complete POS functionality without internet
- ✅ **Automatic Sync** – Background synchronization when online
- ✅ **Conflict Resolution** – Smart merge strategies for concurrent changes
- ✅ **IndexedDB Storage** – Client-side database for web/desktop
- ✅ **SQLite Storage** – Native database for desktop/mobile apps

### 📦 Shared Component Library

- ✅ **Design System** – Consistent UI components across platforms
- ✅ **Theme System** – CSS variables for customizable branding
- ✅ **Layout Components** – Sidebar, navbar, panels, breadcrumbs
- ✅ **Business Components** – Product cards, category sections, transaction lists
- ✅ **Form Controls** – Inputs, buttons, modals optimized for POS workflows

### 🔧 Developer Tools

- ✅ **Nx Workspace** – Monorepo orchestration with caching
- ✅ **Hot Module Replacement** – Fast development feedback loops
- ✅ **Type-Safe APIs** – Shared TypeScript types across layers
- ✅ **Automated Scripts** – Icon updates, asset synchronization
- ✅ **Incremental Builds** – Only rebuild what changed

---

## 🏛️ Architecture

### High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    PayFlow Monorepo (Nx)                       │
│              Unified Codebase for All Platforms                │
└────────────┬───────────────────────────┬───────────────────────┘
             │                           │
             ▼                           ▼
   ┌─────────────────┐         ┌─────────────────┐
   │  Applications   │         │ Shared Libraries │
   └────────┬────────┘         └────────┬─────────┘
            │                           │
            ├──────────┬────────────────┼──────────┬────────────┐
            ▼          ▼                ▼          ▼            ▼
    ┌────────────┐ ┌──────────┐  ┌─────────┐ ┌────────┐ ┌──────────┐
    │    Web     │ │ Desktop  │  │   UI    │ │ Hooks  │ │  Assets  │
    │ React+Vite │ │ Electron │  │Components│ │Scanner │ │ Images   │
    └──────┬─────┘ └────┬─────┘  └─────────┘ └────────┘ └──────────┘
           │            │
           │            ▼
           │    ┌──────────────┐
           │    │   SQLite     │
           │    │  (Desktop)   │
           │    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │  IndexedDB   │
    │    (Web)     │
    └──────────────┘
           │
           ▼
    ┌──────────────────────────────┐
    │   Backend API (pos-server)   │
    │   PostgreSQL + RabbitMQ      │
    └──────────────────────────────┘
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│               (React Components + Shared UI)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│        Route Handlers, State Management, Business Logic         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Data Access Layer                             │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  Repository Pattern (Web/Desktop Specific)           │      │
│   │  - CategoryRepository                                │      │
│   │  - ProductRepository                                 │      │
│   │  - TransactionRepository                             │      │
│   └──────────────────────────────────────────────────────┘      │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐    ┌──────────────┐
│  IndexedDB   │     │   SQLite     │    │  Backend API │
│   (Web)      │     │ (Desktop)    │    │ (pos-server) │
└──────────────┘     └──────────────┘    └──────────────┘
```

### Offline-First Flow

```
User Action → Check Connection State → Route to Data Source
                                       │
                      ┌────────────────┼────────────────┐
                      ▼                ▼                ▼
                  Online            Offline         Syncing
                     │                │                │
                     ▼                ▼                ▼
              Backend API      Local Storage    Queue + Merge
              (Real-time)      (IndexedDB)      (Background)
                     │                │                │
                     └────────────────┴────────────────┘
                                      │
                                      ▼
                            Update UI with Data
```

---

## 🛠️ Tech Stack

### Core Framework & Tooling
- **Workspace**: Nx 22+ (monorepo orchestration, caching, affected commands)
- **Language**: TypeScript 5.3+ (strict mode, path mapping)
- **Package Manager**: npm 10
- **Build System**: Vite 7 (web), electron-vite (desktop), Metro (mobile)
- **Testing**: Jest 30 (unit tests), React Testing Library
- **Linting**: ESLint 9 + TypeScript ESLint

### Web Application
- **Framework**: React 19
- **Bundler**: Vite 7
- **PWA**: vite-plugin-pwa + Workbox
- **Storage**: IndexedDB (via custom wrapper)
- **Service Worker**: Workbox strategies (cache-first, network-first)
- **Routing**: React Router DOM 7

### Desktop Application
- **Framework**: Electron 28
- **Renderer**: React 19
- **Build Tool**: electron-vite
- **Packager**: electron-builder (NSIS, MSI, portable)
- **Storage**: better-sqlite3 (native SQLite)
- **IPC**: Electron contextBridge (secure preload pattern)

### Mobile Application
- **Framework**: React Native 0.79
- **CLI**: React Native Community CLI 18
- **Styling**: NativeWind (Tailwind for React Native)
- **Navigation**: React Navigation (planned)
- **Storage**: AsyncStorage / SQLite

### Shared Libraries
- **State Management**: Redux Toolkit + React Redux (centralized store with caching)
- **UI**: Custom React components with CSS variables
- **Icons**: Lucide React (tree-shakeable icon library)
- **Styling**: Tailwind CSS 3.4 + PostCSS
- **Hooks**: Custom hooks for scanner, printer, keyboard shortcuts
- **Types**: Shared TypeScript definitions across workspace

### Backend Integration
- **API**: RESTful endpoints (pos-server project)
- **Database**: PostgreSQL 14+ (via Prisma ORM)
- **Message Queue**: RabbitMQ 3+ (async sync jobs)
- **Authentication**: JWT tokens + Clerk (optional)

---

## 📁 Workspace Structure

```
monorepo/
├── apps/
│   ├── web/                          # Progressive Web App
│   │   ├── src/
│   │   │   ├── app/                  # App routing and layout
│   │   │   ├── pages/                # Page components (Home, Category, Products, etc.)
│   │   │   ├── services/             # Data access services
│   │   │   │   ├── repositories/     # Repository pattern implementations
│   │   │   │   ├── data-access.service.ts
│   │   │   │   └── connection-state.service.ts
│   │   │   └── main.tsx              # Entry point with PWA registration
│   │   ├── public/                   # Static assets, PWA manifest
│   │   ├── vite.config.ts            # Vite + PWA configuration
│   │   └── project.json              # Nx target configuration
│   │
│   ├── desktop/                      # Electron Application
│   │   ├── src/
│   │   │   ├── main/                 # Electron main process
│   │   │   │   ├── main.ts           # Window management, lifecycle
│   │   │   │   ├── ipc/              # IPC handlers for renderer communication
│   │   │   │   └── services/         # Database, sync, hardware services
│   │   │   ├── preload/              # Context bridge (secure IPC)
│   │   │   │   └── preload.ts        # Exposed APIs to renderer
│   │   │   └── renderer/             # React UI (shares code with web)
│   │   │       ├── pages/            # Same page components as web
│   │   │       └── index.html        # Entry HTML
│   │   ├── libsdb/                   # SQLite database schema
│   │   ├── electron.vite.config.ts   # electron-vite configuration
│   │   ├── package.json              # Electron-specific scripts & dependencies
│   │   └── release/                  # Built installers (NSIS, MSI, portable)
│   │
│   └── mobile/                       # React Native Application
│       ├── src/
│       │   ├── app/                  # App root and navigation
│       │   └── pages/                # Native page implementations
│       ├── android/                  # Android native project
│       ├── ios/                      # iOS native project (Xcode)
│       ├── app.json                  # React Native config
│       └── metro.config.js           # Metro bundler configuration
│
├── libs/
│   └── shared/
│       ├── ui/                       # Shared UI Component Library
│       │   ├── src/
│       │   │   ├── components/
│       │   │   │   ├── category/     # CategoryCard, CategorySection, CategoryBreadcrumb
│       │   │   │   ├── home/         # Home sections (Start, Inventory, Product, etc.)
│       │   │   │   ├── products/     # Product list, filters, info, images, specs
│       │   │   │   ├── transactions/ # Numpad, transaction lines, quantity panel
│       │   │   │   ├── receipt/      # Invoice component
│       │   │   │   ├── Layout.tsx    # Main layout wrapper
│       │   │   │   ├── Navbar.tsx    # Top navigation bar
│       │   │   │   ├── Sidebar.tsx   # Side navigation
│       │   │   │   ├── SidePanel.tsx # Side drawer panel
│       │   │   │   ├── Loading.tsx   # Loading spinner
│       │   │   │   └── SplashScreen.tsx
│       │   │   ├── styles/
│       │   │   │   ├── globals.css   # Global styles, CSS variables
│       │   │   │   └── components.css
│       │   │   └── types.ts          # Shared component types
│       │   └── package.json
│       │
│       ├── hooks/                    # Shared React Hooks
│       │   ├── scanner/              # Barcode Scanner Hook
│       │   │   ├── src/
│       │   │   │   ├── useBarcodeScanner.ts
│       │   │   │   ├── BarcodeScanner.tsx
│       │   │   │   └── index.ts
│       │   │   └── package.json
│       │   │
│       │   ├── printer/              # Receipt Printer Hook
│       │   │   ├── src/
│       │   │   │   ├── usePrinter.ts
│       │   │   │   ├── PrintPreview.tsx
│       │   │   │   └── index.ts
│       │   │   └── package.json
│       │   │
│       │   └── keyboard-shortcuts/   # Keyboard Shortcut Hook
│       │       ├── src/
│       │       │   ├── useKeyboardShortcuts.ts
│       │       │   └── index.ts
│       │       └── package.json
│       │
│       ├── store/                    # Redux Store (State Management)
│       │   ├── src/
│       │   │   ├── lib/
│       │   │   │   ├── store.tsx    # Store configuration
│       │   │   │   ├── provider.tsx # StoreProvider component
│       │   │   │   ├── hooks.ts     # Typed Redux hooks
│       │   │   │   ├── slices/      # Redux slices (category, etc.)
│       │   │   │   └── selectors/   # Memoized selectors
│       │   │   └── index.ts
│       │   └── package.json
│       │
│       ├── data-access/              # Data Layer (Repositories, Sync)
│       │   ├── src/
│       │   │   ├── lib/
│       │   │   │   ├── integration/  # Backend API integration
│       │   │   │   ├── sync/         # Synchronization logic
│       │   │   │   └── types/        # Shared data types
│       │   │   └── index.ts
│       │   └── package.json
│       │
│       └── assets/                   # Shared Images & Assets
│           ├── images/
│           │   ├── categories/       # Category images (30+ JPGs)
│           │   ├── collections/      # Collection banners
│           │   └── brands/           # Brand logos
│           └── package.json
│
├── dist/                             # Nx build outputs
│   └── apps/
│       ├── web/                      # Production web build
│       └── desktop/                  # Electron build artifacts
│
├── scripts/
│   └── update-icons.js               # Asset synchronization script
│
├── nx.json                           # Nx workspace configuration
├── tsconfig.base.json                # Root TypeScript config (path mapping)
├── package.json                      # Root package.json (workspace scripts)
├── tailwind.config.js                # Shared Tailwind configuration
├── postcss.config.js                 # PostCSS plugins
└── README.md                         # This file
```

---

## 🖥️ Applications

### Web Application (`apps/web`)

**Technology**: React 19 + Vite 7 + PWA

**Key Features**:
- Progressive Web App with offline support
- Service worker for caching and offline functionality
- IndexedDB for client-side data storage
- Real-time sync with backend API
- Responsive design for tablets and desktops

**Main Pages**:
- `/` - Home dashboard with quick actions
- `/category` - Hierarchical category browser
- `/products` - Product listing with real-time search, filtering, and sorting
- `/products?search=<query>` - Product search with URL-based filtering
- `/products/:id` - Product detail view
- `/transaction` - Checkout and payment
- `/settings` - Application settings

**Data Flow**:
1. User interacts with UI (React components)
2. Repository checks connection state
3. If online: Fetch from backend API, update IndexedDB
4. If offline: Read from IndexedDB
5. Background sync when connection restored

**Build Output**: `dist/apps/web/` (static files ready for hosting)

### Desktop Application (`apps/desktop`)

**Technology**: Electron 28 + React 19 + SQLite

**Key Features**:
- Native Windows/Mac/Linux application
- SQLite database for local storage
- Hardware integration (USB scanners, thermal printers)
- Auto-update support (via electron-builder)
- System tray integration
- Keyboard shortcuts

**Architecture**:
- **Main Process**: Node.js runtime, manages windows, IPC, database
- **Renderer Process**: React UI (browser-like, sandboxed)
- **Preload Script**: Secure bridge between main and renderer

**IPC APIs Exposed**:
```typescript
window.electronAPI = {
  category: { getAll, getById, create, update, delete },
  product: { getAll, getById, search, create, update },
  transaction: { create, getAll, getById },
  printer: { print, getDevices, setDefault },
  scanner: { start, stop, onScan },
  system: { getAppVersion, checkForUpdates }
}
```

**Build Outputs**:
- `apps/desktop/release/*.exe` - Windows NSIS installer
- `apps/desktop/release/*.msi` - Windows MSI installer
- `apps/desktop/release/*.AppImage` - Linux portable

### Mobile Application (`apps/mobile`)

**Technology**: React Native 0.79 + NativeWind

**Key Features**:
- iOS and Android native apps
- Native barcode scanning (camera)
- Offline-first with AsyncStorage
- Native navigation and gestures
- Push notifications (planned)

**Platform Support**:
- **Android**: Min SDK 24 (Android 7.0+)
- **iOS**: iOS 13.0+

**Build Outputs**:
- `apps/mobile/android/app/build/outputs/apk/` - Android APK
- `apps/mobile/ios/build/` - iOS archive (Xcode)

---

## 📦 Shared Libraries

### UI Library (`libs/shared/ui`)

**Component Categories**:

1. **Layout Components**
   - `Layout` - Main app layout with sidebar and content area
   - `Navbar` - Top navigation bar
   - `Sidebar` - Side navigation menu
   - `SidePanel` - Slide-out side drawer
   - `Loading` - Loading spinner
   - `SplashScreen` - App initialization screen

2. **Category Components**
   - `CategoryCard` - Individual category card with image
   - `CategorySection` - Scrollable category section with multiple cards
   - `CategoryBreadcrumb` - Navigation breadcrumb trail

3. **Product Components**
   - `ProductList` - Grid/list view of products
   - `ProductCard` - Individual product card
   - `ProductInfo` - Product details and pricing
   - `ProductImages` - Image gallery with thumbnails
   - `ProductSpecifications` - Specs table
   - `ProductFilterMenu` - Filter sidebar
   - `ProductSortMenu` - Sort dropdown
   - `ProductActionButtons` - Add to cart, buy now buttons
   - `RelatedProducts` - Recommendations carousel

4. **Transaction Components**
   - `TransactionLines` - Cart line items
   - `TransactionNumpad` - Numeric input pad
   - `TransactionQuantityPanel` - Quantity selector
   - `TransactionActions` - Payment and action buttons
   - `TransactionVerticalNav` - Quick navigation

5. **Home Components**
   - `StartSection` - Quick start actions
   - `ProductSection` - Featured products
   - `InventorySection` - Inventory status
   - `ShiftDrawerSection` - Cash drawer operations
   - `AccountSettingsSection` - User settings
   - `ImageSlider` - Image carousel

6. **Receipt Components**
   - `Invoice` - Receipt template for printing

**Theme System**:

CSS variables for consistent theming across platforms:

```css
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8f9fa;
  --color-text-primary: #212529;
  --color-text-secondary: #6c757d;
  --color-text-light: #ffffff;
  --color-accent: #0d6efd;
  --color-accent-hover: #0b5ed7;
  --color-border: #dee2e6;
  --color-success: #198754;
  --color-warning: #ffc107;
  --color-danger: #dc3545;
}
```

**Usage Example**:

```tsx
import { CategorySection, ProductList, Layout } from '@monorepo/shared-ui';
import '@monorepo/shared-ui/styles/globals.css';

function MyApp() {
  return (
    <Layout>
      <CategorySection 
        title="Electronics"
        categories={categories}
      />
      <ProductList products={products} />
    </Layout>
  );
}
```

### Scanner Hook (`libs/shared/hooks/scanner`)

**Barcode Scanner Integration**

Provides cross-platform barcode scanning:

**Hook API**:

```typescript
import { useBarcodeScanner } from '@monorepo/shared-hooks-scanner';

function CheckoutPage() {
  const { 
    isScanning, 
    lastScan, 
    startScan, 
    stopScan 
  } = useBarcodeScanner({
    onScan: (barcode) => {
      console.log('Scanned:', barcode);
      // Add product to cart
    },
    autoStart: true
  });

  return (
    <div>
      {isScanning && <span>Scanning...</span>}
      {lastScan && <span>Last: {lastScan}</span>}
    </div>
  );
}
```

**Component API**:

```tsx
import { BarcodeScanner } from '@monorepo/shared-hooks-scanner';

function InventoryPage() {
  return (
    <BarcodeScanner 
      onScan={(barcode) => lookupProduct(barcode)}
      showVisual={true}
    />
  );
}
```

**Platform Support**:
- **Web**: Keyboard input, USB scanner events
- **Desktop**: Native USB HID scanner support via Electron
- **Mobile**: Camera-based scanning (future)

### Printer Hook (`libs/shared/hooks/printer`)

**Receipt Printer Integration**

Supports thermal receipt printers across platforms:

**Hook API**:

```typescript
import { usePrinter } from '@monorepo/shared-hooks-printer';

function CheckoutPage() {
  const { 
    print, 
    printers, 
    isReady 
  } = usePrinter();

  const printReceipt = async () => {
    await print({
      template: 'receipt',
      data: {
        items: cartItems,
        total: totalAmount,
        date: new Date()
      }
    });
  };

  return (
    <button onClick={printReceipt} disabled={!isReady}>
      Print Receipt
    </button>
  );
}
```

**Features**:
- Auto-discovery of connected printers
- ESC/POS command generation
- Receipt templates (customizable)
- Silent printing (no print dialog)
- Print preview component

**Component API**:

```tsx
import { PrintPreview } from '@monorepo/shared-hooks-printer';

function ReceiptPreview() {
  return (
    <PrintPreview 
      template="receipt"
      data={receiptData}
      onPrint={handlePrint}
    />
  );
}
```

### Keyboard Shortcuts Hook (`libs/shared/hooks/keyboard-shortcuts`)

**Power-User Keyboard Shortcuts**

Provides configurable keyboard shortcuts for fast workflows:

**Hook API**:

```typescript
import { useKeyboardShortcuts } from '@monorepo/shared-hooks-keyboard-shortcuts';

function POSApp() {
  useKeyboardShortcuts({
    'F1': () => navigateTo('/help'),
    'F2': () => openSettings(),
    'F3': () => searchProducts(),
    'F4': () => openCashDrawer(),
    'Ctrl+N': () => newTransaction(),
    'Ctrl+S': () => saveTransaction(),
    'Ctrl+P': () => printReceipt(),
    'Escape': () => cancelAction()
  });

  return <div>...</div>;
}
```

**Features**:
- Cross-platform key codes
- Modifier support (Ctrl, Alt, Shift)
- Conflict detection
- Help overlay (F1)
- Customizable by user

### Redux Store Library (`libs/shared/store`)

**Centralized State Management with Redux Toolkit**

Provides intelligent caching and state management across all applications:

**Key Features**:
- ✅ **Smart Caching** – 5-minute cache prevents unnecessary API calls
- ✅ **Offline-First** – Seamless online/offline mode handling
- ✅ **Type-Safe** – Full TypeScript support with typed hooks
- ✅ **Platform Agnostic** – Works with web (IndexedDB), desktop (SQLite), and mobile
- ✅ **Memoized Selectors** – Optimized data access with reselect
- ✅ **DevTools Support** – Redux DevTools for debugging
- ✅ **Product State Management** – Full Redux integration for products with search and filtering
- ✅ **Category State Management** – Redux integration for categories with hierarchical support

**Architecture**:

```
┌─────────────────────────────────────────────┐
│       @monorepo/shared-store                │
│    Redux Toolkit + React Redux             │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┬──────────────┐
       ▼                ▼              ▼
   Web App       Desktop App      Mobile App
   (uses cache)  (uses cache)    (uses cache)
```

**Performance Benefits**:

| Scenario | Before Redux | After Redux |
|----------|--------------|-------------|
| Initial Load | ~500ms | ~500ms (same) |
| Navigate Back | ~500ms | **0ms** ⚡ (cached) |
| Multiple Visits | ~500ms each | **0ms** until cache expires ⚡ |
| Product Search | New API call each time | **Instant** ⚡ (uses cached data) |

**Hook API**:

```typescript
import {
  useAppDispatch,
  useAppSelector,
  fetchCategories,
  selectCategories,
  selectCategoriesLoading,
  selectCategoriesError,
  selectCacheAge,
} from '@monorepo/shared-store';

function CategoryPage() {
  const dispatch = useAppDispatch();

  // Get data from Redux store
  const categories = useAppSelector(selectCategories);
  const loading = useAppSelector(selectCategoriesLoading);
  const cacheAge = useAppSelector(selectCacheAge);

  useEffect(() => {
    // Fetch categories (uses cache if valid < 5min)
    dispatch(fetchCategories({
      repository: categoryRepository,
      options: { includeInactive: false }
    }));
  }, []);

  return <div>{/* Render categories */}</div>;
}
```

**Force Refresh (Skip Cache)**:

```typescript
// Bypass cache and fetch fresh data
dispatch(fetchCategories({
  repository: categoryRepository,
  options: { includeInactive: false },
  forceRefresh: true // ← Forces API/DB call
}));
```

**Available Selectors**:

**Category Selectors**:
```typescript
// Basic selectors
selectCategories          // All categories
selectCategoriesLoading   // Loading state
selectCategoriesError     // Error message
selectIsOffline          // Offline mode indicator
selectCacheAge           // Cache age in seconds

// Memoized selectors (optimized)
selectActiveCategories    // Only active categories
selectRootCategories      // Categories without parent
selectCategoryById(id)    // Specific category by ID
selectCategoriesWithProducts // Categories with products
selectIsCacheFresh        // Is cache still valid?
```

**Product Selectors**:
```typescript
// Basic selectors
selectProducts            // All products
selectProductsLoading     // Loading state
selectProductsError       // Error message
selectProductsIsOffline   // Offline mode indicator
selectProductCacheAge     // Cache age in seconds

// Memoized selectors (optimized)
selectProductById(id)     // Specific product by ID
selectProductsByCategoryId(id) // Products in category
selectProductCount        // Total product count
selectProductIsCacheFresh // Is cache still valid?
```

**Cache Control**:

```typescript
import { clearCache, setCacheTimeout } from '@monorepo/shared-store';

// Clear categories cache
dispatch(clearCache());

// Set cache timeout to 10 minutes
dispatch(setCacheTimeout(10 * 60 * 1000));
```

**Integration**:

```tsx
// apps/web/src/main.tsx or apps/desktop/src/renderer/main.tsx
import { StoreProvider } from '@monorepo/shared-store';

root.render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);
```

**Product State Management Example**:

```typescript
import {
  useAppDispatch,
  useAppSelector,
  fetchProducts,
  selectProducts,
  selectProductsLoading,
  selectProductsError,
  selectProductCacheAge,
} from '@monorepo/shared-store';

function ProductsPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const loading = useAppSelector(selectProductsLoading);
  const cacheAge = useAppSelector(selectProductCacheAge);

  useEffect(() => {
    // Fetch products (uses cache if valid < 5min)
    dispatch(fetchProducts({
      repository: productRepository,
    }));
  }, [dispatch, cacheAge]);

  return <div>{/* Render products */}</div>;
}
```

**Product Search Integration**:

The product search functionality integrates seamlessly with Redux:
- Real-time search as you type in the navbar
- URL-based search parameters (`/products?search=<query>`)
- Instant filtering using cached product data
- Works with existing filters (rating, price, sorting)

**Extending for Other Entities**:

To add Redux state for inventory, transactions, or other entities:

1. Create new slice: `libs/shared/store/src/lib/slices/inventorySlice.ts`
2. Add reducer to store: `libs/shared/store/src/lib/store.tsx`
3. Create selectors: `libs/shared/store/src/lib/selectors/inventorySelectors.ts`
4. Export from index: `libs/shared/store/src/index.ts`

Follow the same pattern as `categorySlice.ts` and `productSlice.ts` for consistency.

### Data Access Library (`libs/shared/data-access`)

**Shared Data Layer**

Provides unified data access patterns:

**Features**:
- Repository pattern implementations
- Backend API integration clients
- Synchronization orchestration
- Shared TypeScript types
- Connection state management

**Example Usage**:

```typescript
import { ProductRepository } from '@monorepo/shared-data-access';

const productRepo = new ProductRepository();

// Automatic online/offline routing
const products = await productRepo.getAll();

// Force offline mode
const offlineProducts = await productRepo.getAll({ forceOffline: true });
```

### Assets Library (`libs/shared/assets`)

**Shared Images and Media**

Centralized asset management:

**Contents**:
- 30+ category images (JPG, optimized)
- Collection banners
- Brand logos (PNG)
- Placeholder images
- App icons

**Usage**:

```typescript
import { CATEGORY_IMAGES } from '@monorepo/shared-assets';

const imagePath = CATEGORY_IMAGES.electronics;
// Result: '/assets/images/categories/electronics.jpg'
```

---

## 🚀 Setup & Installation

### Prerequisites

Ensure you have the following installed:

- **Node.js** >= 18.0.0 (LTS recommended)
- **npm** >= 9.0.0
- **Git**
- **Java JDK** (for Android builds) - OpenJDK 17
- **Android Studio** (for Android development)
- **Xcode** (for iOS builds, macOS only) - Xcode 14+
- **Visual Studio Build Tools** (Windows, for native modules)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd monorepo/monorepo
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all dependencies for the workspace, including apps and libraries.

> **Note**: First install may take 5-10 minutes depending on your connection.

### Step 3: Verify Installation

```bash
# Check Nx installation
npx nx --version

# View workspace graph
npx nx graph
```

### Step 4: Environment Configuration

Create environment files for each app:

**Web App** (`apps/web/.env.local`):

```env
VITE_SERVER_URL=http://localhost:4000
VITE_APP_NAME=PayFlow
VITE_OFFLINE_MODE=true
```

**Desktop App** (`apps/desktop/.env`):

```env
DB_PATH=./libsdb/pos.db
SERVER_URL=http://localhost:4000
AUTO_UPDATE=false
```

**Mobile App** (`apps/mobile/.env`):

```env
API_BASE_URL=http://localhost:4000
```

### Step 5: Start Development

```bash
# Start web app
npm run start:web

# Start desktop app
npm run start:desktop

# Start mobile app
npm run start:mobile
```

---

## ⚙️ Configuration

### Nx Configuration (`nx.json`)

Configure workspace-level settings:

```json
{
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"]
    }
  },
  "defaultBase": "main"
}
```

### TypeScript Configuration

Root `tsconfig.base.json` defines path mappings:

```json
{
  "compilerOptions": {
    "paths": {
      "@monorepo/shared-ui": ["libs/shared/ui/src/index.ts"],
      "@monorepo/shared-hooks-scanner": ["libs/shared/hooks/scanner/src/index.ts"],
      "@monorepo/shared-hooks-printer": ["libs/shared/hooks/printer/src/index.ts"],
      "@monorepo/shared-hooks-keyboard-shortcuts": ["libs/shared/hooks/keyboard-shortcuts/src/index.ts"],
      "@monorepo/shared-data-access": ["libs/shared/data-access/src/index.ts"],
      "@monorepo/shared-assets": ["libs/shared/assets/index.ts"]
    }
  }
}
```

### Tailwind Configuration

Shared `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './apps/*/src/**/*.{js,ts,jsx,tsx}',
    './libs/*/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-accent)',
        secondary: 'var(--color-bg-secondary)',
      },
    },
  },
};
```

---

## 🏃 Running the Apps

### Web Application

```bash
# Development server with hot reload
npm run start:web

# Runs on http://localhost:4200 by default
# Vite HMR enabled
# Service worker in dev mode
```

**Output**:
```
> nx serve web

  VITE v7.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:4200/
  ➜  Network: http://192.168.1.100:4200/
```

### Desktop Application

```bash
# Development mode with hot reload
npm run start:desktop

# Launches Electron window with dev tools
# Main process and renderer auto-reload on changes
```

**Output**:
```
> nx run desktop:dev

[electron-vite] starting...
[electron-vite] ✓ built in 2345ms
[electron-vite] watching for file changes...
```

### Mobile Application

```bash
# Start Metro bundler
npm run start:mobile

# In another terminal, run Android
npm run mobile:android

# Or run iOS (macOS only)
npm run mobile:ios
```

**For Physical Devices**:

```bash
# Android
adb devices                          # Verify device connection
npm run mobile:android -- --device

# iOS
xcrun simctl list                    # List simulators
npm run mobile:ios -- --simulator="iPhone 15"
```

---

## 🏗️ Building & Packaging

### Web Production Build

```bash
# Build for production
npm run build:web

# Output: dist/apps/web/
# - index.html
# - assets/*.js (hashed)
# - assets/*.css (hashed)
# - manifest.json (PWA)
# - service-worker.js
```

**Build Features**:
- Code splitting
- Tree shaking
- Minification
- Source maps (optional)
- PWA assets

**Verify Build**:

```bash
cd dist/apps/web
npx serve -s .
# Open http://localhost:3000
```

### Desktop Distribution

**Build Electron App**:

```bash
npm run build:desktop
# Compiles TypeScript, bundles with electron-vite
```

**Create Installers**:

```bash
# Windows NSIS installer (recommended)
npm run make:desktop

# Windows MSI installer
npm run make:desktop:msi

# Portable executable (no installer)
npm run make:desktop:portable
```

**Output** (`apps/desktop/release/`):
- `PayFlow Setup 0.0.1.exe` - NSIS installer (~60MB)
- `PayFlow-0.0.1.msi` - MSI installer (~60MB)
- `PayFlow-0.0.1-portable.exe` - Portable exe (~150MB)

**macOS Build** (requires macOS):

```bash
npm run make:desktop:mac
# Output: PayFlow-0.0.1.dmg
```

**Linux Build**:

```bash
npm run make:desktop:linux
# Output: PayFlow-0.0.1.AppImage
```

### Mobile Bundles

**Android**:

```bash
# Debug APK
npm run mobile:android

# Release APK (unsigned)
npm run build:android-mobile

# Output: apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

**iOS** (macOS only):

```bash
# Debug build
npm run mobile:ios

# Release archive
npm run build:ios-mobile

# Output: apps/mobile/ios/build/
```

**Signing & Publishing**:

- **Android**: Configure `android/app/build.gradle` with signing keys
- **iOS**: Configure in Xcode with provisioning profiles
- **Stores**: Follow Play Store / App Store submission guidelines

---

## 🔄 Development Workflow

### Nx Commands

**Affected Commands** (only build/test what changed):

```bash
# Test only affected projects
npx nx affected:test

# Build only affected projects
npx nx affected:build

# Lint affected projects
npx nx affected:lint
```

**Run Specific Targets**:

```bash
# Run target for specific project
npx nx run web:build
npx nx run desktop:dev
npx nx run mobile:start

# Run target for all projects
npx nx run-many --target=build --all
npx nx run-many --target=test --all
```

**Dependency Graph**:

```bash
# Open interactive graph
npx nx graph

# Watch mode (updates on changes)
npx nx graph --watch

# Show affected graph
npx nx affected:graph
```

### Shared Library Development

**Create New Library**:

```bash
# Generate new library
npx nx generate @nx/react:library my-new-lib --directory=libs/shared

# Or generate hook library
npx nx generate @nx/react:library my-hook --directory=libs/shared/hooks
```

**Import in Apps**:

```typescript
// After creating lib, import via path mapping
import { MyComponent } from '@monorepo/shared-my-new-lib';
```

### Asset Management

**Update Icons**:

```bash
# Sync icons across all platforms
npm run update-icons

# Script updates:
# - apps/web/public/icons/
# - apps/desktop/public/icons/
# - apps/mobile/android/app/src/main/res/
# - apps/mobile/ios/Mobile/Images.xcassets/
```

**Add New Assets**:

1. Place in `libs/shared/assets/images/`
2. Update `libs/shared/assets/index.ts`
3. Reference via `@monorepo/shared-assets`

### Code Formatting

```bash
# Format all files
npx nx format:write

# Check formatting
npx nx format:check

# Format specific files
npx nx format:write --files=apps/web/src/**/*.tsx
```

---

## ✅ Testing & Quality

### Unit Testing

```bash
# Run all tests
npx nx run-many --target=test --all

# Test specific project
npx nx test web
npx nx test shared-ui

# Watch mode
npx nx test web --watch

# Coverage
npx nx test web --coverage
```

**Test Structure**:

```typescript
// apps/web/src/pages/Home.spec.tsx
import { render, screen } from '@testing-library/react';
import { Home } from './Home';

describe('Home Page', () => {
  it('should render welcome message', () => {
    render(<Home />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });
});
```

### Linting

```bash
# Lint all projects
npx nx run-many --target=lint --all

# Lint specific project
npx nx lint web

# Auto-fix issues
npx nx lint web --fix
```

### Type Checking

```bash
# Type check all TypeScript files
npx tsc --noEmit

# Type check specific project
npx tsc --project apps/web/tsconfig.json --noEmit
```

### End-to-End Testing

*(Planned - Cypress/Playwright integration)*

```bash
# E2E tests (future)
npx nx e2e web-e2e
```

---

## 🔧 Hardware Integration

### Barcode Scanners

**Supported Scanners**:
- USB HID scanners (keyboard wedge)
- USB Serial scanners (COM port)
- Bluetooth scanners
- Camera-based scanners (mobile)

**Configuration** (Desktop):

```typescript
// apps/desktop/src/main/services/scanner.service.ts
{
  mode: 'usb-hid',  // or 'usb-serial', 'bluetooth'
  vendorId: 0x05e0, // Scanner vendor ID
  productId: 0x1200 // Scanner product ID
}
```

**Usage**:

```typescript
import { useBarcodeScanner } from '@monorepo/shared-hooks-scanner';

const { startScan, lastScan } = useBarcodeScanner({
  onScan: (code) => {
    // Handle scanned barcode
    addProductByBarcode(code);
  }
});
```

### Receipt Printers

**Supported Printers**:
- Thermal receipt printers (ESC/POS)
- Star Micronics
- Epson TM series
- Generic ESC/POS printers

**Configuration** (Desktop):

```typescript
// apps/desktop/src/main/services/printer.service.ts
{
  type: 'thermal',
  interface: 'usb',  // or 'serial', 'network'
  width: 80,         // 58mm or 80mm
  encoding: 'cp437'
}
```

**Usage**:

```typescript
import { usePrinter } from '@monorepo/shared-hooks-printer';

const { print } = usePrinter();

await print({
  template: 'receipt',
  data: {
    storeName: 'PayFlow Store',
    items: cartItems,
    subtotal: 150.00,
    tax: 15.00,
    total: 165.00
  }
});
```

### Cash Drawers

**Integration**: Cash drawers connect via printer's RJ-12 port.

**Usage**:

```typescript
import { usePrinter } from '@monorepo/shared-hooks-printer';

const { openCashDrawer } = usePrinter();

// Open drawer
await openCashDrawer();
```

### Customer Displays

**Pole Displays**: USB/Serial customer-facing displays.

```typescript
import { useCustomerDisplay } from '@monorepo/shared-hooks-display';

const { showTotal, showItem } = useCustomerDisplay();

showItem('Product Name', 19.99);
showTotal(165.00);
```

---

## 🌐 Offline Support

### Web Offline Strategy

**Service Worker** (`apps/web/vite.config.ts`):

```typescript
PWA({
  strategies: 'injectManifest',
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\./,
        handler: 'NetworkFirst',  // Try network, fallback to cache
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24  // 1 day
          }
        }
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
        handler: 'CacheFirst',  // Serve from cache first
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30  // 30 days
          }
        }
      }
    ]
  }
})
```

**IndexedDB Structure**:

```
Database: payflow_db
├── categories (keyPath: id)
├── products (keyPath: id, indexes: sku, categoryId)
├── transactions (keyPath: id, indexes: date, status)
├── sync_queue (keyPath: id, indexes: operation, timestamp)
└── metadata (keyPath: key)
```

**Sync Queue**:

When offline, operations are queued:

```typescript
// Add to sync queue
await syncQueue.add({
  operation: 'create_transaction',
  data: transactionData,
  timestamp: Date.now()
});

// When online, process queue
await syncQueue.processAll();
```

### Desktop Offline Strategy

**SQLite Database** (`apps/desktop/libsdb/schema.sql`):

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  image TEXT,
  sort_order INTEGER,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  price REAL NOT NULL,
  cost REAL,
  stock_quantity INTEGER DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  subtotal REAL NOT NULL,
  tax REAL NOT NULL,
  total REAL NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'completed',
  synced INTEGER DEFAULT 0
);

CREATE TABLE transaction_lines (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Sync Status Tracking**:

```typescript
// Mark as synced
await db.run(
  'UPDATE transactions SET synced = 1 WHERE id = ?',
  [transactionId]
);

// Get unsynced transactions
const unsynced = await db.all(
  'SELECT * FROM transactions WHERE synced = 0'
);
```

### Mobile Offline Strategy

**AsyncStorage** (simple key-value):

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store data
await AsyncStorage.setItem('cart', JSON.stringify(cartItems));

// Retrieve data
const cart = JSON.parse(await AsyncStorage.getItem('cart'));
```

**SQLite** (complex data):

```typescript
import SQLite from 'react-native-sqlite-storage';

const db = await SQLite.openDatabase({ name: 'payflow.db' });

await db.executeSql(
  'INSERT INTO products (id, name, price) VALUES (?, ?, ?)',
  [id, name, price]
);
```

### Sync Strategies

**Pull Sync** (from server):

```typescript
async function pullSync() {
  const lastSync = await getLastSyncTimestamp();
  
  // Fetch changes since last sync
  const changes = await api.get(`/sync/changes?since=${lastSync}`);
  
  // Apply to local database
  await applyChanges(changes);
  
  // Update last sync timestamp
  await setLastSyncTimestamp(Date.now());
}
```

**Push Sync** (to server):

```typescript
async function pushSync() {
  // Get local changes
  const localChanges = await getUnsyncedChanges();
  
  // Send to server
  const result = await api.post('/sync/push', localChanges);
  
  // Mark as synced
  await markAsSynced(localChanges);
}
```

**Conflict Resolution**:

```typescript
function resolveConflict(local, remote) {
  // Last-write-wins strategy
  if (local.updatedAt > remote.updatedAt) {
    return local;
  } else {
    return remote;
  }
}
```

---

## 🚢 Deployment

### Web Deployment

**Static Hosting** (Netlify, Vercel, S3):

```bash
# Build
npm run build:web

# Deploy (example: Netlify)
cd dist/apps/web
netlify deploy --prod

# Or with Netlify CLI
netlify deploy --prod --dir=dist/apps/web
```

**Docker Deployment**:

```dockerfile
# Dockerfile for web app
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:web

FROM nginx:alpine
COPY --from=builder /app/dist/apps/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Configuration**:

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # Serve index.html for all routes (SPA)
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### Desktop Deployment

**Distribution**:

1. **Direct Download**:
   - Upload installers to website
   - Provide download links

2. **Auto-Update**:
   - Configure electron-builder with update server
   - Use `electron-updater` for auto-updates

**Update Server Configuration**:

```json
// apps/desktop/package.json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://updates.example.com/releases/"
    }
  }
}
```

**Code Signing** (Windows):

```bash
# Set environment variables
$env:CSC_LINK="path/to/certificate.pfx"
$env:CSC_KEY_PASSWORD="your-password"

# Build with signing
npm run make:desktop
```

### Mobile Deployment

**Android Play Store**:

1. Create signed APK/AAB:
   ```bash
   cd apps/mobile/android
   ./gradlew bundleRelease
   ```

2. Upload to Play Console:
   - `app/build/outputs/bundle/release/app-release.aab`

3. Complete store listing with screenshots and description

**iOS App Store**:

1. Archive in Xcode:
   - Product → Archive
   
2. Upload to App Store Connect:
   - Window → Organizer → Upload

3. Complete app listing and submit for review

### Environment Configuration

**Production Environment Variables**:

```env
# Web
VITE_SERVER_URL=https://api.payflow.com
VITE_SENTRY_DSN=https://...
VITE_ANALYTICS_ID=UA-...

# Desktop
SERVER_URL=https://api.payflow.com
AUTO_UPDATE=true
UPDATE_SERVER=https://updates.payflow.com

# Mobile
API_BASE_URL=https://api.payflow.com
CODEPUSH_KEY=...
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Nx Cache Issues

**Symptom**: Stale builds or test results

**Solution**:
```bash
# Clear Nx cache
npx nx reset

# Force rebuild without cache
npx nx build web --skip-nx-cache
```

#### 2. TypeScript Path Mapping Errors

**Symptom**: `Cannot find module '@monorepo/shared-ui'`

**Solution**:
```bash
# Regenerate TypeScript references
npx nx sync

# Check tsconfig.base.json paths
# Ensure imports match path mappings
```

#### 3. Electron Build Failures

**Symptom**: `node-gyp` errors on Windows

**Solution**:
```bash
# Install Windows Build Tools
npm install --global windows-build-tools

# Or use Visual Studio Build Tools
# Download from Microsoft
```

#### 4. IndexedDB Quota Errors (Web)

**Symptom**: `QuotaExceededError`

**Solution**:
```typescript
// Check available quota
const estimate = await navigator.storage.estimate();
console.log('Used:', estimate.usage);
console.log('Quota:', estimate.quota);

// Clear old data
await clearOldTransactions();
```

#### 5. Service Worker Not Updating

**Symptom**: Old app version persists

**Solution**:
```bash
# Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (macOS)

# Or unregister service worker manually
# DevTools → Application → Service Workers → Unregister
```

#### 6. Mobile Build Errors

**Android - Gradle Issues**:
```bash
cd apps/mobile/android
./gradlew clean
./gradlew build --refresh-dependencies
```

**iOS - CocoaPods Issues**:
```bash
cd apps/mobile/ios
rm -rf Pods Podfile.lock
pod install
```

### Debug Mode

**Enable Debug Logging**:

```typescript
// Web/Desktop
localStorage.setItem('DEBUG', '*');

// Check console for detailed logs
// [Repository] Fetching products...
// [Sync] Starting sync...
```

**Electron DevTools**:

```typescript
// apps/desktop/src/main/main.ts
mainWindow.webContents.openDevTools();
```

### Performance Profiling

**React DevTools Profiler**:

1. Install React DevTools extension
2. Open Profiler tab
3. Click Record
4. Perform actions
5. Stop recording and analyze

**Lighthouse (Web)**:

```bash
# Chrome DevTools → Lighthouse
# Run audit for Performance, Accessibility, Best Practices, SEO
```

---

## 🤝 Contributing

### Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-username/payflow-monorepo.git
   cd payflow-monorepo/monorepo
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

4. **Run Quality Checks**
   ```bash
   # Format code
   npx nx format:write
   
   # Lint
   npx nx affected:lint
   
   # Test
   npx nx affected:test
   
   # Type check
   npx tsc --noEmit
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting)
   - `refactor:` - Code refactoring
   - `test:` - Adding/updating tests
   - `chore:` - Build process or auxiliary tool changes

6. **Push and Create PR**
   ```bash
   git push origin feature/amazing-feature
   ```
   
   Then create Pull Request on GitHub.

### Contribution Guidelines

**Code Style**:
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Prefer functional components with hooks
- Keep components small and focused

**Testing**:
- Write unit tests for business logic
- Add integration tests for critical flows
- Aim for >80% code coverage on new features
- Test offline scenarios

**Documentation**:
- Update README for new features
- Add inline comments for complex logic
- Create examples for new components/hooks
- Update API documentation

**Shared Libraries**:
- Keep shared code platform-agnostic
- Export via index.ts barrel files
- Version shared libraries semantically
- Document breaking changes

**Pull Request Process**:
1. Ensure all CI checks pass
2. Get at least one approval from maintainer
3. Squash commits before merging
4. Delete branch after merge

---

## 📊 Project Status

![Status](https://img.shields.io/badge/Status-In%20Active%20Development-orange.svg)
![Version](https://img.shields.io/badge/Version-0.2.0-blue.svg)
![Platforms](https://img.shields.io/badge/Platforms-Web%20%7C%20Desktop%20%7C%20Mobile-1E90FF.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6.svg)

### 🎉 Recent Milestones

**Q4 2024**:
- ✅ Nx monorepo architecture established
- ✅ Web PWA with offline support (IndexedDB)
- ✅ Desktop Electron app with SQLite database
- ✅ React Native mobile app scaffolded
- ✅ Shared UI component library (40+ components)
- ✅ Hardware hooks (scanner, printer, keyboard)
- ✅ Category browser with hierarchical navigation
- ✅ Product catalog with search and filtering
- ✅ Transaction/checkout flow
- ✅ Receipt printing templates
- ✅ Windows installers (NSIS, MSI, portable)

**Q1 2025**:
- ✅ Repository pattern for data access
- ✅ Connection state management (online/offline)
- ✅ Automatic background sync
- ✅ Service worker caching strategies
- ✅ Shared assets library
- ✅ Icon synchronization script
- ✅ Consolidated documentation
- ✅ Redux store integration for products with caching
- ✅ Real-time product search with URL-based filtering
- ✅ Product state management (web & desktop)
- ✅ Centered loading animations across all pages

### 🛣️ Roadmap

**Q2 2025**:
- [ ] End-to-end testing with Playwright
- [ ] Storybook for component library
- [ ] Mobile barcode scanning (camera)
- [ ] Customer display integration
- [ ] Multi-language support (i18n)
- [ ] Dark mode theme

**Q3 2025**:
- [ ] GraphQL API integration
- [ ] Real-time sync with WebSockets
- [ ] Advanced inventory management
- [ ] Employee management
- [ ] Reporting and analytics
- [ ] Cloud backup

**Q4 2025**:
- [ ] Multi-store support
- [ ] Franchise management
- [ ] Loyalty program integration
- [ ] Kitchen display system
- [ ] Delivery integration
- [ ] Self-checkout kiosk mode

### 📈 Metrics

- **Total Lines of Code**: ~50,000+
- **Components**: 40+ shared UI components
- **Hooks**: 10+ custom React hooks
- **Apps**: 3 (Web, Desktop, Mobile)
- **Libraries**: 5 shared libraries
- **Supported Platforms**: Windows, macOS, Linux, iOS, Android, Web

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 PayFlow

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 Support & Resources

### Documentation

- **Workspace**: This README
- **Nx Docs**: https://nx.dev
- **React Docs**: https://react.dev
- **React Native Docs**: https://reactnative.dev
- **Electron Docs**: https://www.electronjs.org/docs/latest

### Community

- **Issues**: Report bugs and request features on GitHub Issues
- **Discussions**: Ask questions on GitHub Discussions
- **Discord**: Join our community Discord server (link TBD)

### Useful Commands Quick Reference

```bash
# Development
npm run start:web              # Start web app
npm run start:desktop          # Start desktop app
npm run start:mobile           # Start mobile Metro bundler

# Building
npm run build:web              # Build web for production
npm run build:desktop          # Build desktop app
npm run make:desktop           # Create Windows installer

# Testing
npx nx affected:test           # Test affected projects
npx nx test web                # Test specific project

# Utilities
npx nx graph                   # View dependency graph
npm run update-icons           # Sync icons across platforms
npx nx format:write            # Format all code

# Quality
npx nx affected:lint           # Lint affected projects
npx tsc --noEmit              # Type check
```

---

<div align="center">

**Built with ❤️ to deliver seamless retail experiences across all platforms.**

[Documentation](#-table-of-contents) • [Contributing](#-contributing) • [License](#-license)

</div>
