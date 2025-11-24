import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { join } from 'node:path';
import { dataAccessService } from './services/data-access.service.js';

const isDev = process.env.ELECTRON_RENDERER_URL;

/**
 * Setup IPC handlers
 */
function setupIpcHandlers(): void {
  // Connection state handlers
  ipcMain.handle('connection:get-state', async () => {
    try {
      if (!dataAccessService) {
        // console.warn('[IPC] DataAccessService not initialized, returning default state');
        return {
          status: 'unknown',
          dataSource: 'local',
          serverUrl: process.env.SERVER_URL || 'http://localhost:4000',
          lastChecked: null,
          error: 'DataAccessService not initialized',
        };
      }
      const state = dataAccessService.getConnectionState();
      // console.log('[IPC] Raw connection state:', JSON.stringify(state, null, 2));
      // console.log('[IPC] Status:', state.status, 'Type:', typeof state.status);
      // console.log('[IPC] DataSource:', state.dataSource, 'Type:', typeof state.dataSource);
      
      // Serialize Date objects to ISO strings for IPC
      // Convert enum values to strings - enums are string enums, so the value is already a string
      // But ensure it's lowercase for consistency
      let statusValue: string;
      if (typeof state.status === 'string') {
        statusValue = state.status.toLowerCase();
      } else if (state.status && typeof state.status === 'object' && 'value' in state.status) {
        // Handle enum object if it's not a string
        statusValue = String(state.status.value || state.status).toLowerCase();
      } else {
        statusValue = String(state.status || 'unknown').toLowerCase();
      }
      
      let dataSourceValue: string;
      if (typeof state.dataSource === 'string') {
        dataSourceValue = state.dataSource.toLowerCase();
      } else if (state.dataSource && typeof state.dataSource === 'object' && 'value' in state.dataSource) {
        // Handle enum object if it's not a string
        dataSourceValue = String(state.dataSource.value || state.dataSource).toLowerCase();
      } else {
        dataSourceValue = String(state.dataSource || 'local').toLowerCase();
      }
      
      const serializedState = {
        status: statusValue as 'online' | 'offline' | 'checking' | 'unknown',
        dataSource: dataSourceValue as 'server' | 'local',
        serverUrl: state.serverUrl,
        lastChecked: state.lastChecked ? state.lastChecked.toISOString() : null,
        error: state.error,
      };
      // console.log('[IPC] Serialized state:', JSON.stringify(serializedState, null, 2));
      return serializedState;
    } catch (error) {
      // console.error('[IPC] connection:get-state error:', error);
      // Return a default state instead of throwing - never throw from IPC handlers
      return {
        status: 'unknown',
        dataSource: 'local',
        serverUrl: process.env.SERVER_URL || 'http://localhost:4000',
        lastChecked: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('connection:set-manual', async (event, source: string | null) => {
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }
      // console.log('[IPC] connection:set-manual - Setting manual source to:', source);
      const { DataSource } = await import('@monorepo/shared-data-access');
      const dataSource = source === 'server' ? DataSource.SERVER : 
                        source === 'local' ? DataSource.LOCAL : null;
      await dataAccessService.setManualDataSource(dataSource);
      
      // Get updated state and return it
      const updatedState = dataAccessService.getConnectionState();
      // console.log('[IPC] connection:set-manual - Updated state:', updatedState);
      
      return { 
        success: true,
        state: {
          status: String(updatedState.status).toLowerCase(),
          dataSource: String(updatedState.dataSource).toLowerCase(),
          serverUrl: updatedState.serverUrl,
          lastChecked: updatedState.lastChecked ? updatedState.lastChecked.toISOString() : null,
          error: updatedState.error,
        }
      };
    } catch (error) {
      // console.error('[IPC] connection:set-manual error:', error);
      throw error;
    }
  });

  ipcMain.handle('connection:get-manual-override', async () => {
    try {
      if (!dataAccessService) {
        return { enabled: false, dataSource: null };
      }
      return dataAccessService.getManualOverride();
    } catch (error) {
      // console.error('[IPC] connection:get-manual-override error:', error);
      return { enabled: false, dataSource: null };
    }
  });

  ipcMain.handle('connection:check', async () => {
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }
      // console.log('[IPC] connection:check - Starting connectivity check...');
      const result = await dataAccessService.checkConnectivity();
      // console.log('[IPC] connection:check - Result:', result);
      
      // Get updated state after check
      const updatedState = dataAccessService.getConnectionState();
      // console.log('[IPC] connection:check - Updated state:', updatedState);
      
      return result;
    } catch (error) {
      // console.error('[IPC] connection:check error:', error);
      throw error;
    }
  });

  // Auth handlers
  ipcMain.handle('auth:login', async (event, username: string, password: string) => {
    // console.log('[IPC] ========== AUTH:LOGIN CALLED ==========');
    // console.log('[IPC] Username:', username);
    // console.log('[IPC] DataAccessService exists:', !!dataAccessService);
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      // Use shared UserRepository for login (handles online/offline automatically)
      const { UserRepository } = (await import('@monorepo/shared-data-access')) as any;
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      const userRepository = new UserRepository(localDb, apiClient);
      
      // console.log('[IPC] Attempting login (will try online first, then offline)...');
      
      // Pass undefined for useServer to enable auto-detection with fallback
      const result = await userRepository.login({ username, password }, { useServer: undefined });
      
      // console.log('[IPC] Login result:', {
      //   success: result.success,
      //   hasUser: !!result.user,
      //   hasToken: !!result.token,
      //   isOffline: result.isOffline,
      //   error: result.error,
      // });
      
      if (result.success && result.user) {
        // Set auth token if available (online login)
        if (result.token) {
          apiClient.setAuthToken(result.token);
          
          // Initialize sync service for online login
          try {
            // console.log('[IPC] Initializing sync service after successful online login...');
            await dataAccessService.initializeSyncService(result.token);
            // console.log('[IPC] Sync service initialized successfully');
          } catch (error) {
            // console.warn('[IPC] Failed to initialize sync service after login:', error);
          }
        }
        
        return {
          success: true,
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            roleId: result.user.roleId,
            roleName: result.user.roleName || '',
            employeeCode: result.user.employeeCode || undefined,
            isActive: result.user.isActive ? true : false,
          },
          token: result.token,
          isOffline: result.isOffline || false,
        };
      }

      // Login failed
      return {
        success: false,
        error: result.error || 'Invalid credentials. Please check your username and password.',
        isOffline: result.isOffline || false,
      };
    } catch (error) {
      // console.error('[IPC] auth:login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        isOffline: true,
      };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    try {
      if (dataAccessService) {
        // Stop sync service
        // console.log('[IPC] Stopping sync service on logout...');
        await dataAccessService.stopSyncService();

        // Clear auth token
        dataAccessService.clearAuthToken();
        // console.log('[IPC] Logout complete - sync stopped and token cleared');
      }
      return { success: true };
    } catch (error) {
      // console.error('[IPC] auth:logout error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Logout failed' };
    }
  });

  // Sync handlers
  ipcMain.handle('sync:trigger-manual', async () => {
    try {
      if (!dataAccessService) {
        return { success: false, error: 'DataAccessService not initialized' };
      }

      // console.log('[IPC] Manual sync triggered...');
      await dataAccessService.triggerManualSync();
      // console.log('[IPC] Manual sync completed');

      return {
        success: true,
        lastSyncTime: dataAccessService.getLastSyncTime(),
      };
    } catch (error) {
      // console.error('[IPC] Manual sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Manual sync failed',
      };
    }
  });

  // Category handlers
  ipcMain.handle('category:get-all', async (event, includeInactive: boolean = false) => {
    // console.log('[IPC] ========== CATEGORY:GET-ALL CALLED ==========');
    // console.log('[IPC] Include inactive:', includeInactive);
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      
      // Check if we should use server
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';
      
      // console.log('[IPC] Category fetch - Using:', useServer ? 'server' : 'local');
      
      // Use shared CategoryRepository for both online and offline modes
      const { CategoryRepository } = (await import('@monorepo/shared-data-access')) as any;
      const categoryRepository = new CategoryRepository(localDb, apiClient);
      
      const result = await categoryRepository.getCategories({
        includeInactive,
        useServer: useServer ? true : false,
      });
      
      return {
        success: result.success,
        categories: result.categories || [],
        error: result.error,
        isOffline: result.isOffline || false,
      };
    } catch (error) {
      // console.error('[IPC] category:get-all error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
        isOffline: true,
      };
    }
  });

  ipcMain.handle('category:get-by-id', async (event, categoryId: string) => {
    // console.log('[IPC] ========== CATEGORY:GET-BY-ID CALLED ==========');
    // console.log('[IPC] Category ID:', categoryId);
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      
      // Check if we should use server
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';
      
      // Use shared CategoryRepository for both online and offline modes
      const { CategoryRepository } = (await import('@monorepo/shared-data-access')) as any;
      const categoryRepository = new CategoryRepository(localDb, apiClient);
      
      const category = await categoryRepository.getCategoryById(categoryId, {
        useServer: useServer ? true : false,
      });
      
      if (category) {
        return {
          success: true,
          category,
        };
      }

      return {
        success: false,
        error: 'Category not found',
      };
    } catch (error) {
      // console.error('[IPC] category:get-by-id error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category',
      };
    }
  });

  // Customer handlers
  ipcMain.handle('customer:get-all', async () => {
    // console.log('[IPC] ========== CUSTOMER:GET-ALL CALLED ==========');
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      
      // Check if we should use server
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';
      
      // console.log('[IPC] Customer fetch - Using:', useServer ? 'server' : 'local');
      
      if (useServer) {
        // Fetch from API
        const response = await apiClient.get('/api/customers');
        
        // Handle different response formats: response.data or response.data.data
        const customersData = response.data?.data || response.data || [];
        
        if (response.success && Array.isArray(customersData)) {
          // Map database customer to UI customer format
          const customers = customersData.map((dbCustomer: any) => ({
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
        // Fetch from local SQLite database
        // console.log('[IPC] Fetching customers from local SQLite database');
        
        try {
          // Query all customers from local database
          const dbCustomers = await localDb.query<{
            id: string;
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string | null;
          }>('SELECT id, firstName, lastName, email, phone FROM Customer');
          
          if (!dbCustomers || dbCustomers.length === 0) {
            // console.log('[IPC] No customers found in local database');
            return {
              success: true,
              customers: [],
              isOffline: true,
            };
          }
          
          // Get addresses for all customers
          let addresses: Array<{
            id: string;
            customerId: string;
            street1: string;
            street2: string | null;
            city: string;
            state: string;
            postalCode: string;
            isDefault: number;
          }> = [];
          
          if (dbCustomers.length > 0) {
            const customerIds = dbCustomers.map(c => c.id);
            const placeholders = customerIds.map(() => '?').join(',');
            addresses = await localDb.query<{
              id: string;
              customerId: string;
              street1: string;
              street2: string | null;
              city: string;
              state: string;
              postalCode: string;
              isDefault: number;
            }>(`SELECT id, customerId, street1, street2, city, state, postalCode, isDefault 
                 FROM CustomerAddress 
                 WHERE customerId IN (${placeholders})`, 
                 customerIds);
          }
          
          // Group addresses by customer ID
          const addressesByCustomer = new Map<string, typeof addresses>();
          for (const address of addresses) {
            if (!addressesByCustomer.has(address.customerId)) {
              addressesByCustomer.set(address.customerId, []);
            }
            addressesByCustomer.get(address.customerId)!.push(address);
          }
          
          // Map to UI Customer format
          const customers = dbCustomers.map(dbCustomer => {
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
          
          // console.log('[IPC] ✓ Loaded', customers.length, 'customers from local database');
          
          return {
            success: true,
            customers,
            isOffline: true,
          };
        } catch (dbError) {
          // console.error('[IPC] Failed to fetch customers from local database:', dbError);
          return {
            success: false,
            error: dbError instanceof Error ? dbError.message : 'Failed to fetch customers from local database',
            isOffline: true,
          };
        }
      }
    } catch (error) {
      // console.error('[IPC] customer:get-all error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customers',
        isOffline: true,
      };
    }
  });

  ipcMain.handle('customer:create', async (_event, data: { name: string; email?: string; phone?: string; address?: string }) => {
    // console.log('[IPC] ========== CUSTOMER:CREATE CALLED ==========');
    // console.log('[IPC] Customer data:', data);

    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();

      // Check if we should use server
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';

      // console.log('[IPC] Customer create - Using:', useServer ? 'server' : 'local');

      if (useServer) {
        // Create via API
        const response = await apiClient.post('/api/customers', data);

        if (response.success && response.data) {
          const dbCustomer = response.data;
          const customer = {
            id: dbCustomer.id,
            name: `${dbCustomer.firstName || ''} ${dbCustomer.lastName || ''}`.trim(),
            email: dbCustomer.email || '',
            phone: dbCustomer.phone || '',
            address: dbCustomer.addresses?.[0]
              ? `${dbCustomer.addresses[0].street1 || ''}, ${dbCustomer.addresses[0].city || ''}, ${dbCustomer.addresses[0].state || ''} ${dbCustomer.addresses[0].postalCode || ''}`.trim()
              : '',
          };

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
        // Create in local SQLite database
        // console.log('[IPC] Creating customer in local SQLite database');

        try {
          // Parse name into first and last name
          const nameParts = data.name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Generate unique ID and customer code
          const customerId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          const customerCode = `CUST-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

          // Insert customer into database
          await localDb.execute(
            `INSERT INTO Customer (
              id, customerCode, firstName, lastName, email, phone,
              customerType, loyaltyPoints, lifetimeValue, totalSpent,
              createdAt, updatedAt, sync_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`,
            [
              customerId,
              customerCode,
              firstName,
              lastName,
              data.email || null,
              data.phone || null,
              'Regular',
              0,
              0,
              0,
              'pending'
            ]
          );

          // console.log('[IPC] ✓ Customer created in local database:', customerId);

          // Insert address if provided
          if (data.address && data.address.trim()) {
            const addressId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-addr`;

            // Parse address (simple parsing - in production you might want more sophisticated parsing)
            const addressParts = data.address.split(',').map(p => p.trim());
            const street1 = addressParts[0] || data.address;
            const city = addressParts[1] || 'Unknown';
            const state = addressParts[2] || 'Unknown';
            const postalCode = addressParts[3] || '00000';

            await localDb.execute(
              `INSERT INTO CustomerAddress (
                id, customerId, addressType, street1, city, state, postalCode, country,
                isDefault, createdAt, updatedAt, sync_status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`,
              [
                addressId,
                customerId,
                'Both',
                street1,
                city,
                state,
                postalCode,
                'US',
                1,
                'pending'
              ]
            );

            // console.log('[IPC] ✓ Customer address created in local database:', addressId);
          }

          const customer = {
            id: customerId,
            name: data.name,
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
          };

          return {
            success: true,
            customer,
            isOffline: true,
          };
        } catch (dbError) {
          // console.error('[IPC] Failed to create customer in local database:', dbError);
          return {
            success: false,
            error: dbError instanceof Error ? dbError.message : 'Failed to create customer in local database',
            isOffline: true,
          };
        }
      }
    } catch (error) {
      // console.error('[IPC] customer:create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer',
      };
    }
  });

  ipcMain.handle('customer:update', async (_event, id: string, data: { name: string; email?: string; phone?: string; address?: string }) => {
    // console.log('[IPC] ========== CUSTOMER:UPDATE CALLED ==========');
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const apiClient = dataAccessService.getApiClient();
      const response = await apiClient.put(`/api/customers/${id}`, data);
      
      if (response.success && response.data) {
        const dbCustomer = response.data;
        const customer = {
          id: dbCustomer.id,
          name: `${dbCustomer.firstName || ''} ${dbCustomer.lastName || ''}`.trim(),
          email: dbCustomer.email || '',
          phone: dbCustomer.phone || '',
          address: dbCustomer.addresses?.[0] 
            ? `${dbCustomer.addresses[0].street1 || ''}, ${dbCustomer.addresses[0].city || ''}, ${dbCustomer.addresses[0].state || ''} ${dbCustomer.addresses[0].postalCode || ''}`.trim()
            : '',
        };

        return {
          success: true,
          customer,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to update customer',
      };
    } catch (error) {
      // console.error('[IPC] customer:update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update customer',
      };
    }
  });

  ipcMain.handle('customer:delete', async (_event, id: string) => {
    // console.log('[IPC] ========== CUSTOMER:DELETE CALLED ==========');
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const apiClient = dataAccessService.getApiClient();
      const response = await apiClient.delete(`/api/customers/${id}`);
      
      return {
        success: response.success || false,
        error: response.error,
      };
    } catch (error) {
      // console.error('[IPC] customer:delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete customer',
      };
    }
  });

  // Product handlers
  ipcMain.handle('product:get-all', async (_event, options?: { page?: number; limit?: number }) => {
    // console.log('[IPC] ========== PRODUCT:GET-ALL CALLED ==========');
    // console.log('[IPC] Pagination options:', options);
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      
      // Check if we should use server
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';
      
      // console.log('[IPC] Product fetch - Using:', useServer ? 'server' : 'local');
      
      const page = options?.page || 1;
      const limit = options?.limit || 50;
      
      if (useServer) {
        // Fetch from API
        try {
          const apiUrl = `/api/products?includeVariants=false&includeInventory=false&page=${page}&limit=${limit}`;
          // console.log('[IPC] Fetching from API:', apiUrl);
          const response = await apiClient.get(apiUrl);
          
          // console.log('[IPC] API response structure:', {
          //   hasData: !!response.data?.data,
          //   hasProducts: !!response.data?.products,
          //   isArray: Array.isArray(response.data),
          //   keys: response.data ? Object.keys(response.data) : [],
          //   total: response.data?.total,
          //   meta: response.data?.meta,
          //   page: response.data?.page,
          //   limit: response.data?.limit,
          // });
          
          let products = response.data?.data || response.data?.products || (Array.isArray(response.data) ? response.data : []) || [];
          let total = response.data?.total || response.data?.meta?.total || response.data?.data?.total || (Array.isArray(response.data) ? response.data.length : products.length);
          const responseLimit = response.data?.limit || response.data?.meta?.limit || response.data?.data?.limit || limit;
          
          // If API returned more products than requested, apply client-side pagination
          if (products.length > limit && (!responseLimit || responseLimit !== limit)) {
            // console.warn('[IPC] API returned more products than requested, applying client-side pagination');
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            products = products.slice(startIndex, endIndex);
          }
          
          const totalPages = Math.ceil(total / limit);
          
          // console.log('[IPC] Product result from API:', {
          //   success: true,
          //   count: products.length,
          //   expected: limit,
          //   page,
          //   total,
          //   totalPages,
          //   isOffline: false,
          // });

          // Transform products to match Product interface
          const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
          const transformedProducts = products.map((p: any) => {
            // Handle image URL - prepend server URL if relative
            let imageUrl = p.imageUrl || p.image || null;
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `${SERVER_URL}/${imageUrl}`;
            }

            return {
              id: p.id,
              productNumber: p.productCode || p.sku || p.id,
              name: p.name,
              description: p.description,
              categoryId: p.categoryId,
              price: `$${(p.basePrice || p.price || 0).toFixed(2)}`,
              image: imageUrl,
              rating: undefined,
              reviewCount: undefined,
            };
          });

          // Sync products to local DB for offline access
          try {
            for (const product of products) {
              await localDb.execute(
                `INSERT OR REPLACE INTO product (id, productCode, name, description, categoryId, images, isActive, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  product.id,
                  product.productCode || product.sku || product.id,
                  product.name,
                  product.description || null,
                  product.categoryId || null,
                  JSON.stringify(product.imageUrl || product.image ? [product.imageUrl || product.image] : []),
                  product.isActive ? 1 : 0,
                  product.createdAt || new Date().toISOString(),
                  product.updatedAt || new Date().toISOString(),
                ]
              );
            }
            // console.log('[IPC] ✓ Products synced to local DB');
          } catch (syncError) {
            // console.warn('[IPC] ⚠️ Failed to sync products to local DB (non-fatal):', syncError);
          }

          return {
            success: true,
            products: transformedProducts,
            isOffline: false,
            pagination: {
              page: response.data?.page || response.data?.meta?.page || page,
              limit: responseLimit || limit,
              total,
              totalPages,
            },
          };
        } catch (apiError) {
          // console.warn('[IPC] API fetch failed, falling back to local:', apiError);
          // Fall through to local fetch
        }
      }

      // Fetch from local SQLite database with pagination
      // limit is already declared above, reuse it
      const offset = ((options?.page || 1) - 1) * limit;
      
      // console.log('[IPC] Local DB pagination:', { page: options?.page || 1, limit, offset });
      
      // First, get total count
      const countResult = await localDb.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM product WHERE isActive = 1`
      );
      const total = countResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);
      
      // console.log('[IPC] Total products in DB:', total, 'Total pages:', totalPages);

      // Use template literals for LIMIT and OFFSET since they're numbers (no SQL injection risk)
      const products = await localDb.query(
        `SELECT 
          id,
          productCode,
          name,
          description,
          categoryId,
          images,
          isActive,
          createdAt,
          updatedAt
        FROM product
        WHERE isActive = 1
        ORDER BY name ASC
        LIMIT ${limit} OFFSET ${offset}`
      );
      
      // console.log('[IPC] Products fetched from local DB:', products.length, 'Expected:', limit);

      // Transform to match Product interface
      const transformedProducts = products.map((p: any) => {
        // Parse images JSON array and get first image
        let imageUrl = null;
        try {
          const images = p.images ? JSON.parse(p.images) : [];
          imageUrl = Array.isArray(images) && images.length > 0 ? images[0] : null;
        } catch {
          imageUrl = null;
        }

        return {
          id: p.id,
          productNumber: p.productCode || p.id,
          name: p.name,
          description: p.description,
          categoryId: p.categoryId,
          price: '$0.00', // Price not stored in product table, would need to get from variants
          image: imageUrl,
          rating: undefined,
          reviewCount: undefined,
        };
      });

      // console.log('[IPC] Product result from local DB:', {
      //   success: true,
      //   count: transformedProducts.length,
      //   isOffline: true,
      //   pagination: {
      //     page: options?.page || 1,
      //     limit,
      //     total,
      //     totalPages,
      //   },
      // });

      return {
        success: true,
        products: transformedProducts,
        isOffline: true,
        pagination: {
          page: options?.page || 1,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      // console.error('[IPC] product:get-all error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
        products: [],
        isOffline: true,
      };
    }
  });

  ipcMain.handle('sync:get-status', async () => {
    try {
      if (!dataAccessService) {
        return { success: false, error: 'DataAccessService not initialized' };
      }

      return {
        success: true,
        isInProgress: dataAccessService.isSyncInProgress(),
        lastSyncTime: dataAccessService.getLastSyncTime(),
      };
    } catch (error) {
      // console.error('[IPC] Get sync status failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status',
      };
    }
  });

  // Product: get by ID handler
  ipcMain.handle('product:get-by-id', async (_event, productId: string) => {
    // console.log('[IPC] ========== PRODUCT:GET-BY-ID CALLED ==========');
    // console.log('[IPC] Product ID:', productId);
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';

      if (useServer) {
        // Fetch from API with variants and inventory
        // console.log('[IPC] Fetching product from API:', productId);
        try {
          const response = await apiClient.get<{ success: boolean; data?: any }>(
            `/api/products/${productId}?includeVariants=true&includeInventory=true`
          );

          if (response.success && response.data) {
            const apiProduct = response.data;
            
            // Map API product to ProductWithVariants format
            const product = {
              id: apiProduct.id,
              sku: apiProduct.productCode || apiProduct.sku || apiProduct.id,
              productCode: apiProduct.productCode,
              barcode: apiProduct.barcode,
              name: apiProduct.name,
              description: apiProduct.description,
              categoryId: apiProduct.categoryId,
              brandId: apiProduct.brandId,
              supplierId: apiProduct.supplierId,
              basePrice: parseFloat(apiProduct.basePrice || apiProduct.retailPrice || 0),
              costPrice: parseFloat(apiProduct.costPrice || apiProduct.cost || 0),
              taxCategoryId: apiProduct.taxCategoryId,
              productType: apiProduct.hasVariants ? 'Variable' : 'Simple',
              isActive: apiProduct.isActive ? 1 : 0,
              imageUrl: apiProduct.images?.[0] || apiProduct.image,
              tags: Array.isArray(apiProduct.tags) ? apiProduct.tags.join(',') : apiProduct.tags,
              createdAt: apiProduct.createdAt || new Date().toISOString(),
              updatedAt: apiProduct.updatedAt || new Date().toISOString(),
              variants: apiProduct.variants?.map((v: any) => ({
                id: v.id,
                productId: v.productId || productId,
                sku: v.sku || v.variantSku,
                name: v.variantName || v.name,
                attributes: v.options ? JSON.stringify(v.options) : undefined,
                price: parseFloat(v.retailPrice || v.price || 0),
                compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : undefined,
                costPrice: parseFloat(v.cost || v.costPrice || 0),
                isActive: v.isActive ? 1 : 0,
                imageUrl: v.image,
                createdAt: v.createdAt || new Date().toISOString(),
                updatedAt: v.updatedAt || new Date().toISOString(),
              })) || [],
              inventory: apiProduct.variants?.flatMap((v: any) => 
                (v.inventoryItems || []).map((inv: any) => ({
                  id: inv.id,
                  productVariantId: inv.productVariantId || v.id,
                  locationId: inv.locationId || inv.location?.id,
                  quantityAvailable: inv.quantityAvailable || 0,
                  quantityOnHand: inv.quantityOnHand || 0,
                  quantityReserved: inv.quantityCommitted || inv.quantityReserved || 0,
                  reorderPoint: inv.reorderPoint || 0,
                  reorderQuantity: inv.reorderQuantity || 0,
                  createdAt: inv.createdAt || new Date().toISOString(),
                  updatedAt: inv.updatedAt || new Date().toISOString(),
                }))
              ) || [],
            };

            // Save to local DB for offline access (non-blocking)
            // TODO: Implement saveProductToLocal similar to web app
            
            return {
              success: true,
              product,
              isOffline: false,
            };
          }

          return {
            success: false,
            error: 'Product not found',
            isOffline: false,
          };
        } catch (apiError) {
          // console.warn('[IPC] API fetch failed, falling back to local DB:', apiError);
          // Fall through to offline mode
        }
      }

      // Offline mode - fetch from local SQLite
      // console.log('[IPC] Fetching product from local SQLite:', productId);
      const products = await localDb.query<any>('SELECT * FROM Product WHERE id = ?', [productId]);
      
      if (products.length === 0) {
        return {
          success: false,
          error: 'Product not found',
          isOffline: true,
        };
      }

      const product = products[0];
      
      // Get variants
      const variants = await localDb.query<any>('SELECT * FROM ProductVariant WHERE productId = ?', [productId]);
      product.variants = variants;

      // Get inventory for each variant
      if (variants.length > 0) {
        const inventoryPromises = variants.map(async (v: any) => {
          const inventoryItems = await localDb.query<any>('SELECT * FROM InventoryItem WHERE variantId = ?', [v.id]);
          return inventoryItems.map((inv: any) => ({
            id: inv.id,
            productVariantId: inv.variantId || v.id,
            locationId: inv.locationId,
            quantityAvailable: inv.quantityAvailable || 0,
            quantityOnHand: inv.quantityOnHand || 0,
            quantityReserved: inv.quantityCommitted || inv.quantityReserved || 0,
            reorderPoint: inv.reorderPoint || 0,
            reorderQuantity: inv.reorderQuantity || 0,
            createdAt: inv.createdAt || new Date().toISOString(),
            updatedAt: inv.updatedAt || new Date().toISOString(),
          }));
        });
        const inventoryResults = await Promise.all(inventoryPromises);
        product.inventory = inventoryResults.flat();
      }

      return {
        success: true,
        product,
        isOffline: true,
      };
    } catch (error) {
      // console.error('[IPC] product:get-by-id error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
        isOffline: true,
      };
    }
  });

  ipcMain.handle('product:lookup-barcode', async (_event, barcode: string) => {
    // console.log('[IPC] product:lookup-barcode called:', barcode);
    if (!barcode) {
      return { success: false, error: 'Barcode is required' };
    }

    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const localDb = dataAccessService.getLocalDb();
      const trimmedBarcode = barcode.trim();

      // Try multiple search strategies
      const baseQuery = `
        SELECT
          pv.id AS variantId,
          pv.productId AS productId,
          pv.barcode AS variantBarcode,
          pv.sku AS variantSku,
          pv.variantName AS variantName,
          pv.retailPrice AS retailPrice,
          pv.wholesalePrice AS wholesalePrice,
          pv.cost AS cost,
          p.name AS productName,
          p.productCode AS productCode,
          p.trackInventory AS trackInventory,
          COALESCE(MAX(ii.quantityAvailable), MAX(ii.quantityOnHand)) AS availableQuantity,
          CASE WHEN MAX(ii.id) IS NOT NULL THEN 1 ELSE 0 END AS hasInventoryRecord
        FROM ProductVariant pv
        LEFT JOIN Product p ON p.id = pv.productId
        LEFT JOIN InventoryItem ii ON ii.variantId = pv.id
        WHERE UPPER(TRIM(pv.barcode)) = UPPER(?) OR UPPER(TRIM(pv.sku)) = UPPER(?) OR UPPER(TRIM(p.productCode)) = UPPER(?)
        GROUP BY pv.id, pv.productId, pv.barcode, pv.sku, pv.variantName, pv.retailPrice, pv.wholesalePrice, pv.cost, p.name, p.productCode, p.trackInventory
        LIMIT 1`;

      let rows = await localDb.query<any>(baseQuery, [trimmedBarcode, trimmedBarcode, trimmedBarcode]);

      if (!rows.length) {
        const fallbackQuery = `
          SELECT
            pv.id AS variantId,
            pv.productId AS productId,
            pv.barcode AS variantBarcode,
            pv.sku AS variantSku,
            pv.variantName AS variantName,
            pv.retailPrice AS retailPrice,
            pv.wholesalePrice AS wholesalePrice,
            pv.cost AS cost,
            p.name AS productName,
            p.productCode AS productCode,
            p.trackInventory AS trackInventory,
            COALESCE(MAX(ii.quantityAvailable), MAX(ii.quantityOnHand)) AS availableQuantity,
            CASE WHEN MAX(ii.id) IS NOT NULL THEN 1 ELSE 0 END AS hasInventoryRecord
          FROM Barcode b
          INNER JOIN ProductVariant pv ON pv.id = b.variantId
          LEFT JOIN Product p ON p.id = pv.productId
          LEFT JOIN InventoryItem ii ON ii.variantId = pv.id
          WHERE UPPER(TRIM(b.barcodeValue)) = UPPER(?)
          GROUP BY pv.id, pv.productId, pv.barcode, pv.sku, pv.variantName, pv.retailPrice, pv.wholesalePrice, pv.cost, p.name, p.productCode, p.trackInventory
          LIMIT 1`;

        rows = await localDb.query<any>(fallbackQuery, [trimmedBarcode]);
      }

      if (!rows.length) {
        // console.log('[IPC] product:lookup-barcode - No product found for barcode:', trimmedBarcode);
        return { success: false, error: 'Product not found' };
      }

      // console.log('[IPC] product:lookup-barcode - Found product:', rows[0]);

      const row = rows[0];
      const price =
        Number(row.retailPrice ?? row.wholesalePrice ?? row.cost ?? 0) || 0;

      // If product doesn't track inventory, return undefined for availableQuantity (unlimited)
      // Otherwise return the actual quantity from inventory
      const trackInventory = row.trackInventory === 1 || row.trackInventory === true;
      const hasInventoryRecord = row.hasInventoryRecord === 1 || row.hasInventoryRecord === true;
      
      // If tracking inventory but no inventory record exists, treat as unlimited (undefined)
      // Only use the actual quantity if an inventory record exists
      // Note: If availableQuantity is explicitly 0, we still return 0 (out of stock)
      // But if it's null/undefined (no record), we return undefined (unlimited)
      const availableQuantity = trackInventory
        ? (hasInventoryRecord && row.availableQuantity != null ? Number(row.availableQuantity) : undefined)
        : undefined; // undefined means unlimited stock
      
      // console.log('[IPC] product:lookup-barcode - Inventory check:', {
      //   trackInventory,
      //   hasInventoryRecord,
      //   rawAvailableQuantity: row.availableQuantity,
      //   finalAvailableQuantity: availableQuantity,
      // });

      return {
        success: true,
        product: {
          productId: row.productId,
          variantId: row.variantId,
          name: row.productName || row.variantName || 'Scanned item',
          price,
          availableQuantity,
          barcode: row.variantBarcode || barcode,
          trackInventory,
        },
      };
    } catch (error) {
      // console.error('[IPC] product:lookup-barcode failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lookup failed',
      };
    }
  });

  ipcMain.handle('order:get-by-number', async (_event, orderNumber: string) => {
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }
      if (!orderNumber) {
        throw new Error('Order number is required');
      }

      const { SalesOrderRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      const repository = new SalesOrderRepository(localDb, apiClient);
      const result = await repository.getOrderByNumber(orderNumber);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load order',
      };
    }
  });

  ipcMain.handle('order:get-variant-details', async (_event, variantId: string) => {
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }
      if (!variantId) {
        throw new Error('Variant ID is required');
      }

      const { SalesOrderRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      const repository = new SalesOrderRepository(localDb, apiClient);
      const result = await repository.getVariantDetails(variantId);
      return result;
    } catch (error) {
      return null;
    }
  });

  // === Order Handlers ===

  ipcMain.handle('order:create', async (_event, orderData) => {
    // console.log('[IPC] order:create called');
    try {
      const { SalesOrderRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();

      if (!localDb || !apiClient) {
        throw new Error('Database or API client not initialized');
      }

      const salesOrderRepo = new SalesOrderRepository(localDb, apiClient);
      const result = await salesOrderRepo.createOrder(orderData);

      // console.log('[IPC] order:create result:', { success: result.success, orderId: result.order?.id });
      return result;
    } catch (error) {
      // console.error('[IPC] order:create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      };
    }
  });

  ipcMain.handle('order:get-all', async (_event, options) => {
    // console.log('[IPC] order:get-all called');
    try {
      const { SalesOrderRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();

      if (!localDb || !apiClient) {
        throw new Error('Database or API client not initialized');
      }

      const salesOrderRepo = new SalesOrderRepository(localDb, apiClient);
      const result = await salesOrderRepo.getOrders(options);

      // console.log('[IPC] order:get-all result:', { success: result.success, count: result.orders?.length });
      return result;
    } catch (error) {
      // console.error('[IPC] order:get-all error:', error);
      return {
        success: false,
        orders: [],
        error: error instanceof Error ? error.message : 'Failed to get orders',
      };
    }
  });

  ipcMain.handle('order:park', async (_event, orderData) => {
    // console.log('[IPC] order:park called');
    try {
      const { ParkedOrderRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();

      if (!localDb || !apiClient) {
        throw new Error('Database or API client not initialized');
      }

      const parkedOrderRepo = new ParkedOrderRepository(localDb, apiClient);
      const result = await parkedOrderRepo.parkOrder(orderData);

      // console.log('[IPC] order:park result:', { success: result.success });
      return result;
    } catch (error) {
      // console.error('[IPC] order:park error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to park order',
      };
    }
  });

  ipcMain.handle('order:search-parked', async (_event, searchParams) => {
    // console.log('[IPC] order:search-parked called');
    try {
      const { ParkedOrderRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();

      if (!localDb || !apiClient) {
        throw new Error('Database or API client not initialized');
      }

      const parkedOrderRepo = new ParkedOrderRepository(localDb, apiClient);
      const result = await parkedOrderRepo.searchParkedOrders(searchParams);

      // console.log('[IPC] order:search-parked result:', { success: result.success, count: result.orders?.length });
      return result;
    } catch (error) {
      // console.error('[IPC] order:search-parked error:', error);
      return {
        success: false,
        orders: [],
        error: error instanceof Error ? error.message : 'Failed to search parked orders',
      };
    }
  });

  ipcMain.handle('order:load-parked', async (_event, parkNumber: string) => {
    // console.log('[IPC] order:load-parked called:', parkNumber);
    try {
      const { ParkedOrderRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();

      if (!localDb || !apiClient) {
        throw new Error('Database or API client not initialized');
      }

      const parkedOrderRepo = new ParkedOrderRepository(localDb, apiClient);
      const result = await parkedOrderRepo.loadParkedOrder(parkNumber);

      // console.log('[IPC] order:load-parked result:', { success: result.success });
      return result;
    } catch (error) {
      // console.error('[IPC] order:load-parked error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load parked order',
      };
    }
  });

  ipcMain.handle('order:complete-parked', async (_event, data) => {
    // console.log('[IPC] order:complete-parked called');
    try {
      const { ParkedOrderRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();

      if (!localDb || !apiClient) {
        throw new Error('Database or API client not initialized');
      }

      const parkedOrderRepo = new ParkedOrderRepository(localDb, apiClient);
      const result = await parkedOrderRepo.completeParkedOrder(data);

      // console.log('[IPC] order:complete-parked result:', { success: result.success });
      return result;
    } catch (error) {
      // console.error('[IPC] order:complete-parked error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete parked order',
      };
    }
  });

  ipcMain.handle('payment-method:get-all', async (_event, params) => {
    // console.log('[IPC] payment-method:get-all called');
    try {
      const { PaymentMethodRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();

      if (!localDb || !apiClient) {
        throw new Error('Database or API client not initialized');
      }

      const paymentMethodRepo = new PaymentMethodRepository(localDb, apiClient);
      const result = await paymentMethodRepo.getPaymentMethods(params);

      // console.log('[IPC] payment-method:get-all result:', { success: result.success, count: result.paymentMethods?.length });
      return result;
    } catch (error) {
      // console.error('[IPC] payment-method:get-all error:', error);
      return {
        success: false,
        paymentMethods: [],
        error: error instanceof Error ? error.message : 'Failed to get payment methods',
      };
    }
  });

  ipcMain.handle('sales-person:get-all', async (_event, params?: { search?: string; isActive?: boolean; limit?: number; offset?: number }) => {
    // console.log('[IPC] sales-person:get-all called');
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const { SalesPersonRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();

      const connectionState = dataAccessService.getConnectionState();
      const useServer = String(connectionState.dataSource).toLowerCase() === 'server';

      const repository = new SalesPersonRepository(localDb, apiClient);
      const result = await repository.getSalesPersons({
        ...(params || {}),
        useServer: useServer ? true : false,
      });

      return result;
    } catch (error) {
      // console.error('[IPC] sales-person:get-all error:', error);
      return {
        success: false,
        salesPersons: [],
        error: error instanceof Error ? error.message : 'Failed to get sales persons',
        isOffline: true,
      };
    }
  });

  // Database query handler for direct SQLite queries
  ipcMain.handle('db:query', async (_event, sql: string, params?: any[]) => {
    // console.log('[IPC] db:query called');
    try {
      const localDb = dataAccessService.getLocalDb();

      if (!localDb) {
        throw new Error('Database not initialized');
      }

      const result = await localDb.query(sql, params);
      // console.log('[IPC] db:query result:', { count: Array.isArray(result) ? result.length : 0 });
      return result;
    } catch (error) {
      // console.error('[IPC] db:query error:', error);
      throw error;
    }
  });

  // Print handler for silent printing
  ipcMain.handle('print-content', async (event, options) => {
    try {
      // console.log('[Print] Starting silent print...');
      
      // Check if printers are available before attempting to print
      // This prevents the "Save as PDF" dialog from appearing when no printer is connected
      const webContents = event.sender;
      let printers: Electron.PrinterInfo[] = [];
      let hasPrinters = false;
      
      try {
        printers = await webContents.getPrintersAsync();
        // Filter out virtual printers like "Microsoft Print to PDF" and "Save as PDF"
        const realPrinters = printers.filter(p => 
          !p.name.toLowerCase().includes('pdf') && 
          !p.name.toLowerCase().includes('save as') &&
          !p.name.toLowerCase().includes('microsoft print to pdf')
        );
        hasPrinters = realPrinters.length > 0;
      } catch (printerError) {
        // If getPrintersAsync fails, assume no printers
        // console.log('[Print] Could not get printers list');
        hasPrinters = false;
      }
      
      if (!hasPrinters) {
        // No real printers available - skip printing entirely
        // PDF is already saved, so just return success without printing
        // This prevents Windows from showing "Save as PDF" dialog
        // console.log('[Print] No real printers available, skipping print (PDF already saved)');
        return { success: false, printerMissing: true };
      }

      // Create a hidden window for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load the HTML content
      const htmlContent = options?.htmlContent || '';
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // Wait for content to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Print silently - ensure no dialogs appear
      const printOptions = {
        silent: true, // Force silent - no dialogs
        printBackground: options?.printBackground ?? true,
        deviceName: options?.deviceName || '',
        pages: '', // Print all pages
      };

      // console.log('[Print] Printing with options:', printOptions);

      return new Promise((resolve) => {
        // Attempt silent print - never show dialogs
        printWindow.webContents.print(printOptions, (success, failureReason) => {
          printWindow.close();
          
          // Always resolve - never reject to prevent any dialogs
          if (success) {
            // console.log('[Print] Print successful');
            resolve({ success: true });
          } else {
            // Print failed - but PDF is already saved, so just resolve silently
            // Don't show any dialogs or errors
            // console.log('[Print] Print failed (silent):', failureReason);
            resolve({ success: false, printerMissing: true });
          }
        });
      });
    } catch (error) {
      // console.error('[IPC] print-content error:', error);
      // Don't throw - just return failure to prevent any dialogs
      return { success: false, printerMissing: true };
    }
  });

  // Save PDF handler - automatically save receipt as PDF
  ipcMain.handle('save-pdf', async (event, options) => {
    try {
      const { htmlContent, orderId } = options;
      console.log('[IPC] save-pdf called with orderId:', orderId);
      if (!htmlContent || !orderId) {
        console.error('[IPC] save-pdf missing required fields:', { hasHtmlContent: !!htmlContent, hasOrderId: !!orderId });
        throw new Error('htmlContent and orderId are required');
      }

      // Create a hidden window for PDF generation
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load the HTML content
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // Wait for content to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate PDF for thermal printer (80mm width)
      console.log('[IPC] Generating PDF...');
      const pdfData = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
        pageSize: {
          width: 226.77, // 80mm in points (80mm * 2.83465 points/mm)
          height: 841.89, // 297mm in points (297mm * 2.83465 points/mm) - standard thermal roll length
        },
      });

      pdfWindow.close();
      
      if (!pdfData || pdfData.length === 0) {
        console.error('[IPC] PDF data is empty or invalid');
        return {
          success: false,
          error: 'PDF generation failed - no data generated',
        };
      }
      
      console.log('[IPC] PDF generated successfully, size:', pdfData.length, 'bytes');

      // Create directory structure: apps/desktop/assets/bills/YYYY-MM-DD/
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD
      
      // Find monorepo root directory
      let projectRoot = __dirname;
      const fs = require('fs');
      
      if (app.isPackaged) {
        // In production, use app directory
        projectRoot = process.resourcesPath ? join(process.resourcesPath, '..') : app.getAppPath();
      } else {
        // In development, find monorepo root
        // From dist/main/services -> dist/main -> dist -> apps/desktop -> monorepo
        let currentDir = __dirname; // dist/main/services
        let found = false;
        while (currentDir !== '/' && currentDir !== '\\' && !found) {
          const parentDir = join(currentDir, '..');
          const packageJsonPath = join(parentDir, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            // Check if this is the monorepo root by looking for apps/desktop
            const appsDesktopPath = join(parentDir, 'apps', 'desktop');
            if (fs.existsSync(appsDesktopPath)) {
              projectRoot = parentDir;
              found = true;
              break;
            }
          }
          currentDir = parentDir;
        }
        
        // Fallback: if we didn't find monorepo root, try to find apps/desktop
        if (!found) {
          currentDir = __dirname;
          while (currentDir !== '/' && currentDir !== '\\') {
            const parentDir = join(currentDir, '..');
            const appsDesktopPath = join(parentDir, 'apps', 'desktop');
            if (fs.existsSync(appsDesktopPath)) {
              projectRoot = parentDir;
              break;
            }
            currentDir = parentDir;
          }
        }
      }
      
      // Create apps/desktop/assets/bills/date directory
      const billsDir = join(projectRoot, 'apps', 'desktop', 'assets', 'bills', dateStr);
      
      // Ensure directory exists
      if (!fs.existsSync(billsDir)) {
        fs.mkdirSync(billsDir, { recursive: true });
      }

      // Sanitize orderId for filename (remove invalid characters)
      const sanitizedOrderId = String(orderId)
        .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 255); // Limit length
      
      // Save PDF file with order ID as filename
      const pdfPath = join(billsDir, `${sanitizedOrderId}.pdf`);
      
      // Ensure the directory exists before writing
      if (!fs.existsSync(billsDir)) {
        console.log('[IPC] Creating bills directory:', billsDir);
        fs.mkdirSync(billsDir, { recursive: true });
      }
      
      console.log('[IPC] Project root:', projectRoot);
      console.log('[IPC] Bills directory:', billsDir);
      console.log('[IPC] Order ID (original):', orderId);
      console.log('[IPC] Order ID (sanitized):', sanitizedOrderId);
      console.log('[IPC] Writing PDF to:', pdfPath);
      console.log('[IPC] PDF data size:', pdfData.length, 'bytes');
      
      try {
        fs.writeFileSync(pdfPath, pdfData);
        
        // Verify the file was written
        if (fs.existsSync(pdfPath)) {
          const stats = fs.statSync(pdfPath);
          console.log('[IPC] PDF saved successfully to:', pdfPath);
          console.log('[IPC] File size:', stats.size, 'bytes');
          return { success: true, path: pdfPath };
        } else {
          console.error('[IPC] PDF file was not created after write:', pdfPath);
          return {
            success: false,
            error: 'PDF file was not created',
          };
        }
      } catch (writeError) {
        console.error('[IPC] Error writing PDF file:', writeError);
        return {
          success: false,
          error: writeError instanceof Error ? writeError.message : 'Failed to write PDF file',
        };
      }
    } catch (error) {
      console.error('[IPC] save-pdf error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save PDF',
      };
    }
  });
}

async function createWindow() {
  const preloadPath = join(__dirname, '../preload/preload.js');
  // console.log('[Main] __dirname:', __dirname);
  // console.log('[Main] Preload path:', preloadPath);
  // console.log('[Main] Preload exists:', require('fs').existsSync(preloadPath));

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'PayFlow',
    icon: join(__dirname, '../../resources/icon.png'),
    autoHideMenuBar: true, // Hide menu bar (File, Edit, View, etc.)
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Enable DevTools in production for debugging
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    // console.error('[Window] Failed to load:', errorCode, errorDescription);
  });

  win.webContents.on('render-process-gone', (event, details) => {
    // console.error('[Window] Renderer process gone:', details.reason);
  });

  // Log preload script execution
  win.webContents.on('did-finish-load', () => {
    // console.log('[Window] Page finished loading');
  });

  win.webContents.on('dom-ready', () => {
    // console.log('[Window] DOM ready (preload should have executed by now)');
  });

  // Log console messages from preload and renderer
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Suppress DevTools Autofill errors (these are harmless Chrome DevTools warnings)
    if (typeof message === 'string' && (
      message.includes('Autofill.enable') ||
      message.includes('Autofill.setAddresses') ||
      message.includes("'Autofill.enable' wasn't found") ||
      message.includes("'Autofill.setAddresses' wasn't found")
    )) {
      return; // Ignore these DevTools errors
    }
    const levelStr = ['verbose', 'info', 'warning', 'error'][level] || 'log';
    // console.log(`[Renderer Console:${levelStr}] ${message}`);
  });

  if (isDev) {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (!rendererUrl) {
      throw new Error('ELECTRON_RENDERER_URL is not defined in development mode');
    }
    await win.loadURL(rendererUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const rendererPath = join(__dirname, '../renderer/index.html');
    // console.log('[Window] Loading renderer from:', rendererPath);
    await win.loadFile(rendererPath);
    // Enable DevTools in production for debugging white screen
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// Initialize app
app.whenReady().then(async () => {
  try {
    // Remove the default menu bar completely
    Menu.setApplicationMenu(null);

    // Initialize data access service
    await dataAccessService.initialize();

    setupIpcHandlers();
    await createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    // console.error('[App] Failed to initialize:', error);
    app.quit();
  }
});

// Close app when all windows are closed
app.on('window-all-closed', async () => {
  await dataAccessService.destroy();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app termination gracefully
process.on('SIGINT', () => {
  app.quit();
});

process.on('SIGTERM', () => {
  app.quit();
});
