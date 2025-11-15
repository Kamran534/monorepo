/**
 * Customer Repository for Web App
 * Handles customer data with online/offline support
 * Implements the CustomerRepository interface expected by Redux store
 */

import type {
  CustomerRepository,
  Customer,
  CreateCustomerData,
  GetCustomersOptions,
  GetCustomersResult,
  CreateCustomerResult,
} from '@monorepo/shared-store';
import { BaseRepository } from './base-repository';

interface DbCustomer {
  id: string;
  customer_code: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  customer_group_id?: string | null;
  sync_status: string;
  last_synced_at: string | null;
  is_deleted: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DbCustomerAddress {
  id: string;
  customer_id: string;
  address_type: string;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiCustomer {
  id: string;
  customerCode?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  customerGroupId?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  addresses?: Array<{
    id?: string;
    addressType?: string;
    street1?: string;
    street2?: string | null;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isDefault?: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  }>;
}

export class WebCustomerRepository extends BaseRepository implements CustomerRepository {
  /**
   * Sync customers from server to IndexedDB
   */
  private async syncCustomersToLocal(dbCustomers: ApiCustomer[]): Promise<void> {
    try {
      console.log('[WebCustomerRepository] Syncing', dbCustomers.length, 'customers to IndexedDB');
      const db = this.getDb();
      const now = new Date().toISOString();

      for (const dbCustomer of dbCustomers) {
        // Map API customer to IndexedDB format
        const customerObject: DbCustomer = {
          id: dbCustomer.id,
          customer_code: dbCustomer.customerCode || dbCustomer.id,
          first_name: dbCustomer.firstName || '',
          last_name: dbCustomer.lastName || '',
          email: dbCustomer.email || null,
          phone: dbCustomer.phone || null,
          mobile_phone: dbCustomer.mobilePhone || null,
          customer_group_id: dbCustomer.customerGroupId || null,
          sync_status: 'synced',
          last_synced_at: now,
          is_deleted: 0,
          createdAt: dbCustomer.createdAt ? (dbCustomer.createdAt instanceof Date ? dbCustomer.createdAt.toISOString() : dbCustomer.createdAt) : now,
          updatedAt: dbCustomer.updatedAt ? (dbCustomer.updatedAt instanceof Date ? dbCustomer.updatedAt.toISOString() : dbCustomer.updatedAt) : now,
        };

        // Save customer to IndexedDB
        await db.execute('customers', [customerObject]);

        // Save customer addresses if they exist
        if (dbCustomer.addresses && Array.isArray(dbCustomer.addresses)) {
          for (const address of dbCustomer.addresses) {
            // Skip addresses without an ID
            if (!address.id) {
              console.warn('[WebCustomerRepository] Skipping address without ID for customer:', dbCustomer.id);
              continue;
            }
            const addressObject: DbCustomerAddress = {
              id: address.id,
              customer_id: dbCustomer.id,
              address_type: address.addressType || 'Both',
              street1: address.street1 || '',
              street2: address.street2 || null,
              city: address.city || '',
              state: address.state || '',
              postal_code: address.postalCode || '',
              country: address.country || '',
              is_default: address.isDefault ? 1 : 0,
              createdAt: address.createdAt ? (address.createdAt instanceof Date ? address.createdAt.toISOString() : address.createdAt) : now,
              updatedAt: address.updatedAt ? (address.updatedAt instanceof Date ? address.updatedAt.toISOString() : address.updatedAt) : now,
            };
            await db.execute('customer_addresses', [addressObject]);
          }
        }
      }

      console.log('[WebCustomerRepository] ✓ Synced', dbCustomers.length, 'customers to IndexedDB');
    } catch (error) {
      console.error('[WebCustomerRepository] ✗ Failed to sync customers to IndexedDB:', error);
      // Don't throw - allow the operation to continue even if sync fails
    }
  }

  /**
   * Get customers from IndexedDB
   */
  private async getCustomersFromLocal(): Promise<Customer[]> {
    try {
      const db = this.getDb();
      
      // Query all customers from IndexedDB
      const dbCustomers = await db.query<DbCustomer>('SELECT * FROM customers WHERE is_deleted = 0');
      
      if (!dbCustomers || dbCustomers.length === 0) {
        return [];
      }

      // Get addresses for all customers
      // Query all addresses and filter in memory (simpler than complex WHERE IN clause)
      const allAddresses = await db.query<DbCustomerAddress>('SELECT * FROM customer_addresses');
      const customerIdsSet = new Set(dbCustomers.map(c => c.id));
      const addresses = allAddresses.filter(addr => customerIdsSet.has(addr.customer_id));

      // Group addresses by customer ID
      const addressesByCustomer = new Map<string, DbCustomerAddress[]>();
      for (const address of addresses) {
        if (!addressesByCustomer.has(address.customer_id)) {
          addressesByCustomer.set(address.customer_id, []);
        }
        const customerAddresses = addressesByCustomer.get(address.customer_id);
        if (customerAddresses) {
          customerAddresses.push(address);
        }
      }

      // Map to UI Customer format
      const customers: Customer[] = dbCustomers.map(dbCustomer => {
        const customerAddresses = addressesByCustomer.get(dbCustomer.id) || [];
        const defaultAddress = customerAddresses.find(a => a.is_default === 1) || customerAddresses[0];

        return {
          id: dbCustomer.id,
          name: `${dbCustomer.first_name} ${dbCustomer.last_name}`.trim(),
          email: dbCustomer.email || '',
          phone: dbCustomer.phone || '',
          address: defaultAddress
            ? `${defaultAddress.street1 || ''}, ${defaultAddress.city || ''}, ${defaultAddress.state || ''} ${defaultAddress.postal_code || ''}`.trim()
            : '',
        };
      });

      console.log('[WebCustomerRepository] ✓ Loaded', customers.length, 'customers from IndexedDB');
      return customers;
    } catch (error) {
      console.error('[WebCustomerRepository] ✗ Failed to get customers from IndexedDB:', error);
      return [];
    }
  }
  /**
   * Get all customers with online/offline support
   */
  async getCustomers(options?: GetCustomersOptions): Promise<GetCustomersResult> {
    try {
      const isOnline = this.isOnline();

      if (isOnline && options?.useServer !== false) {
        // Fetch from API
        const api = this.getApi();
        const response = await api.get<{ success: boolean; data?: ApiCustomer[] | { data?: ApiCustomer[] }; error?: string }>('/api/customers');
        
        // Handle different response formats: response.data or response.data.data
        const responseData = response.data;
        const customersData = (Array.isArray(responseData) ? responseData : (responseData as { data?: ApiCustomer[] })?.data || []) || [];
        
        if (response.success && Array.isArray(customersData)) {
          // Sync customers to IndexedDB in the background
          this.syncCustomersToLocal(customersData).catch(err => {
            console.warn('[WebCustomerRepository] Background sync failed:', err);
          });

          // Map database customer to UI customer format
          const customers: Customer[] = customersData.map((dbCustomer: ApiCustomer) => ({
            id: dbCustomer.id,
            name: `${dbCustomer.firstName || ''} ${dbCustomer.lastName || ''}`.trim(),
            email: dbCustomer.email || '',
            phone: dbCustomer.phone || '',
            address: dbCustomer.addresses?.[0] 
              ? `${dbCustomer.addresses[0].street1 || ''}, ${dbCustomer.addresses[0].city || ''}, ${dbCustomer.addresses[0].state || ''} ${dbCustomer.addresses[0].postalCode || ''}`.trim()
              : '',
          }));

          return {
            success: true,
            customers,
            isOffline: false,
          };
        }

        return {
          success: false,
          error: response.error || 'Failed to fetch customers',
          isOffline: false,
        };
      } else {
        // Offline mode - read from IndexedDB
        console.log('[WebCustomerRepository] Offline mode - reading from IndexedDB');
        const customers = await this.getCustomersFromLocal();
        return {
          success: true,
          customers,
          isOffline: true,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch customers';
      console.error('[WebCustomerRepository] Get customers error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        isOffline: !this.isOnline(),
      };
    }
  }

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerData, options?: GetCustomersOptions): Promise<CreateCustomerResult> {
    try {
      const isOnline = this.isOnline();

      if (isOnline && options?.useServer !== false) {
        // Create via API
        const api = this.getApi();
        const response = await api.post<{ success: boolean; data?: ApiCustomer; error?: string }>('/api/customers', data);
        
        if (response.success && response.data) {
          const dbCustomer = response.data as {
            id: string;
            firstName?: string;
            lastName?: string;
            email?: string;
            phone?: string;
            addresses?: Array<{
              street1?: string;
              city?: string;
              state?: string;
              postalCode?: string;
            }>;
          };
          const customer: Customer = {
            id: dbCustomer.id,
            name: `${dbCustomer.firstName} ${dbCustomer.lastName}`.trim(),
            email: dbCustomer.email || '',
            phone: dbCustomer.phone || '',
            address: dbCustomer.addresses?.[0] 
              ? `${dbCustomer.addresses[0].street1}, ${dbCustomer.addresses[0].city}, ${dbCustomer.addresses[0].state} ${dbCustomer.addresses[0].postalCode}`
              : '',
          };

          // Sync the new customer to IndexedDB
          this.syncCustomersToLocal([dbCustomer as ApiCustomer]).catch(err => {
            console.warn('[WebCustomerRepository] Failed to sync new customer to IndexedDB:', err);
          });

          return {
            success: true,
            customer,
          };
        }

        return {
          success: false,
          error: response.error || 'Failed to create customer',
        };
      } else {
        // TODO: Implement offline mode with IndexedDB
        return {
          success: false,
          error: 'Offline mode not yet implemented',
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create customer';
      console.error('[WebCustomerRepository] Create customer error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(id: string, data: CreateCustomerData, options?: GetCustomersOptions): Promise<CreateCustomerResult> {
    try {
      const isOnline = this.isOnline();

      if (isOnline && options?.useServer !== false) {
        // Update via API
        const api = this.getApi();
        const response = await api.put<{ success: boolean; data?: ApiCustomer; error?: string }>(`/api/customers/${id}`, data);
        
        if (response.success && response.data) {
          const dbCustomer = response.data as {
            id: string;
            firstName?: string;
            lastName?: string;
            email?: string;
            phone?: string;
            addresses?: Array<{
              street1?: string;
              city?: string;
              state?: string;
              postalCode?: string;
            }>;
          };
          const customer: Customer = {
            id: dbCustomer.id,
            name: `${dbCustomer.firstName} ${dbCustomer.lastName}`.trim(),
            email: dbCustomer.email || '',
            phone: dbCustomer.phone || '',
            address: dbCustomer.addresses?.[0] 
              ? `${dbCustomer.addresses[0].street1}, ${dbCustomer.addresses[0].city}, ${dbCustomer.addresses[0].state} ${dbCustomer.addresses[0].postalCode}`
              : '',
          };

          // Sync the updated customer to IndexedDB
          this.syncCustomersToLocal([dbCustomer as ApiCustomer]).catch(err => {
            console.warn('[WebCustomerRepository] Failed to sync updated customer to IndexedDB:', err);
          });

          return {
            success: true,
            customer,
          };
        }

        return {
          success: false,
          error: response.error || 'Failed to update customer',
        };
      } else {
        // TODO: Implement offline mode with IndexedDB
        return {
          success: false,
          error: 'Offline mode not yet implemented',
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update customer';
      console.error('[WebCustomerRepository] Update customer error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(id: string, options?: GetCustomersOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const isOnline = this.isOnline();

      if (isOnline && options?.useServer !== false) {
        // Delete via API
        const api = this.getApi();
        const response = await api.delete<{ success: boolean; error?: string }>(`/api/customers/${id}`);
        
        if (response.success) {
          // Delete customer from IndexedDB
          try {
            const db = this.getDb();
            // Delete customer by ID (IndexedDB delete uses the key directly)
            await db.execute('DELETE FROM customers', [id]);
            // Delete addresses - need to query first, then delete each
            const addresses = await db.query<DbCustomerAddress>(
              'SELECT * FROM customer_addresses WHERE customer_id = ?',
              [id]
            );
            for (const address of addresses) {
              await db.execute('DELETE FROM customer_addresses', [address.id]);
            }
            console.log('[WebCustomerRepository] ✓ Deleted customer from IndexedDB:', id);
          } catch (err) {
            console.warn('[WebCustomerRepository] Failed to delete customer from IndexedDB:', err);
          }

          return { success: true };
        }

        return {
          success: false,
          error: response.error || 'Failed to delete customer',
        };
      } else {
        // TODO: Implement offline mode with IndexedDB
        return {
          success: false,
          error: 'Offline mode not yet implemented',
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete customer';
      console.error('[WebCustomerRepository] Delete customer error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

