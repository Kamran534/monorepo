/**
 * Web Data Access Service
 *
 * Integrates the shared data-access library with the web React app.
 * Manages connectivity and switches between server API and local IndexedDB.
 */

import {
  getDataSourceManager,
  createLocalDbClient,
  getApiClient,
  ConnectionStatus,
  DataSource,
  type ConnectionState,
  type LocalDbClient,
  type HttpApiClient,
} from '@monorepo/shared-data-access';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

/**
 * Settings stored in localStorage
 */
interface ConnectionSettings {
  manualOverride: boolean;
  preferredDataSource: DataSource | null;
}

const SETTINGS_KEY = 'connection-settings';

/**
 * Web Data Access Service
 *
 * Singleton service for managing data access in the web app
 */
class WebDataAccessService {
  private dataSourceManager: ReturnType<typeof getDataSourceManager>;
  private localDb: LocalDbClient | null = null;
  private apiClient: HttpApiClient | null = null;
  private isInitialized = false;
  private manualOverride = false;
  private preferredDataSource: DataSource | null = null;
  private stateChangeListeners: Set<(state: ConnectionState) => void> = new Set();

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
   * Load connection settings from localStorage
   */
  private loadSettings(): void {
    try {
      const settingsData = localStorage.getItem(SETTINGS_KEY);
      if (settingsData) {
        const settings: ConnectionSettings = JSON.parse(settingsData);
        this.manualOverride = settings.manualOverride || false;
        this.preferredDataSource = settings.preferredDataSource || null;
        console.log('[WebDataAccessService] Loaded settings:', {
          manualOverride: this.manualOverride,
          preferredDataSource: this.preferredDataSource,
        });
      }
    } catch (error) {
      console.warn('[WebDataAccessService] Failed to load settings:', error);
    }
  }

  /**
   * Save connection settings to localStorage
   */
  private saveSettings(): void {
    try {
      const settings: ConnectionSettings = {
        manualOverride: this.manualOverride,
        preferredDataSource: this.preferredDataSource,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      console.log('[WebDataAccessService] Settings saved:', settings);
    } catch (error) {
      console.error('[WebDataAccessService] Failed to save settings:', error);
    }
  }

  /**
   * Initialize the data access service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[WebDataAccessService] Already initialized');
      return;
    }

    console.log('[WebDataAccessService] Initializing...');
    console.log('[WebDataAccessService] Server URL:', SERVER_URL);
    console.log('[WebDataAccessService] Database: cpos_web_db');

    try {
      // Initialize local database (IndexedDB)
      // For now, we'll use a simple schema - can be extended later with full schema from schema.sql
      this.localDb = createLocalDbClient('web', {
        dbName: 'cpos_web_db',
        dbVersion: 1,
        schema: undefined, // Will use default schema for now
      });
      await this.localDb.initialize();
      console.log('[WebDataAccessService] Local database initialized');

      // Initialize API client
      this.apiClient = getApiClient({
        baseUrl: SERVER_URL,
        timeout: 30000,
      });
      await this.apiClient.initialize();
      console.log('[WebDataAccessService] API client initialized');

      // Initialize data source manager
      await this.dataSourceManager.initialize();
      console.log('[WebDataAccessService] Data source manager initialized');

      // Apply saved manual override if exists
      if (this.manualOverride && this.preferredDataSource) {
        this.dataSourceManager.setAutoSwitch(false);
        await this.dataSourceManager.checkConnectivity();
        this.dataSourceManager.switchDataSource(this.preferredDataSource);
        console.log(`[WebDataAccessService] Applied manual override: ${this.preferredDataSource}`);
      } else {
        this.dataSourceManager.setAutoSwitch(true);
        await this.dataSourceManager.checkConnectivity();
      }

      // Subscribe to connection changes
      this.dataSourceManager.onConnectionChange(this.handleConnectionChange);

      const initialState = this.dataSourceManager.getConnectionState();
      this.logConnectionStatus(initialState);

      this.isInitialized = true;
      console.log('[WebDataAccessService] Initialization complete');
    } catch (error) {
      console.error('[WebDataAccessService] Initialization failed:', error);
      throw error;
    }
  }

  getConnectionState(): ConnectionState {
    return this.dataSourceManager.getConnectionState();
  }

  getLocalDb(): LocalDbClient {
    if (!this.localDb) {
      throw new Error('Local database not initialized');
    }
    return this.localDb;
  }

  getApiClient(): HttpApiClient {
    if (!this.apiClient) {
      throw new Error('API client not initialized');
    }
    return this.apiClient;
  }

  getCurrentDataClient(): { source: DataSource; db?: LocalDbClient; api?: HttpApiClient } {
    const state = this.getConnectionState();

    if (state.dataSource === DataSource.SERVER) {
      return { source: DataSource.SERVER, api: this.apiClient || undefined };
    } else {
      return { source: DataSource.LOCAL, db: this.localDb || undefined };
    }
  }

  async checkConnectivity() {
    return await this.dataSourceManager.checkConnectivity();
  }

  onConnectionChange(callback: (state: ConnectionState) => void): () => void {
    this.stateChangeListeners.add(callback);
    callback(this.getConnectionState());

    return () => {
      this.stateChangeListeners.delete(callback);
    };
  }

  setAuthToken(token: string): void {
    this.apiClient?.setAuthToken(token);
  }

  clearAuthToken(): void {
    this.apiClient?.clearAuthToken();
  }

  async setManualDataSource(source: DataSource | null): Promise<void> {
    if (source === null) {
      this.manualOverride = false;
      this.preferredDataSource = null;
      this.dataSourceManager.setAutoSwitch(true);
      await this.dataSourceManager.checkConnectivity();
      console.log('[WebDataAccessService] Manual override disabled, auto-switch enabled');
    } else {
      this.manualOverride = true;
      this.preferredDataSource = source;
      this.dataSourceManager.setAutoSwitch(false);

      if (source === DataSource.SERVER) {
        console.log('[WebDataAccessService] Checking server connectivity before manual switch...');
        await this.dataSourceManager.checkConnectivity();
      }

      this.dataSourceManager.switchDataSource(source);
      console.log(`[WebDataAccessService] Manual override enabled: ${source}`);

      const updatedState = this.dataSourceManager.getConnectionState();
      this.handleConnectionChange(updatedState);
    }
    this.saveSettings();
  }

  getManualOverride(): { enabled: boolean; dataSource: DataSource | null } {
    return {
      enabled: this.manualOverride,
      dataSource: this.preferredDataSource,
    };
  }

  private handleConnectionChange = (state: ConnectionState): void => {
    this.logConnectionStatus(state);

    this.stateChangeListeners.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error('[WebDataAccessService] Error in listener callback:', error);
      }
    });
  };

  private logConnectionStatus(state: ConnectionState): void {
    const statusEmoji =
      state.status === ConnectionStatus.ONLINE
        ? '🟢'
        : state.status === ConnectionStatus.OFFLINE
        ? '🔴'
        : state.status === ConnectionStatus.CHECKING
        ? '🟡'
        : '⚪';

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
  }

  async destroy(): Promise<void> {
    console.log('[WebDataAccessService] Destroying...');

    if (this.localDb) {
      await this.localDb.close();
      this.localDb = null;
    }

    if (this.apiClient) {
      await this.apiClient.close();
      this.apiClient = null;
    }

    this.dataSourceManager.destroy();
    this.stateChangeListeners.clear();
    this.isInitialized = false;

    console.log('[WebDataAccessService] Destroyed');
  }
}

export const dataAccessService = new WebDataAccessService();
