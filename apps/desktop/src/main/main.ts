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
