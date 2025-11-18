import { Transactions as SharedTransactions } from '@monorepo/shared-ui';
import { WebProductRepository } from '../services/repositories';
import {
  WebIndexedDbClient,
  SalesOrderRepository,
  ParkedOrderRepository,
  PaymentMethodRepository,
  HttpApiClient,
  seedPaymentMethods,
  type IndexedDBSchema,
} from '@monorepo/shared-data-access';

const productRepository = new WebProductRepository();

// Define IndexedDB schema for parked orders and sales
const indexedDBSchema: IndexedDBSchema = {
  stores: {
    SaleOrder: {
      keyPath: 'id',
      indexes: {
        orderNumber: { keyPath: 'orderNumber', unique: true },
        status: { keyPath: 'status' },
        customerId: { keyPath: 'customerId' },
        createdAt: { keyPath: 'createdAt' },
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
    PaymentMethod: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        type: { keyPath: 'type' },
        isActive: { keyPath: 'isActive' },
      },
    },
    ParkedOrder: {
      keyPath: 'id',
      indexes: {
        parkNumber: { keyPath: 'parkNumber', unique: true },
        orderId: { keyPath: 'orderId', unique: true },
        customerId: { keyPath: 'customerId' },
        parkedAt: { keyPath: 'parkedAt' },
      },
    },
  },
};

// Initialize database client and repositories
const dbClient = new WebIndexedDbClient('cpos', 1, indexedDBSchema);
const apiClient = new HttpApiClient();

// Initialize database connection
dbClient.initialize()
  .then(async () => {
    // Auto-seed payment methods after database initialization
    console.log('[Web Transactions] Auto-seeding payment methods...');
    await seedPaymentMethods(dbClient);
    console.log('[Web Transactions] Payment methods seeding complete');
  })
  .catch((err) => {
    console.error('[Web Transactions] Failed to initialize database:', err);
  });
apiClient.initialize().catch((err) => {
  console.error('[Web Transactions] Failed to initialize API client:', err);
});

// Create repository instances
const salesOrderRepo = new SalesOrderRepository(dbClient, apiClient);
const parkedOrderRepo = new ParkedOrderRepository(dbClient, apiClient);
const paymentMethodRepo = new PaymentMethodRepository(dbClient, apiClient);

// Migrate old numeric IDs to UUIDs
const storedUserId = localStorage.getItem('currentUserId');
const storedLocationId = localStorage.getItem('currentLocationId');

// If old numeric IDs are stored, replace with UUIDs
if (storedUserId === '1' || !storedUserId) {
  localStorage.setItem('currentUserId', 'd1c633de-7adc-4eec-87fc-ce4232bf0858');
}
if (storedLocationId === '1' || !storedLocationId) {
  localStorage.setItem('currentLocationId', '3ffcbd8a-703b-4b37-9f31-30ec61546e98');
}

// Get current user and location from localStorage (now guaranteed to be UUIDs)
const currentUserId = localStorage.getItem('currentUserId') || 'd1c633de-7adc-4eec-87fc-ce4232bf0858'; // Cashier user from seed
const currentLocationId = localStorage.getItem('currentLocationId') || '3ffcbd8a-703b-4b37-9f31-30ec61546e98'; // Main Store from seed

export function Transactions() {
  return (
    <SharedTransactions
      productRepository={productRepository}
      salesOrderRepo={salesOrderRepo}
      parkedOrderRepo={parkedOrderRepo}
      paymentMethodRepo={paymentMethodRepo}
      currentUserId={currentUserId}
      currentLocationId={currentLocationId}
    />
  );
}

export default Transactions;
