# Web App Implementation Guide

This guide explains how the web app implements the same localdb, syncing, and operations as the desktop app using shared libraries.

## Architecture Overview

The web app uses an **offline-first architecture** with automatic syncing, identical to the desktop app:

```
Web App
├── IndexedDB (Local Storage)
├── HTTP API Client (Server Communication)
├── Data Source Manager (Auto-switching)
├── Sync Service (Bidirectional Sync)
└── Repository Pattern (Data Access)
```

## Key Components

### 1. IndexedDB Schema (`src/config/indexeddb-schema.ts`)

Defines the complete database structure with 40+ object stores (tables):

- **Customer Management**: Customer, CustomerGroup, CustomerAddress
- **Products**: Product, ProductVariant, InventoryItem, Barcode
- **Orders**: SaleOrder, OrderLineItem, OrderPayment
- **Users**: User, Role, UserLocation
- **Inventory**: StockAdjustment, StockTransfer
- **Financial**: Expense, BankAccount, CashMovement
- And more...

```typescript
import { cposSchema } from './config/indexeddb-schema';

// Schema is automatically applied during initialization
```

### 2. Data Access Service (`src/services/data-access.service.ts`)

Central service managing connectivity and data access:

```typescript
import { dataAccessService } from './services/data-access.service';

// Initialize (done automatically in main.tsx)
await dataAccessService.initialize();

// Get connection state
const state = dataAccessService.getConnectionState();

// Set auth token after login
dataAccessService.setAuthToken(token);

// Initialize sync after online login
await dataAccessService.initializeSyncService(userId);

// Manual override (force server or local)
await dataAccessService.setManualDataSource(DataSource.SERVER);
```

### 3. Repository Services (`src/services/repositories/`)

Repository pattern for data access with automatic online/offline handling:

#### **UserRepository**

```typescript
import { WebUserRepository } from './services/repositories/user-repository';

const userRepo = new WebUserRepository();

// Login (tries server first, falls back to offline)
const result = await userRepo.login('username', 'password');
if (result.success) {
  console.log('User:', result.user);
  console.log('Token:', result.token);
  console.log('Offline:', result.isOffline);
}

// Get user
const user = await userRepo.getUserById(userId);
```

#### **ProductRepository**

```typescript
import { ProductRepository } from './services/repositories/product-repository';

const productRepo = new ProductRepository();

// Get all products (from server or local)
const products = await productRepo.getAllProducts();

// Get product with variants
const product = await productRepo.getProductById(productId);
console.log('Variants:', product.variants);
console.log('Inventory:', product.inventory);

// Search products
const results = await productRepo.searchProducts('laptop');

// Get products by category
const categoryProducts = await productRepo.getProductsByCategory(categoryId);
```

#### **CategoryRepository**

```typescript
import { CategoryRepository } from './services/repositories/category-repository';

const categoryRepo = new CategoryRepository();

// Get all categories
const categories = await categoryRepo.getAllCategories();

// Get root categories
const rootCategories = await categoryRepo.getRootCategories();

// Get subcategories
const subcategories = await categoryRepo.getSubcategories(parentId);

// Get by slug
const category = await categoryRepo.getCategoryBySlug('electronics');
```

#### **OrderRepository**

```typescript
import { OrderRepository, CreateOrderRequest } from './services/repositories/order-repository';

const orderRepo = new OrderRepository();

// Create order
const orderData: CreateOrderRequest = {
  userId: currentUser.id,
  locationId: currentLocation.id,
  shiftId: currentShift.id,
  lineItems: [
    {
      productVariantId: 'variant-1',
      productName: 'Laptop',
      sku: 'LAPTOP-001',
      quantity: 2,
      unitPrice: 999.99,
      taxAmount: 200.00,
    },
  ],
  payments: [
    {
      paymentMethodId: 'cash',
      amount: 2199.98,
    },
  ],
};

const order = await orderRepo.createOrder(orderData);
console.log('Order created:', order.orderNumber);

// Get order
const order = await orderRepo.getOrderById(orderId);

// Get recent orders
const recentOrders = await orderRepo.getRecentOrders(50);
```

### 4. Authentication Provider (`src/providers/WebAuthProvider.tsx`)

React context for authentication with online/offline support:

```typescript
import { useWebAuth } from './providers/WebAuthProvider';

function MyComponent() {
  const { isAuthenticated, user, isOffline, login, logout } = useWebAuth();

  const handleLogin = async () => {
    const success = await login('username', 'password', true);
    if (success) {
      console.log('Logged in!');
      console.log('User:', user);
      console.log('Offline mode:', isOffline);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.firstName}!</p>
          <p>Mode: {isOffline ? 'Offline' : 'Online'}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

## How It Works

### Online Mode

1. User opens app
2. Data access service checks server connectivity
3. Server is online → Uses HTTP API
4. All data fetched from server API
5. Data is cached in IndexedDB for offline access
6. Sync service runs every 1 hour

```
User Action → Repository → DataSourceManager (ONLINE)
  → HTTP API → Server → Response
  → Save to IndexedDB (cache)
  → Return to User
```

### Offline Mode

1. Server becomes unavailable
2. Data source manager detects offline status
3. Automatically switches to IndexedDB
4. All operations use local data
5. Changes marked as 'pending' for sync
6. When online, sync service uploads pending changes

```
User Action → Repository → DataSourceManager (OFFLINE)
  → IndexedDB → Local Data
  → Mark as 'pending' sync
  → Return to User
```

### Sync Process

1. **User Login (Online)**: Sync service initializes
2. **Immediate Sync**: User table synced for offline login
3. **Periodic Sync**: Every 1 hour, syncs all tables
4. **Bidirectional**:
   - **Upload**: Pending local changes → Server
   - **Download**: Server changes → Local DB
5. **Conflict Resolution**: Server timestamp wins

```typescript
// Manually trigger sync
const syncService = dataAccessService.getSyncService();
if (syncService) {
  // Sync all tables
  const summary = await syncService.syncAll();
  console.log('Synced:', summary);

  // Sync specific table
  await syncService.syncTable('Product', 'download');
}
```

## Example: Products Page Implementation

Here's how to update the Products page to use real data:

```typescript
// src/pages/Products.tsx
import { useEffect, useState } from 'react';
import { ProductRepository, type Product } from '../services/repositories/product-repository';

const productRepo = new ProductRepository();

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productRepo.getAllProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading products...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={loadProducts}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Products ({products.length})</h1>
      <div className="grid grid-cols-3 gap-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

## Example: Category Page Implementation

```typescript
// src/pages/Category.tsx
import { useEffect, useState } from 'react';
import { CategoryRepository, type Category } from '../services/repositories/category-repository';

const categoryRepo = new CategoryRepository();

export function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    categoryRepo.getRootCategories().then(setCategories);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      {categories.map(category => (
        <CategoryCard
          key={category.id}
          category={category}
          onClick={() => navigate(`/category/${category.slug}`)}
        />
      ))}
    </div>
  );
}
```

## Example: Transactions Page with Order Creation

```typescript
// src/pages/Transactions.tsx
import { useCart } from '@monorepo/shared-ui';
import { OrderRepository } from '../services/repositories/order-repository';
import { useWebAuth } from '../providers/WebAuthProvider';

const orderRepo = new OrderRepository();

export function Transactions() {
  const { items, clearCart } = useCart();
  const { user } = useWebAuth();
  const [processing, setProcessing] = useState(false);

  const handleCompleteSale = async () => {
    if (!user) return;

    setProcessing(true);
    try {
      const order = await orderRepo.createOrder({
        userId: user.id,
        locationId: 'location-1', // Get from settings
        lineItems: items.map(item => ({
          productVariantId: item.variantId,
          productName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.price,
          taxAmount: item.price * 0.1, // 10% tax
        })),
        payments: [
          {
            paymentMethodId: 'cash',
            amount: calculateTotal(items),
          },
        ],
      });

      console.log('Order created:', order.orderNumber);
      clearCart();
      alert(`Order ${order.orderNumber} completed successfully!`);
    } catch (error: any) {
      alert(`Order failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {/* Cart display */}
      <CartItems items={items} />

      {/* Payment buttons */}
      <button onClick={handleCompleteSale} disabled={processing}>
        {processing ? 'Processing...' : 'Complete Sale'}
      </button>
    </div>
  );
}
```

## Testing

### 1. Test Online Login

```bash
# Start the server
npm run dev

# Login with valid credentials
# Should see: "Online login successful"
# Sync should start automatically
```

### 2. Test Offline Login

```bash
# Stop the server
# Try to login with previously cached credentials
# Should see: "Offline login successful"
```

### 3. Test Data Access

```bash
# Open browser console
# Check IndexedDB (Application > IndexedDB > cpos_web_db)
# Should see all object stores created
```

### 4. Test Sync

```javascript
// In browser console
const syncService = window.dataAccessService?.getSyncService();
if (syncService) {
  // Manual sync
  syncService.syncAll().then(console.log);
}
```

## API Endpoints Required

The repositories expect these API endpoints:

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/user/:userId` - Get user with passwordHash

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/search?q=query` - Search products
- `GET /api/products/category/:categoryId` - Get by category

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get by ID
- `GET /api/categories/slug/:slug` - Get by slug
- `GET /api/categories/root` - Get root categories
- `GET /api/categories/:id/children` - Get subcategories

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/shift/:shiftId` - Get orders by shift
- `GET /api/orders/recent?limit=50` - Get recent orders

### Sync
- `POST /api/sync/:table/upload` - Upload changes
- `GET /api/sync/:table/download?lastSyncedAt=timestamp` - Download changes

## Troubleshooting

### IndexedDB not initializing

Check browser console for errors. Make sure `cposSchema` is imported correctly.

### Sync not starting

Verify:
1. User logged in online (not offline)
2. Auth token is set: `dataAccessService.getApiClient().getAuthToken()`
3. Check console for sync errors

### Data not appearing

1. Check connection status: `dataAccessService.getConnectionState()`
2. Verify API endpoints are returning data
3. Check IndexedDB in browser DevTools
4. Try manual sync: `syncService.syncAll()`

### Repository methods failing

1. Ensure data access service is initialized
2. Check if API client has auth token
3. Verify connection status
4. Check browser console for errors

## Migration from Mock Data

For each page:

1. **Create repository instance**:
   ```typescript
   const productRepo = new ProductRepository();
   ```

2. **Add loading state**:
   ```typescript
   const [loading, setLoading] = useState(true);
   ```

3. **Fetch data in useEffect**:
   ```typescript
   useEffect(() => {
     productRepo.getAllProducts().then(setProducts);
   }, []);
   ```

4. **Handle loading/error states**:
   ```typescript
   if (loading) return <LoadingSpinner />;
   ```

5. **Replace mock data with state**:
   ```typescript
   // Before: const products = mockProducts;
   // After: const [products, setProducts] = useState([]);
   ```

## Summary

The web app now has:

✅ **IndexedDB** - Complete schema with 40+ tables
✅ **Repositories** - User, Product, Category, Order services
✅ **Authentication** - Online/offline login with WebAuthProvider
✅ **Sync Service** - Automatic bidirectional sync
✅ **Offline-First** - Automatic switching between server/local
✅ **Connection Management** - Real-time status with manual override

This implementation is identical to the desktop app architecture, using shared libraries for maximum code reuse!
