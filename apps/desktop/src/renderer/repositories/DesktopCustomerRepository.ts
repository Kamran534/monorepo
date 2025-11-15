/**
 * Desktop Customer Repository
 *
 * Wraps Electron IPC calls to match the CustomerRepository interface
 * This allows Redux to work seamlessly with the desktop app
 */

import type {
  CustomerRepository,
  Customer,
  CreateCustomerData,
  GetCustomersOptions,
  GetCustomersResult,
  CreateCustomerResult,
} from '@monorepo/shared-store';

export class DesktopCustomerRepository implements CustomerRepository {
  /**
   * Get all customers via Electron IPC
   */
  async getCustomers(options?: GetCustomersOptions): Promise<GetCustomersResult> {
    try {
      // Check if electronAPI is available
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.customer) {
        const errorMsg = 'Electron API not available. Make sure the preload script is loaded.';
        console.error('[DesktopCustomerRepository]', errorMsg);
        return {
          success: false,
          error: errorMsg,
          isOffline: true,
        };
      }

      console.log('[DesktopCustomerRepository] Calling electronAPI.customer.getAll');
      const result = await window.electronAPI.customer.getAll();

      console.log('[DesktopCustomerRepository] Result:', {
        success: result.success,
        customerCount: result.customers?.length || 0,
        isOffline: result.isOffline,
      });

      return {
        success: result.success,
        customers: result.customers || [],
        error: result.error,
        isOffline: result.isOffline,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DesktopCustomerRepository] Error:', errorMsg);
      console.error('[DesktopCustomerRepository] Error stack:', error instanceof Error ? error.stack : 'N/A');
      return {
        success: false,
        error: errorMsg,
        isOffline: true,
      };
    }
  }

  /**
   * Create a new customer via Electron IPC
   */
  async createCustomer(data: CreateCustomerData, options?: GetCustomersOptions): Promise<CreateCustomerResult> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.customer) {
        return {
          success: false,
          error: 'Electron API not available',
        };
      }

      console.log('[DesktopCustomerRepository] Calling electronAPI.customer.create');
      const result = await window.electronAPI.customer.create(data);

      return {
        success: result.success,
        customer: result.customer,
        error: result.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create customer';
      console.error('[DesktopCustomerRepository] Create error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Update a customer via Electron IPC
   */
  async updateCustomer(id: string, data: CreateCustomerData, options?: GetCustomersOptions): Promise<CreateCustomerResult> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.customer) {
        return {
          success: false,
          error: 'Electron API not available',
        };
      }

      console.log('[DesktopCustomerRepository] Calling electronAPI.customer.update');
      const result = await window.electronAPI.customer.update(id, data);

      return {
        success: result.success,
        customer: result.customer,
        error: result.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update customer';
      console.error('[DesktopCustomerRepository] Update error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Delete a customer via Electron IPC
   */
  async deleteCustomer(id: string, options?: GetCustomersOptions): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.customer) {
        return {
          success: false,
          error: 'Electron API not available',
        };
      }

      console.log('[DesktopCustomerRepository] Calling electronAPI.customer.delete');
      const result = await window.electronAPI.customer.delete(id);

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete customer';
      console.error('[DesktopCustomerRepository] Delete error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

// Singleton instance
let repositoryInstance: DesktopCustomerRepository | null = null;

export function getDesktopCustomerRepository(): DesktopCustomerRepository {
  if (!repositoryInstance) {
    repositoryInstance = new DesktopCustomerRepository();
  }
  return repositoryInstance;
}

