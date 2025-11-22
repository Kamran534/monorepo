import { Transactions as SharedTransactions } from '@monorepo/shared-ui';
import { WebProductRepository } from '../services/repositories';
import {
  SalesOrderRepository,
  ParkedOrderRepository,
  PaymentMethodRepository,
  SalesPersonRepository,
} from '@monorepo/shared-data-access';
import { dataAccessService } from '../services/data-access.service';
import { seedPaymentMethods } from '@monorepo/shared-data-access';
import { useEffect, useState } from 'react';

const productRepository = new WebProductRepository();

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
  const [repositoriesReady, setRepositoriesReady] = useState(false);
  const [repositories, setRepositories] = useState<{
    salesOrderRepo?: SalesOrderRepository;
    parkedOrderRepo?: ParkedOrderRepository;
    paymentMethodRepo?: PaymentMethodRepository;
    salesPersonRepo?: SalesPersonRepository;
  }>({});

  useEffect(() => {
    const initializeRepositories = async () => {
      try {
        // Wait for data access service to be ready
        let retries = 0;
        while (retries < 100) {
          if (dataAccessService.isReady()) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!dataAccessService.isReady()) {
          // console.error('[Web Transactions] Data access service not ready');
          return;
        }

        // Seed payment methods if needed
        try {
          const localDb = dataAccessService.getLocalDb();
          // console.log('[Web Transactions] Seeding payment methods...');
          await seedPaymentMethods(localDb);
          // console.log('[Web Transactions] Payment methods seeded');
        } catch {
          // console.warn('[Web Transactions] Failed to seed payment methods:', error);
        }

        // Create repository instances using dataAccessService
        const localDb = dataAccessService.getLocalDb();
        const apiClient = dataAccessService.getApiClient();

        setRepositories({
          salesOrderRepo: new SalesOrderRepository(localDb, apiClient),
          parkedOrderRepo: new ParkedOrderRepository(localDb, apiClient),
          paymentMethodRepo: new PaymentMethodRepository(localDb, apiClient),
          salesPersonRepo: new SalesPersonRepository(localDb, apiClient),
        });

        setRepositoriesReady(true);
      } catch {
        // console.error('[Web Transactions] Failed to initialize repositories:', error);
      }
    };

    initializeRepositories();
  }, []);

  if (!repositoriesReady || !repositories.salesOrderRepo) {
    return <div>Loading...</div>;
  }

  return (
    <SharedTransactions
      productRepository={productRepository}
      salesOrderRepo={repositories.salesOrderRepo}
      parkedOrderRepo={repositories.parkedOrderRepo}
      paymentMethodRepo={repositories.paymentMethodRepo}
      salesPersonRepo={repositories.salesPersonRepo}
      currentUserId={currentUserId}
      currentLocationId={currentLocationId}
    />
  );
}

export default Transactions;
