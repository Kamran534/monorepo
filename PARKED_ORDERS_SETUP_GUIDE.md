# Parked Orders Setup Guide

Complete setup guide for integrating parked orders functionality in both web and desktop applications.

---

## 📋 What's Been Implemented

✅ **Completed:**
1. ParkedOrderRepository (libs/shared/data-access)
2. SalesOrderRepository with payment support (libs/shared/data-access)
3. PaymentMethodRepository (libs/shared/data-access)
4. ParkedOrderSearch UI component (libs/shared/ui)
5. SalesOrderForm with park/load functionality (libs/shared/ui)
6. Shared Sales page with all handlers (libs/shared/ui)
7. Database schema (ParkedOrder table already exists)
8. Complete documentation (PARKED_ORDERS_IMPLEMENTATION.md)
9. Testing guides (MANUAL_TESTING_GUIDE.md)

⏳ **Remaining:**
1. Initialize repositories in app-specific Sales pages
2. Update handleCreateOrder to handle parked order completion
3. (Optional) Create server-side API endpoints
4. Test end-to-end flow

---

## 🚀 Setup Instructions

### Step 1: Desktop App Setup (apps/desktop)

#### 1.1 Update `apps/desktop/src/pages/Sales.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Sales as SharedSales, SalesProps } from '@monorepo/shared-ui';
import {
  SalesOrderRepository,
  ParkedOrderRepository,
  PaymentMethodRepository,
  DesktopSqliteClient,
} from '@monorepo/shared-data-access';
import path from 'path';
import { app } from 'electron';

// Create singleton DB client
let dbClient: DesktopSqliteClient | null = null;

function getDbClient(): DesktopSqliteClient {
  if (!dbClient) {
    // Get app data path
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'cpos.db');

    // Or use the path from your libsdb folder:
    // const dbPath = path.join(__dirname, '../../libsdb/cpos.db');

    dbClient = new DesktopSqliteClient(dbPath);
    dbClient.initialize().catch(err => {
      console.error('[Desktop Sales] Failed to initialize database:', err);
    });
  }
  return dbClient;
}

// Create singleton API client
// TODO: Replace with your actual API client
const apiClient = {
  async get(url: string) {
    const response = await fetch(`http://localhost:3000${url}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { success: true, data };
  },
  async post(url: string, body: any) {
    const response = await fetch(`http://localhost:3000${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { success: true, data };
  },
  async put(url: string, body: any) {
    const response = await fetch(`http://localhost:3000${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { success: true, data };
  },
  async delete(url: string) {
    const response = await fetch(`http://localhost:3000${url}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { success: true, data };
  },
};

export function Sales() {
  const [repositories, setRepositories] = useState<{
    salesOrderRepo?: SalesOrderRepository;
    parkedOrderRepo?: ParkedOrderRepository;
    paymentMethodRepo?: PaymentMethodRepository;
  }>({});

  useEffect(() => {
    // Initialize repositories
    const dbClient = getDbClient();

    const salesOrderRepo = new SalesOrderRepository(dbClient, apiClient);
    const parkedOrderRepo = new ParkedOrderRepository(dbClient, apiClient);
    const paymentMethodRepo = new PaymentMethodRepository(dbClient, apiClient);

    setRepositories({
      salesOrderRepo,
      parkedOrderRepo,
      paymentMethodRepo,
    });
  }, []);

  // TODO: Get current user and location from your auth system
  const currentUserId = '1'; // Replace with actual user ID
  const currentLocationId = '1'; // Replace with actual location ID

  return (
    <SharedSales
      salesOrderRepo={repositories.salesOrderRepo}
      parkedOrderRepo={repositories.parkedOrderRepo}
      paymentMethodRepo={repositories.paymentMethodRepo}
      currentUserId={currentUserId}
      currentLocationId={currentLocationId}
    />
  );
}
```

#### 1.2 Seed Payment Methods (Desktop)

```bash
# Navigate to desktop app
cd apps/desktop

# Seed payment methods into SQLite
sqlite3 libsdb/cpos.db < libsdb/seed-payment-methods.sql

# Verify
sqlite3 libsdb/cpos.db "SELECT id, code, name FROM PaymentMethod;"
```

---

### Step 2: Web App Setup (apps/web)

#### 2.1 Update `apps/web/src/pages/Sales.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Sales as SharedSales, SalesProps } from '@monorepo/shared-ui';
import {
  SalesOrderRepository,
  ParkedOrderRepository,
  PaymentMethodRepository,
  WebIndexedDbClient,
  IndexedDBSchema,
} from '@monorepo/shared-data-access';

// Define IndexedDB schema
const schema: IndexedDBSchema = {
  stores: {
    SaleOrder: {
      keyPath: 'id',
      indexes: {
        orderNumber: { keyPath: 'orderNumber', unique: true },
        customerId: { keyPath: 'customerId' },
        status: { keyPath: 'status' },
      },
    },
    OrderLineItem: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        variantId: { keyPath: 'variantId' },
      },
    },
    OrderPayment: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        paymentMethodId: { keyPath: 'paymentMethodId' },
      },
    },
    ParkedOrder: {
      keyPath: 'id',
      indexes: {
        parkNumber: { keyPath: 'parkNumber', unique: true },
        orderId: { keyPath: 'orderId', unique: true },
        customerId: { keyPath: 'customerId' },
      },
    },
    PaymentMethod: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        isActive: { keyPath: 'isActive' },
      },
    },
    Customer: {
      keyPath: 'id',
      indexes: {
        customerCode: { keyPath: 'customerCode', unique: true },
        email: { keyPath: 'email' },
      },
    },
    Product: {
      keyPath: 'id',
      indexes: {
        productCode: { keyPath: 'productCode', unique: true },
      },
    },
    ProductVariant: {
      keyPath: 'id',
      indexes: {
        sku: { keyPath: 'sku', unique: true },
        productId: { keyPath: 'productId' },
      },
    },
  },
};

// Create singleton DB client
let dbClient: WebIndexedDbClient | null = null;

function getDbClient(): WebIndexedDbClient {
  if (!dbClient) {
    dbClient = new WebIndexedDbClient('cpos', 1, schema);
    dbClient.initialize().catch(err => {
      console.error('[Web Sales] Failed to initialize IndexedDB:', err);
    });
  }
  return dbClient;
}

// Create singleton API client
// TODO: Replace with your actual API client
const apiClient = {
  async get(url: string) {
    const response = await fetch(`/api${url}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { success: true, data };
  },
  async post(url: string, body: any) {
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { success: true, data };
  },
  async put(url: string, body: any) {
    const response = await fetch(`/api${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { success: true, data };
  },
  async delete(url: string) {
    const response = await fetch(`/api${url}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { success: true, data };
  },
};

export function Sales() {
  const [repositories, setRepositories] = useState<{
    salesOrderRepo?: SalesOrderRepository;
    parkedOrderRepo?: ParkedOrderRepository;
    paymentMethodRepo?: PaymentMethodRepository;
  }>({});

  useEffect(() => {
    // Initialize repositories
    const dbClient = getDbClient();

    const salesOrderRepo = new SalesOrderRepository(dbClient, apiClient);
    const parkedOrderRepo = new ParkedOrderRepository(dbClient, apiClient);
    const paymentMethodRepo = new PaymentMethodRepository(dbClient, apiClient);

    setRepositories({
      salesOrderRepo,
      parkedOrderRepo,
      paymentMethodRepo,
    });

    // Seed payment methods for web (if not already seeded)
    seedPaymentMethodsIfNeeded(paymentMethodRepo, dbClient);
  }, []);

  // TODO: Get current user and location from your auth system
  const currentUserId = '1'; // Replace with actual user ID from auth context
  const currentLocationId = '1'; // Replace with actual location ID

  return (
    <SharedSales
      salesOrderRepo={repositories.salesOrderRepo}
      parkedOrderRepo={repositories.parkedOrderRepo}
      paymentMethodRepo={repositories.paymentMethodRepo}
      currentUserId={currentUserId}
      currentLocationId={currentLocationId}
    />
  );
}

// Helper to seed payment methods in IndexedDB
async function seedPaymentMethodsIfNeeded(
  repo: PaymentMethodRepository,
  db: WebIndexedDbClient
) {
  try {
    // Check if payment methods exist
    const result = await repo.getPaymentMethods({ isActive: true, useServer: false });

    if (result.success && result.paymentMethods && result.paymentMethods.length > 0) {
      console.log('[Web Sales] Payment methods already seeded');
      return;
    }

    // Seed payment methods
    const paymentMethods = [
      { id: '1', code: 'CASH', name: 'Cash', type: 'Cash' as const, isActive: true, requiresAuthorization: false, sortOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: '2', code: 'CARD', name: 'Credit/Debit Card', type: 'Card' as const, isActive: true, requiresAuthorization: true, sortOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: '3', code: 'BANK_TRANSFER', name: 'Bank Transfer', type: 'BankTransfer' as const, isActive: true, requiresAuthorization: false, sortOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: '4', code: 'CHECK', name: 'Check', type: 'Check' as const, isActive: true, requiresAuthorization: true, sortOrder: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: '5', code: 'GIFT_CARD', name: 'Gift Card', type: 'GiftCard' as const, isActive: true, requiresAuthorization: false, sortOrder: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: '6', code: 'STORE_CREDIT', name: 'Store Credit', type: 'StoreCredit' as const, isActive: true, requiresAuthorization: false, sortOrder: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: '7', code: 'ON_ACCOUNT', name: 'On Account', type: 'OnAccount' as const, isActive: true, requiresAuthorization: true, sortOrder: 7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    for (const pm of paymentMethods) {
      await db.execute('INSERT INTO PaymentMethod (id, code, name, type, isActive, requiresAuthorization, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        pm.id, pm.code, pm.name, pm.type, pm.isActive ? 1 : 0, pm.requiresAuthorization ? 1 : 0, pm.sortOrder, pm.createdAt, pm.updatedAt
      ]);
    }

    console.log('[Web Sales] Payment methods seeded successfully');
  } catch (err) {
    console.error('[Web Sales] Failed to seed payment methods:', err);
  }
}
```

---

### Step 3: Update handleCreateOrder to Complete Parked Orders

In `libs/shared/ui/src/pages/Sales.tsx`, update the `handleCreateOrder` function:

```typescript
const handleCreateOrder = async (data: CreateSalesOrderInput) => {
  try {
    if (!salesOrderRepo) {
      show('Sales order repository not available', 'error');
      return;
    }

    // Map the form data to the API format
    const orderData = {
      locationId: currentLocationId,
      cashierId: currentUserId,
      customerId: data.customerId,
      lineItems: data.lineItems.map((item) => ({
        variantId: item.variantId,
        salesPersonId: item.salesPersonId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        saleDiscount: item.saleDiscount,
        customDiscount: item.customDiscount,
        notes: item.notes,
      })),
      payments: data.payments.map((payment) => ({
        paymentMethodId: payment.paymentMethodId,
        amount: payment.amount,
        cardLast4: payment.cardLast4,
        cardBrand: payment.cardBrand,
        authorizationCode: payment.authorizationCode,
        transactionId: payment.transactionId,
      })),
      orderLevelDiscount: data.orderLevelDiscount,
      adjustment: data.adjustment,
      couponCode: data.couponCode,
      notes: data.notes,
    };

    const result = await salesOrderRepo.createOrder(orderData);

    if (result.success && result.order) {
      show(
        `Sales order created successfully! Order #: ${result.order.orderNumber}`,
        'success'
      );

      // If this was completing a parked order, remove it from parked orders
      if (currentParkedOrderId && parkedOrderRepo) {
        await parkedOrderRepo.completeParkedOrder(currentParkedOrderId);
        setCurrentParkedOrderId(null);
        // Refresh parked orders list
        handleSearchParkedOrders('');
      }

      // Clear form would be handled by SalesOrderForm
    } else {
      show(result.error || 'Failed to create order', 'error');
    }
  } catch (err: any) {
    console.error('[Sales] Failed to create order:', err);
    show(err.message || 'Failed to create order', 'error');
  }
};
```

---

## 🌐 Step 4: Server-Side API Endpoints (Optional)

If you want to support server sync, create these endpoints in your backend:

### 4.1 Parked Orders Endpoints

```typescript
// POST /api/parked-orders - Park an order
app.post('/api/parked-orders', async (req, res) => {
  try {
    const { id, parkNumber, orderId, customerId, parkedBy, parkedAt, expiryDate, notes, createdAt } = req.body;

    // Save to database
    await db.query(
      `INSERT INTO ParkedOrder (id, parkNumber, orderId, customerId, parkedBy, parkedAt, expiryDate, notes, createdAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, parkNumber, orderId, customerId, parkedBy, parkedAt, expiryDate, notes, createdAt]
    );

    // Update order status
    await db.query(
      `UPDATE SaleOrder SET status = 'Parked', updatedAt = $1 WHERE id = $2`,
      [new Date().toISOString(), orderId]
    );

    res.json({ success: true, parkedOrder: req.body });
  } catch (error) {
    console.error('Failed to park order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/parked-orders - Search parked orders
app.get('/api/parked-orders', async (req, res) => {
  try {
    const { searchTerm } = req.query;

    let query = `
      SELECT
        po.id,
        po.parkNumber,
        po.orderId,
        po.parkedAt,
        po.parkedBy,
        po.notes,
        so.orderNumber,
        so.totalAmount,
        so.customerId,
        CONCAT(c.firstName, ' ', c.lastName) as customerName
      FROM ParkedOrder po
      INNER JOIN SaleOrder so ON po.orderId = so.id
      LEFT JOIN Customer c ON po.customerId = c.id
      WHERE so.status = 'Parked'
    `;

    const params: any[] = [];

    if (searchTerm) {
      query += ` AND (
        so.orderNumber ILIKE $1 OR
        c.firstName ILIKE $1 OR
        c.lastName ILIKE $1 OR
        CONCAT(c.firstName, ' ', c.lastName) ILIKE $1
      )`;
      params.push(`%${searchTerm}%`);
    }

    query += ` ORDER BY po.parkedAt DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      parkedOrders: result.rows,
    });
  } catch (error) {
    console.error('Failed to search parked orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/parked-orders/:id/load - Load parked order
app.get('/api/parked-orders/:id/load', async (req, res) => {
  try {
    const { id } = req.params;

    // Get parked order
    const parkedOrder = await db.query(
      'SELECT * FROM ParkedOrder WHERE id = $1',
      [id]
    );

    if (parkedOrder.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Parked order not found' });
    }

    const orderId = parkedOrder.rows[0].orderId;

    // Get order details
    const order = await db.query(
      'SELECT * FROM SaleOrder WHERE id = $1',
      [orderId]
    );

    // Get line items
    const lineItems = await db.query(
      `SELECT
        oli.*,
        pv.sku,
        pv.variantName,
        pv.image,
        p.name as productName
      FROM OrderLineItem oli
      LEFT JOIN ProductVariant pv ON oli.variantId = pv.id
      LEFT JOIN Product p ON pv.productId = p.id
      WHERE oli.orderId = $1`,
      [orderId]
    );

    // Get payments
    const payments = await db.query(
      `SELECT
        op.*,
        pm.code as paymentMethodCode,
        pm.name as paymentMethodName,
        pm.type as paymentMethodType
      FROM OrderPayment op
      LEFT JOIN PaymentMethod pm ON op.paymentMethodId = pm.id
      WHERE op.orderId = $1`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        parkedOrderId: id,
        order: order.rows[0],
        lineItems: lineItems.rows,
        payments: payments.rows.map(p => ({
          ...p,
          paymentMethod: {
            id: p.paymentMethodId,
            code: p.paymentMethodCode,
            name: p.paymentMethodName,
            type: p.paymentMethodType,
          },
        })),
      },
    });
  } catch (error) {
    console.error('Failed to load parked order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/parked-orders/:id/complete - Complete parked order
app.post('/api/parked-orders/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    // Get parked order
    const parkedOrder = await db.query(
      'SELECT * FROM ParkedOrder WHERE id = $1',
      [id]
    );

    if (parkedOrder.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Parked order not found' });
    }

    const orderId = parkedOrder.rows[0].orderId;

    // Update order status
    await db.query(
      `UPDATE SaleOrder SET status = 'Completed', completedAt = $1, updatedAt = $1 WHERE id = $2`,
      [new Date().toISOString(), orderId]
    );

    // Delete parked order record
    await db.query('DELETE FROM ParkedOrder WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to complete parked order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/parked-orders/:id - Delete parked order
app.delete('/api/parked-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get parked order
    const parkedOrder = await db.query(
      'SELECT * FROM ParkedOrder WHERE id = $1',
      [id]
    );

    if (parkedOrder.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Parked order not found' });
    }

    const orderId = parkedOrder.rows[0].orderId;

    // Update order status to voided
    await db.query(
      `UPDATE SaleOrder SET status = 'Voided', updatedAt = $1 WHERE id = $2`,
      [new Date().toISOString(), orderId]
    );

    // Delete parked order record
    await db.query('DELETE FROM ParkedOrder WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete parked order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## ✅ Testing Checklist

### Desktop App
- [ ] Database initializes correctly
- [ ] Payment methods load from SQLite
- [ ] Can create order with payment
- [ ] Can park order
- [ ] Can search parked orders
- [ ] Can load parked order
- [ ] Can complete parked order
- [ ] Can delete parked order
- [ ] Works offline (all operations)

### Web App
- [ ] IndexedDB initializes correctly
- [ ] Payment methods seed automatically
- [ ] Can create order with payment
- [ ] Can park order
- [ ] Can search parked orders
- [ ] Can load parked order
- [ ] Can complete parked order
- [ ] Can delete parked order
- [ ] Works offline (all operations)

### Server Sync (if implemented)
- [ ] Orders sync to server when online
- [ ] Parked orders sync to server
- [ ] Load parked order from server works
- [ ] Complete parked order syncs to server
- [ ] Delete parked order syncs to server

---

## 🐛 Troubleshooting

### Issue: "Database not initialized"
**Solution:** Make sure `initialize()` is called on the DB client before creating repositories.

### Issue: "Payment methods not found"
**Desktop:** Run the seed SQL script
**Web:** Check the seedPaymentMethodsIfNeeded function is being called

### Issue: "Parked order not loading"
**Check:**
1. ParkedOrder record exists in database
2. SaleOrder status is 'Parked'
3. OrderLineItems exist for the order
4. Repository is initialized properly

### Issue: "Cannot park order"
**Check:**
1. SalesOrderRepository is initialized
2. ParkedOrderRepository is initialized
3. Database has ParkedOrder table
4. Current user ID is set correctly

---

## 📝 Summary

**Total Implementation:**
- ✅ 7 new files created
- ✅ 5 existing files modified
- ✅ 700+ lines of repository code
- ✅ 500+ lines of UI components
- ✅ Complete offline-first support
- ✅ Server sync ready (optional)

**Next Steps:**
1. Update app-specific Sales pages with repository initialization (Step 1 & 2)
2. Test complete flow (use MANUAL_TESTING_GUIDE.md)
3. (Optional) Implement server endpoints (Step 4)
4. Deploy and test in production environment

---

**You're almost done! Just need to wire up the repositories in your app-specific Sales pages.** 🎉
