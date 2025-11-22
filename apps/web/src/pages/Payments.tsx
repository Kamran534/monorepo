import { Payments as SharedPayments } from '@monorepo/shared-ui';
import {
  SalesOrderRepository,
  ParkedOrderRepository,
  PaymentMethodRepository,
} from '@monorepo/shared-data-access';
import { dataAccessService } from '../services/data-access.service';
import { useEffect, useState } from 'react';

// Get current user and location from localStorage
const currentUserId = localStorage.getItem('currentUserId') || 'd1c633de-7adc-4eec-87fc-ce4232bf0858';
const currentLocationId = localStorage.getItem('currentLocationId') || '3ffcbd8a-703b-4b37-9f31-30ec61546e98';

export function Payments() {
  const [repositoriesReady, setRepositoriesReady] = useState(false);
  const [repositories, setRepositories] = useState<{
    salesOrderRepo?: SalesOrderRepository;
    parkedOrderRepo?: ParkedOrderRepository;
    paymentMethodRepo?: PaymentMethodRepository;
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
          // console.error('[Web Payments] Data access service not ready');
          return;
        }

        // Create repository instances using dataAccessService
        const localDb = dataAccessService.getLocalDb();
        const apiClient = dataAccessService.getApiClient();

        setRepositories({
          salesOrderRepo: new SalesOrderRepository(localDb, apiClient),
          parkedOrderRepo: new ParkedOrderRepository(localDb, apiClient),
          paymentMethodRepo: new PaymentMethodRepository(localDb, apiClient),
        });

        setRepositoriesReady(true);
      } catch {
        // console.error('[Web Payments] Failed to initialize repositories:', error);
      }
    };

    initializeRepositories();
  }, []);

  if (!repositoriesReady || !repositories.salesOrderRepo) {
    return <div>Loading...</div>;
  }

  return (
    <SharedPayments
      salesOrderRepo={repositories.salesOrderRepo}
      parkedOrderRepo={repositories.parkedOrderRepo}
      paymentMethodRepo={repositories.paymentMethodRepo}
      currentUserId={currentUserId}
      currentLocationId={currentLocationId}
    />
  );
}

export default Payments;

