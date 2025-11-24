import { Orders as SharedOrders } from '@monorepo/shared-ui';
import { SalesOrderRepository } from '@monorepo/shared-data-access';
import { dataAccessService } from '../services/data-access.service';
import { useEffect, useState } from 'react';

export function Orders() {
  const [repositoriesReady, setRepositoriesReady] = useState(false);
  const [salesOrderRepo, setSalesOrderRepo] = useState<SalesOrderRepository | undefined>();

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
          console.error('[Orders] Data access service not ready after retries');
          return;
        }

        const localDb = dataAccessService.getLocalDb();
        const apiClient = dataAccessService.getApiClient();

        if (!localDb || !apiClient) {
          console.error('[Orders] Local DB or API client not available');
          return;
        }

        const repo = new SalesOrderRepository(localDb, apiClient);
        setSalesOrderRepo(repo);
        setRepositoriesReady(true);
      } catch (error) {
        console.error('[Orders] Failed to initialize repositories:', error);
      }
    };

    initializeRepositories();
  }, []);

  if (!repositoriesReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return <SharedOrders salesOrderRepo={salesOrderRepo} />;
}

export default Orders;

