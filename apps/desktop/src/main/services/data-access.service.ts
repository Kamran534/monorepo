/**
 * Desktop Data Access Service
 *
 * Integrates the shared data-access library with the desktop Electron app.
 * Manages connectivity and switches between server API and local SQLite database.
 */

import path from 'path';
import { app } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import {
  getDataSourceManager,
  createLocalDbClient,
  getApiClient,
  ConnectionStatus,
  DataSource,
  SyncService,
  type ConnectionState,
  type LocalDbClient,
  type HttpApiClient,
} from '@monorepo/shared-data-access';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';

// Get the database path - use libsdb folder in the app directory
// In development: apps/desktop/libsdb/cpos.db
// In production: [app path]/libsdb/cpos.db
function getDbPath(): string {
  if (app.isPackaged) {
    // In production, use the app's directory
    return path.join(process.resourcesPath, '..', 'libsdb', 'cpos.db');
  } else {
    // In development, use the project's libsdb folder
    // __dirname in dist/main points to dist/main/services
    // We need to go up to apps/desktop level
    // From dist/main/services -> dist/main -> dist -> apps/desktop
    const currentDir = __dirname; // dist/main/services
    const distMainDir = path.dirname(currentDir); // dist/main
    const distDir = path.dirname(distMainDir); // dist
    const appsDir = path.dirname(distDir); // apps (or monorepo root)
    // Try to find apps/desktop or monorepo/apps/desktop
    const desktopDir = path.join(appsDir, 'apps', 'desktop');
    if (existsSync(desktopDir)) {
      return path.join(desktopDir, 'libsdb', 'cpos.db');
    }
    // Fallback: try apps/desktop directly
    const desktopDirAlt = path.join(appsDir, 'desktop');
    if (existsSync(desktopDirAlt)) {
      return path.join(desktopDirAlt, 'libsdb', 'cpos.db');
    }
    // Last resort: use userData directory
    return path.join(app.getPath('userData'), 'libsdb', 'cpos.db');
  }
}

const DB_PATH = getDbPath();
const DB_DIR = path.dirname(DB_PATH);
const SETTINGS_PATH = path.join(app.getPath('userData'), 'connection-settings.json');

interface ConnectionSettings {
  manualOverride: boolean;
  preferredDataSource: DataSource | null;
}

class DataAccessService {
  private dataSourceManager: ReturnType<typeof getDataSourceManager>;
  private localDb: LocalDbClient | null = null;
  private apiClient: HttpApiClient | null = null;
  private syncService: SyncService | null = null;
  private isInitialized = false;
  private manualOverride = false;
  private preferredDataSource: DataSource | null = null;

  constructor() {
    this.dataSourceManager = getDataSourceManager({
      serverUrl: SERVER_URL,
      checkInterval: 30000, // Check every 30 seconds
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
    });
    
    // Load saved connection settings
    this.loadSettings();
  }

  /**
   * Load connection settings from persistent storage
   */
  private loadSettings(): void {
    try {
      if (existsSync(SETTINGS_PATH)) {
        const settingsData = readFileSync(SETTINGS_PATH, 'utf-8');
        const settings: ConnectionSettings = JSON.parse(settingsData);
        this.manualOverride = settings.manualOverride || false;
        this.preferredDataSource = settings.preferredDataSource || null;
        console.log('[DataAccessService] Loaded settings:', { manualOverride: this.manualOverride, preferredDataSource: this.preferredDataSource });
      }
    } catch (error) {
      console.warn('[DataAccessService] Failed to load settings:', error);
    }
  }

  /**
   * Save connection settings to persistent storage
   */
  private saveSettings(): void {
    try {
      const settings: ConnectionSettings = {
        manualOverride: this.manualOverride,
        preferredDataSource: this.preferredDataSource,
      };
      const settingsJson = JSON.stringify(settings, null, 2);
      writeFileSync(SETTINGS_PATH, settingsJson, 'utf-8');
      console.log('[DataAccessService] Settings saved:', settings);
    } catch (error) {
      console.error('[DataAccessService] Failed to save settings:', error);
    }
  }

  /**
   * Initialize the data access service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[DataAccessService] Already initialized');
      return;
    }

    console.log('[DataAccessService] Initializing...');
    console.log('[DataAccessService] Server URL:', SERVER_URL);
    console.log('[DataAccessService] Database Path:', DB_PATH);

    try {
      // Ensure database directory exists
      if (!existsSync(DB_DIR)) {
        console.log(`[DataAccessService] Creating database directory: ${DB_DIR}`);
        mkdirSync(DB_DIR, { recursive: true });
      }

      // Initialize local database
      this.localDb = createLocalDbClient('desktop', {
        dbPath: DB_PATH,
      });
      await this.localDb.initialize();
      console.log('[DataAccessService] Local database initialized');

      // Initialize API client
      this.apiClient = getApiClient({
        baseUrl: SERVER_URL,
        timeout: 30000,
      });
      await this.apiClient.initialize();
      console.log('[DataAccessService] API client initialized');

      // Initialize data source manager
      await this.dataSourceManager.initialize();
      console.log('[DataAccessService] Data source manager initialized');

      // Apply saved manual override if exists
      if (this.manualOverride && this.preferredDataSource) {
        this.dataSourceManager.setAutoSwitch(false);
        // Still check connectivity to update status, even with manual override
        await this.dataSourceManager.checkConnectivity();
        this.dataSourceManager.switchDataSource(this.preferredDataSource);
        console.log(`[DataAccessService] Applied manual override: ${this.preferredDataSource}`);
      } else {
        // If no manual override, ensure auto-switch is enabled and check connectivity
        this.dataSourceManager.setAutoSwitch(true);
        await this.dataSourceManager.checkConnectivity();
      }

      // Subscribe to connection changes
      this.dataSourceManager.onConnectionChange(this.handleConnectionChange);

      // Log initial connection status
      const initialState = this.dataSourceManager.getConnectionState();
      this.logConnectionStatus(initialState);

      this.isInitialized = true;
      console.log('[DataAccessService] Initialization complete');
    } catch (error) {
      console.error('[DataAccessService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.dataSourceManager.getConnectionState();
  }

  /**
   * Get local database client
   */
  getLocalDb(): LocalDbClient {
    if (!this.localDb) {
      throw new Error('Local database not initialized');
    }
    return this.localDb;
  }

  /**
   * Get API client
   */
  getApiClient(): HttpApiClient {
    if (!this.apiClient) {
      throw new Error('API client not initialized');
    }
    return this.apiClient;
  }

  /**
   * Get the appropriate data client based on current connection state
   */
  getCurrentDataClient(): { source: DataSource; db?: LocalDbClient; api?: HttpApiClient } {
    const state = this.getConnectionState();

    if (state.dataSource === DataSource.SERVER) {
      return { source: DataSource.SERVER, api: this.apiClient || undefined };
    } else {
      return { source: DataSource.LOCAL, db: this.localDb || undefined };
    }
  }

  /**
   * Manually check connectivity
   */
  async checkConnectivity() {
    return await this.dataSourceManager.checkConnectivity();
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(callback: (state: ConnectionState) => void): () => void {
    return this.dataSourceManager.onConnectionChange(callback);
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string): void {
    this.apiClient?.setAuthToken(token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.apiClient?.clearAuthToken();
  }

  /**
   * Manually set data source (override automatic switching)
   */
  async setManualDataSource(source: DataSource | null): Promise<void> {
    if (source === null) {
      // Disable manual override, enable auto-switch
      this.manualOverride = false;
      this.preferredDataSource = null;
      this.dataSourceManager.setAutoSwitch(true);
      // Check connectivity to auto-switch based on server availability
      await this.dataSourceManager.checkConnectivity();
      console.log('[DataAccessService] Manual override disabled, auto-switch enabled');
    } else {
      // Enable manual override
      this.manualOverride = true;
      this.preferredDataSource = source;
      this.dataSourceManager.setAutoSwitch(false);
      
      // If switching to server, check connectivity first to update status
      if (source === DataSource.SERVER) {
        console.log('[DataAccessService] Checking server connectivity before manual switch...');
        await this.dataSourceManager.checkConnectivity();
      }
      
      this.dataSourceManager.switchDataSource(source);
      console.log(`[DataAccessService] Manual override enabled: ${source}`);
      
      // Get the updated state and notify renderer
      const updatedState = this.dataSourceManager.getConnectionState();
      this.handleConnectionChange(updatedState);
    }
    this.saveSettings();
  }

  /**
   * Get manual override status
   */
  getManualOverride(): { enabled: boolean; dataSource: DataSource | null } {
    return {
      enabled: this.manualOverride,
      dataSource: this.preferredDataSource,
    };
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionChange = (state: ConnectionState): void => {
    this.logConnectionStatus(state);

    // Notify renderer process via IPC
    try {
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Serialize the state for IPC
        const serializedState = {
          status: String(state.status).toLowerCase(),
          dataSource: String(state.dataSource).toLowerCase(),
          serverUrl: state.serverUrl,
          lastChecked: state.lastChecked ? state.lastChecked.toISOString() : null,
          error: state.error,
        };
        mainWindow.webContents.send('connection:state-changed', serializedState);
        console.log('[DataAccessService] Sent connection state change to renderer');
      }
    } catch (error) {
      // IPC notification is optional, don't fail if it doesn't work
      console.warn('[DataAccessService] Could not notify renderer of state change:', error);
    }
  };

  /**
   * Log connection status in a clear, visible format
   */
  private logConnectionStatus(state: ConnectionState): void {
    const statusEmoji = state.status === ConnectionStatus.ONLINE ? '🟢' : 
                       state.status === ConnectionStatus.OFFLINE ? '🔴' : 
                       state.status === ConnectionStatus.CHECKING ? '🟡' : '⚪';
    
    const dataSourceEmoji = state.dataSource === DataSource.SERVER ? '🌐' : '💾';
    const dataSourceText = state.dataSource === DataSource.SERVER ? 'SERVER' : 'LOCAL DB';
    
    console.log('\n' + '='.repeat(60));
    console.log(`${statusEmoji} [CONNECTION STATUS] ${statusEmoji}`);
    console.log(`   Status: ${state.status}`);
    console.log(`   Data Source: ${dataSourceEmoji} ${dataSourceText}`);
    console.log(`   Server URL: ${state.serverUrl}`);
    if (state.lastChecked) {
      console.log(`   Last Checked: ${state.lastChecked.toLocaleString()}`);
    }
    if (state.error) {
      console.log(`   Error: ${state.error}`);
    }
    console.log('='.repeat(60) + '\n');
  };

  /**
   * Initialize sync service after successful login
   */
  async initializeSyncService(authToken: string): Promise<void> {
    try {
      // Stop existing sync service if any
      if (this.syncService) {
        console.log('[DataAccessService] Stopping existing sync service...');
        this.syncService.stopPeriodicSync();
        await this.syncService.close();
      }

      if (!this.localDb || !this.apiClient) {
        throw new Error('Local DB and API client must be initialized before sync service');
      }

      // Set auth token
      this.apiClient.setAuthToken(authToken);

      console.log('[DataAccessService] Initializing sync service...');
      this.syncService = new SyncService(this.localDb, this.apiClient, {
        syncInterval: 3600000, // 1 hour
        batchSize: 100,
        retryAttempts: 3,
        retryDelay: 1000,
      });

      await this.syncService.initialize();
      console.log('[DataAccessService] Sync service initialized');

      // Sync User table immediately to get passwordHash for offline login
      console.log('[DataAccessService] Syncing User table immediately...');
      await this.syncService.syncUserTable().catch((error) => {
        console.error('[DataAccessService] User table sync failed:', error);
      });

      // Perform full sync in background
      console.log('[DataAccessService] Starting full sync in background...');
      this.syncService.syncAll().catch((error) => {
        console.error('[DataAccessService] Full sync failed:', error);
      });

      // Start periodic sync (every 1 hour)
      this.syncService.startPeriodicSync();
      console.log('[DataAccessService] Periodic sync started (interval: 1 hour)');
    } catch (error) {
      console.error('[DataAccessService] Failed to initialize sync service:', error);
      throw error;
    }
  }

  /**
   * Stop sync service (call on logout)
   */
  async stopSyncService(): Promise<void> {
    if (this.syncService) {
      console.log('[DataAccessService] Stopping sync service...');
      this.syncService.stopPeriodicSync();
      await this.syncService.close();
      this.syncService = null;
      console.log('[DataAccessService] Sync service stopped');
    }
  }

  /**
   * Get sync service instance
   */
  getSyncService(): SyncService | null {
    return this.syncService;
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.syncService?.isSyncInProgress() || false;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.syncService?.getLastSyncTime() || null;
  }

  /**
   * Manually trigger sync
   */
  async triggerManualSync(): Promise<void> {
    if (!this.syncService) {
      throw new Error('Sync service not initialized');
    }
    await this.syncService.syncAll();
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    console.log('[DataAccessService] Destroying...');

    // Stop sync service first
    await this.stopSyncService();

    if (this.localDb) {
      await this.localDb.close();
      this.localDb = null;
    }

    if (this.apiClient) {
      await this.apiClient.close();
      this.apiClient = null;
    }

    this.dataSourceManager.destroy();
    this.isInitialized = false;

    console.log('[DataAccessService] Destroyed');
  }
}

// Export singleton instance
export const dataAccessService = new DataAccessService();
