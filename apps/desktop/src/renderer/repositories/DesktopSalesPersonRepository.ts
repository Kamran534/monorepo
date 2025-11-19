import type {
  SalesPerson,
  GetSalesPersonsOptions,
  GetSalesPersonsResult,
} from '@monorepo/shared-data-access';

export class DesktopSalesPersonRepository {
  async getSalesPersons(options?: GetSalesPersonsOptions): Promise<GetSalesPersonsResult> {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Window is not defined');
      }

      const invoke = window.electronAPI?.salesPerson
        ? (opts?: GetSalesPersonsOptions) => window.electronAPI!.salesPerson.getAll(opts)
        : window.electron?.ipcRenderer
        ? (opts?: GetSalesPersonsOptions) => window.electron!.ipcRenderer.invoke('sales-person:get-all', opts)
        : null;

      if (!invoke) {
        throw new Error('Sales person IPC bridge not available');
      }

      const result = await invoke(options);
      return {
        success: result.success,
        salesPersons: result.salesPersons || [],
        total: result.total,
        hasMore: result.hasMore,
        error: result.error,
        isOffline: result.isOffline,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load sales persons';
      console.error('[DesktopSalesPersonRepository] Error:', error);
      return {
        success: false,
        salesPersons: [],
        error: message,
        isOffline: true,
      };
    }
  }
}

let repositoryInstance: DesktopSalesPersonRepository | null = null;

export function getDesktopSalesPersonRepository(): DesktopSalesPersonRepository {
  if (!repositoryInstance) {
    repositoryInstance = new DesktopSalesPersonRepository();
  }
  return repositoryInstance;
}

export type { SalesPerson, GetSalesPersonsOptions, GetSalesPersonsResult };

