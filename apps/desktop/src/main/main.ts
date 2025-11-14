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
        console.warn('[IPC] DataAccessService not initialized, returning default state');
        return {
          status: 'unknown',
          dataSource: 'local',
          serverUrl: process.env.SERVER_URL || 'http://localhost:4000',
          lastChecked: null,
          error: 'DataAccessService not initialized',
        };
      }
      const state = dataAccessService.getConnectionState();
      console.log('[IPC] Raw connection state:', JSON.stringify(state, null, 2));
      console.log('[IPC] Status:', state.status, 'Type:', typeof state.status);
      console.log('[IPC] DataSource:', state.dataSource, 'Type:', typeof state.dataSource);
      
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
      console.log('[IPC] Serialized state:', JSON.stringify(serializedState, null, 2));
      return serializedState;
    } catch (error) {
      console.error('[IPC] connection:get-state error:', error);
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
      console.log('[IPC] connection:set-manual - Setting manual source to:', source);
      const { DataSource } = await import('@monorepo/shared-data-access');
      const dataSource = source === 'server' ? DataSource.SERVER : 
                        source === 'local' ? DataSource.LOCAL : null;
      await dataAccessService.setManualDataSource(dataSource);
      
      // Get updated state and return it
      const updatedState = dataAccessService.getConnectionState();
      console.log('[IPC] connection:set-manual - Updated state:', updatedState);
      
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
      console.error('[IPC] connection:set-manual error:', error);
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
      console.error('[IPC] connection:get-manual-override error:', error);
      return { enabled: false, dataSource: null };
    }
  });

  ipcMain.handle('connection:check', async () => {
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }
      console.log('[IPC] connection:check - Starting connectivity check...');
      const result = await dataAccessService.checkConnectivity();
      console.log('[IPC] connection:check - Result:', result);
      
      // Get updated state after check
      const updatedState = dataAccessService.getConnectionState();
      console.log('[IPC] connection:check - Updated state:', updatedState);
      
      return result;
    } catch (error) {
      console.error('[IPC] connection:check error:', error);
      throw error;
    }
  });

  // Auth handlers
  ipcMain.handle('auth:login', async (event, username: string, password: string) => {
    console.log('[IPC] ========== AUTH:LOGIN CALLED ==========');
    console.log('[IPC] Username:', username);
    console.log('[IPC] DataAccessService exists:', !!dataAccessService);
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const { UserRepository, DataSource, ConnectionStatus } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      
      console.log('[IPC] LocalDb exists:', !!localDb);
      console.log('[IPC] ApiClient exists:', !!apiClient);
      console.log('[IPC] ApiClient baseUrl:', (apiClient as any).config?.baseUrl || 'unknown');
      
      // For login, ALWAYS try server first, regardless of manual override
      // Manual override only affects data operations, not authentication
      // This ensures users can always log in when server is available
      const manualOverride = dataAccessService.getManualOverride();
      
      console.log('[IPC] Login - Server preference:', {
        manualOverride: manualOverride.enabled ? manualOverride.dataSource : 'auto',
        note: 'Login always tries server first (manual override only affects data operations)',
        willTryServer: true,
      });
      
      const userRepo = new UserRepository(localDb, apiClient);
      console.log('[IPC] UserRepository created, calling login...');
      
      // Always pass undefined to let UserRepository try server first
      // This ensures login works even if user has set manual override to local
      const result = await userRepo.login(
        { username, password },
        { useServer: undefined } // Always try server first for login
      );
      
      console.log('[IPC] Login result:', {
        success: result.success,
        hasUser: !!result.user,
        hasToken: !!result.token,
        isOffline: result.isOffline,
        error: result.error,
      });

      if (result.success && result.user) {
        // Trigger sync only if online login (has token)
        if (!result.isOffline && result.token) {
          try {
            // Initialize sync service with auth token
            // This will: set auth token, sync User table immediately, start full sync, and start periodic sync
            console.log('[IPC] Initializing sync service after successful login...');
            await dataAccessService.initializeSyncService(result.token);
            console.log('[IPC] Sync service initialized successfully');
          } catch (error) {
            console.warn('[IPC] Failed to initialize sync service after login:', error);
          }
        } else if (result.isOffline) {
          console.log('[IPC] Offline login successful - user can work offline');
        }
      }

      return result;
    } catch (error) {
      console.error('[IPC] auth:login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    try {
      if (dataAccessService) {
        // Stop sync service
        console.log('[IPC] Stopping sync service on logout...');
        await dataAccessService.stopSyncService();

        // Clear auth token
        dataAccessService.clearAuthToken();
        console.log('[IPC] Logout complete - sync stopped and token cleared');
      }
      return { success: true };
    } catch (error) {
      console.error('[IPC] auth:logout error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Logout failed' };
    }
  });

  // Sync handlers
  ipcMain.handle('sync:trigger-manual', async () => {
    try {
      if (!dataAccessService) {
        return { success: false, error: 'DataAccessService not initialized' };
      }

      console.log('[IPC] Manual sync triggered...');
      await dataAccessService.triggerManualSync();
      console.log('[IPC] Manual sync completed');

      return {
        success: true,
        lastSyncTime: dataAccessService.getLastSyncTime(),
      };
    } catch (error) {
      console.error('[IPC] Manual sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Manual sync failed',
      };
    }
  });

  // Category handlers
  ipcMain.handle('category:get-all', async (event, includeInactive: boolean = false) => {
    console.log('[IPC] ========== CATEGORY:GET-ALL CALLED ==========');
    console.log('[IPC] Include inactive:', includeInactive);
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const { CategoryRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      
      // Check if we should use server
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';
      
      console.log('[IPC] Category fetch - Using:', useServer ? 'server' : 'local');
      
      const categoryRepo = new CategoryRepository(localDb, apiClient);
      const result = await categoryRepo.getCategories({
        includeInactive,
        useServer: useServer ? true : false,
      });
      
      console.log('[IPC] Category result:', {
        success: result.success,
        count: result.categories?.length || 0,
        isOffline: result.isOffline,
      });

      return result;
    } catch (error) {
      console.error('[IPC] category:get-all error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      };
    }
  });

  ipcMain.handle('category:get-by-id', async (event, categoryId: string) => {
    console.log('[IPC] ========== CATEGORY:GET-BY-ID CALLED ==========');
    console.log('[IPC] Category ID:', categoryId);
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const { CategoryRepository } = await import('@monorepo/shared-data-access');
      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      
      // Check if we should use server
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';
      
      const categoryRepo = new CategoryRepository(localDb, apiClient);
      const category = await categoryRepo.getCategoryById(categoryId, {
        useServer: useServer ? true : false,
      });
      
      if (category) {
        return {
          success: true,
          category,
        };
      } else {
        return {
          success: false,
          error: 'Category not found',
        };
      }
    } catch (error) {
      console.error('[IPC] category:get-by-id error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category',
      };
    }
  });

  // Product handlers
  ipcMain.handle('product:get-all', async () => {
    console.log('[IPC] ========== PRODUCT:GET-ALL CALLED ==========');
    
    try {
      if (!dataAccessService) {
        throw new Error('DataAccessService not initialized');
      }

      const localDb = dataAccessService.getLocalDb();
      const apiClient = dataAccessService.getApiClient();
      
      // Check if we should use server
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';
      
      console.log('[IPC] Product fetch - Using:', useServer ? 'server' : 'local');
      
      if (useServer) {
        // Fetch from API
        try {
          const response = await apiClient.get('/api/products?includeVariants=false&includeInventory=false');
          const products = response.data?.data || response.data || [];
          
          console.log('[IPC] Product result from API:', {
            success: true,
            count: products.length,
            isOffline: false,
          });

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
            console.log('[IPC] ✓ Products synced to local DB');
          } catch (syncError) {
            console.warn('[IPC] ⚠️ Failed to sync products to local DB (non-fatal):', syncError);
          }

          return {
            success: true,
            products: transformedProducts,
            isOffline: false,
          };
        } catch (apiError) {
          console.warn('[IPC] API fetch failed, falling back to local:', apiError);
          // Fall through to local fetch
        }
      }

      // Fetch from local SQLite database
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
        ORDER BY name ASC`
      );

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

      console.log('[IPC] Product result from local DB:', {
        success: true,
        count: transformedProducts.length,
        isOffline: true,
      });

      return {
        success: true,
        products: transformedProducts,
        isOffline: true,
      };
    } catch (error) {
      console.error('[IPC] product:get-all error:', error);
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
      console.error('[IPC] Get sync status failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status',
      };
    }
  });

  // Print handler for silent printing
  ipcMain.handle('print-content', async (event, options) => {
    try {
      console.log('[Print] Starting silent print...');
      
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

      // Print silently
      const printOptions = {
        silent: options?.silent ?? true,
        printBackground: options?.printBackground ?? true,
        deviceName: options?.deviceName || '',
      };

      console.log('[Print] Printing with options:', printOptions);

      return new Promise((resolve, reject) => {
        printWindow.webContents.print(printOptions, (success, failureReason) => {
          printWindow.close();
          
          if (success) {
            console.log('[Print] Print successful');
            resolve({ success: true });
          } else {
            console.error('[Print] Print failed:', failureReason);
            reject(new Error(failureReason || 'Print failed'));
          }
        });
      });
    } catch (error) {
      console.error('[IPC] print-content error:', error);
      throw error;
    }
  });
}

async function createWindow() {
  const preloadPath = join(__dirname, '../preload/preload.js');
  console.log('[Main] __dirname:', __dirname);
  console.log('[Main] Preload path:', preloadPath);
  console.log('[Main] Preload exists:', require('fs').existsSync(preloadPath));

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
    console.error('[Window] Failed to load:', errorCode, errorDescription);
  });

  win.webContents.on('render-process-gone', (event, details) => {
    console.error('[Window] Renderer process gone:', details.reason);
  });

  // Log preload script execution
  win.webContents.on('did-finish-load', () => {
    console.log('[Window] Page finished loading');
  });

  win.webContents.on('dom-ready', () => {
    console.log('[Window] DOM ready (preload should have executed by now)');
  });

  // Log console messages from preload and renderer
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelStr = ['verbose', 'info', 'warning', 'error'][level] || 'log';
    console.log(`[Renderer Console:${levelStr}] ${message}`);
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
    console.log('[Window] Loading renderer from:', rendererPath);
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
    console.error('[App] Failed to initialize:', error);
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
