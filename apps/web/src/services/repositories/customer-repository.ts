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

// IndexedDB customer type (matches cposSchema with camelCase fields)
interface IndexedDBCustomer {
  id: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  customerGroupId?: string | null;
  sync_status: string;
  last_synced_at: string | null;
  is_deleted: number;
  createdAt?: string;
  updatedAt?: string;
}

// IndexedDB customer address type (matches cposSchema with camelCase fields)
interface IndexedDBCustomerAddress {
  id: string;
  customerId: string;
  addressType: string;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: number;
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
        // Note: Schema uses camelCase (customerCode, customerGroupId), not snake_case
        const customerObject = {
          id: dbCustomer.id,
          customerCode: dbCustomer.customerCode || dbCustomer.id,
          firstName: dbCustomer.firstName || '',
          lastName: dbCustomer.lastName || '',
          email: dbCustomer.email || null,
          phone: dbCustomer.phone || null,
          mobilePhone: dbCustomer.mobilePhone || null,
          customerGroupId: dbCustomer.customerGroupId || null,
          sync_status: 'synced',
          last_synced_at: now,
          is_deleted: 0,
          createdAt: dbCustomer.createdAt ? (dbCustomer.createdAt instanceof Date ? dbCustomer.createdAt.toISOString() : dbCustomer.createdAt) : now,
          updatedAt: dbCustomer.updatedAt ? (dbCustomer.updatedAt instanceof Date ? dbCustomer.updatedAt.toISOString() : dbCustomer.updatedAt) : now,
        };

        // Save customer to IndexedDB (store name is 'Customer' in cposSchema)
        await db.execute('Customer', [customerObject]);

        // Save customer addresses if they exist
        if (dbCustomer.addresses && Array.isArray(dbCustomer.addresses)) {
          for (const address of dbCustomer.addresses) {
            // Skip addresses without an ID
            if (!address.id) {
              console.warn('[WebCustomerRepository] Skipping address without ID for customer:', dbCustomer.id);
              continue;
            }
            // Note: Schema uses camelCase (customerId, addressType, postalCode, isDefault), not snake_case
            const addressObject = {
              id: address.id,
              customerId: dbCustomer.id,
              addressType: address.addressType || 'Both',
              street1: address.street1 || '',
              street2: address.street2 || null,
              city: address.city || '',
              state: address.state || '',
              postalCode: address.postalCode || '',
              country: address.country || '',
              isDefault: address.isDefault ? 1 : 0,
              createdAt: address.createdAt ? (address.createdAt instanceof Date ? address.createdAt.toISOString() : address.createdAt) : now,
              updatedAt: address.updatedAt ? (address.updatedAt instanceof Date ? address.updatedAt.toISOString() : address.updatedAt) : now,
            };
            await db.execute('CustomerAddress', [addressObject]);
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
      // Fetch all and filter in JavaScript since IndexedDB query parser may not handle all WHERE clauses
      // Store name is 'Customer' in cposSchema (PascalCase)
      const allCustomers = await db.query<IndexedDBCustomer>('SELECT * FROM Customer');
      
      if (!allCustomers || allCustomers.length === 0) {
        console.log('[WebCustomerRepository] No customers found in IndexedDB');
        return [];
      }
      
      // Filter out deleted customers (is_deleted is a number: 0 = not deleted, 1 = deleted)
      const dbCustomers = allCustomers.filter(c => c.is_deleted === 0);
      
      if (dbCustomers.length === 0) {
        console.log('[WebCustomerRepository] All customers in IndexedDB are marked as deleted');
        return [];
      }
      
      console.log('[WebCustomerRepository] Found', dbCustomers.length, 'active customers in IndexedDB (out of', allCustomers.length, 'total)');

      // Get addresses for all customers
      // Query all addresses and filter in memory (simpler than complex WHERE IN clause)
      // Store name is 'CustomerAddress' in cposSchema (PascalCase)
      // Note: Schema uses camelCase (customerId), not snake_case (customer_id)
      const allAddresses = await db.query<IndexedDBCustomerAddress>('SELECT * FROM CustomerAddress');
      const customerIdsSet = new Set(dbCustomers.map(c => c.id));
      const addresses = allAddresses.filter(addr => customerIdsSet.has(addr.customerId));

      // Group addresses by customer ID
      // Note: Schema uses camelCase (customerId), not snake_case (customer_id)
      const addressesByCustomer = new Map<string, IndexedDBCustomerAddress[]>();
      for (const address of addresses) {
        const customerId = address.customerId;
        if (!addressesByCustomer.has(customerId)) {
          addressesByCustomer.set(customerId, []);
        }
        const customerAddresses = addressesByCustomer.get(customerId);
        if (customerAddresses) {
          customerAddresses.push(address);
        }
      }

      // Map to UI Customer format
      // Note: Schema uses camelCase (firstName, lastName, postalCode), not snake_case
      const customers: Customer[] = dbCustomers.map(dbCustomer => {
        const customerAddresses = addressesByCustomer.get(dbCustomer.id) || [];
        const defaultAddress = customerAddresses.find(a => a.isDefault === 1) || customerAddresses[0];

        return {
          id: dbCustomer.id,
          name: `${dbCustomer.firstName || ''} ${dbCustomer.lastName || ''}`.trim(),
          email: dbCustomer.email || '',
          phone: dbCustomer.phone || '',
          address: defaultAddress
            ? `${defaultAddress.street1 || ''}, ${defaultAddress.city || ''}, ${defaultAddress.state || ''} ${defaultAddress.postalCode || ''}`.trim()
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

      // Try API first if online and server is not explicitly disabled
      if (isOnline && options?.useServer !== false) {
        try {
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

          // API returned unsuccessful response, fall through to local database
          console.warn('[WebCustomerRepository] API returned unsuccessful response, falling back to local database');
        } catch (apiError) {
          // API call failed, fall back to local database
          console.warn('[WebCustomerRepository] API call failed, falling back to local database:', apiError);
        }
      }

      // Offline mode or API failed - read from IndexedDB
      console.log('[WebCustomerRepository] Reading from IndexedDB');
      const customers = await this.getCustomersFromLocal();
      return {
        success: true,
        customers,
        isOffline: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch customers';
      console.error('[WebCustomerRepository] Get customers error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        isOffline: true,
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
            // Store name is 'Customer' in cposSchema (PascalCase)
            await db.execute('DELETE FROM Customer', [id]);
            // Delete addresses - need to query first, then delete each
            // Store name is 'CustomerAddress' in cposSchema (PascalCase)
            // Note: Schema uses camelCase (customerId), not snake_case (customer_id)
            const addresses = await db.query<IndexedDBCustomerAddress>(
              'SELECT * FROM CustomerAddress WHERE customerId = ?',
              [id]
            );
            for (const address of addresses) {
              await db.execute('DELETE FROM CustomerAddress', [address.id]);
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

