/**
 * Data Source Manager
 *
 * Manages the switching between remote server and local database
 * based on connectivity status.
 *
 * Supports desktop, web, and mobile platforms.
 */

import {
  ConnectionStatus,
  DataSource,
  ConnectionState,
  ConnectivityConfig,
  ConnectivityCheckResult,
  ConnectionChangeCallback,
  DataSourceManager as IDataSourceManager,
} from '../types';
import { ConnectivityChecker } from './connectivity-checker';

export class DataSourceManager implements IDataSourceManager {
  private connectionState: ConnectionState;
  private connectivityChecker: ConnectivityChecker;
  private listeners: Set<ConnectionChangeCallback> = new Set();
  private autoSwitchEnabled: boolean = true;

  constructor(config?: Partial<ConnectivityConfig>) {
    // Get server URL from config, environment variable, or default
    const getServerUrl = (): string => {
      if (config?.serverUrl) {
        return config.serverUrl;
      }
      
      // Check for Node.js environment (desktop/mobile apps) first
      if (typeof process !== 'undefined' && process.env && process.env.SERVER_URL) {
        return process.env.SERVER_URL;
      }
      
      // Check for Vite environment (web apps)
      try {
        // @ts-ignore - import.meta.env is available in Vite but not in all TypeScript contexts
        const viteEnv = (import.meta as any)?.env;
        if (viteEnv) {
          return viteEnv.VITE_SERVER_URL || viteEnv.SERVER_URL || 'http://localhost:4000';
        }
      } catch {
        // import.meta not available in this context
      }
      
      // Fallback to default
      return 'http://localhost:4000';
    };
    
    const serverUrl = getServerUrl();

    this.connectionState = {
      status: ConnectionStatus.UNKNOWN,
      dataSource: DataSource.LOCAL, // Default to local for offline-first
      lastChecked: null,
      serverUrl,
    };

    this.connectivityChecker = new ConnectivityChecker(config);
  }

  /**
   * Initialize the data source manager
   * Starts periodic connectivity checks
   */
  async initialize(): Promise<void> {
    console.log('[DataSourceManager] Initializing...');
    console.log(`[DataSourceManager] Server URL: ${this.connectionState.serverUrl}`);

    // Perform initial connectivity check
    await this.checkConnectivity();

    // Start periodic checks
    this.connectivityChecker.startPeriodicCheck((result) => {
      this.handleConnectivityResult(result);
    });

    const statusEmoji = this.connectionState.status === ConnectionStatus.ONLINE ? '🟢' : 
                       this.connectionState.status === ConnectionStatus.OFFLINE ? '🔴' : '🟡';
    const sourceEmoji = this.connectionState.dataSource === DataSource.SERVER ? '🌐' : '💾';
    
    console.log(
      `[DataSourceManager] Initialized - ${statusEmoji} Status: ${this.connectionState.status}, ${sourceEmoji} Using: ${this.connectionState.dataSource}`
    );
  }

  /**
   * Check current connectivity status
   */
  async checkConnectivity(): Promise<ConnectivityCheckResult> {
    this.updateConnectionState({
      status: ConnectionStatus.CHECKING,
    });

    const result = await this.connectivityChecker.checkWithRetry();
    this.handleConnectivityResult(result);

    return result;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Manually switch data source
   */
  switchDataSource(source: DataSource): void {
    console.log(`[DataSourceManager] Manually switching to ${source}`);

    const previousSource = this.connectionState.dataSource;

    this.updateConnectionState({
      dataSource: source,
    });

    if (previousSource !== source) {
      this.notifyListeners();
    }
  }

  /**
   * Enable or disable automatic switching based on connectivity
   */
  setAutoSwitch(enabled: boolean): void {
    console.log(`[DataSourceManager] Auto-switch ${enabled ? 'enabled' : 'disabled'}`);
    this.autoSwitchEnabled = enabled;
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(callback: ConnectionChangeCallback): () => void {
    this.listeners.add(callback);

    // Immediately call with current state
    callback(this.getConnectionState());

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get the connectivity checker instance
   */
  getConnectivityChecker(): ConnectivityChecker {
    return this.connectivityChecker;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    console.log('[DataSourceManager] Destroying...');
    this.connectivityChecker.destroy();
    this.listeners.clear();
  }

  /**
   * Handle connectivity check results
   */
  private handleConnectivityResult(result: ConnectivityCheckResult): void {
    const newStatus = result.isOnline
      ? ConnectionStatus.ONLINE
      : ConnectionStatus.OFFLINE;

    const previousStatus = this.connectionState.status;
    const previousSource = this.connectionState.dataSource;

    // Update connection state
    this.updateConnectionState({
      status: newStatus,
      lastChecked: result.timestamp,
      error: result.error,
    });

    // Auto-switch data source if enabled
    if (this.autoSwitchEnabled) {
      const preferredSource = result.isOnline
        ? DataSource.SERVER
        : DataSource.LOCAL;

      if (this.connectionState.dataSource !== preferredSource) {
        this.updateConnectionState({
          dataSource: preferredSource,
        });
        console.log(
          `[DataSourceManager] Auto-switched to ${preferredSource} (${newStatus})`
        );
      }
    }

    // Notify listeners if state changed
    if (
      previousStatus !== newStatus ||
      previousSource !== this.connectionState.dataSource
    ) {
      this.notifyListeners();
    }

    // Log status changes
    if (previousStatus !== newStatus || previousSource !== this.connectionState.dataSource) {
      const statusEmoji = newStatus === ConnectionStatus.ONLINE ? '🟢' : 
                         newStatus === ConnectionStatus.OFFLINE ? '🔴' : '🟡';
      const sourceEmoji = this.connectionState.dataSource === DataSource.SERVER ? '🌐' : '💾';
      
      console.log(
        `[DataSourceManager] ${statusEmoji} Connection: ${previousStatus} → ${newStatus} | ${sourceEmoji} Data Source: ${previousSource} → ${this.connectionState.dataSource}`
      );
      if (result.latency) {
        console.log(`[DataSourceManager] Server latency: ${result.latency}ms`);
      }
      if (result.error && !result.isOnline) {
        console.log(`[DataSourceManager] Error: ${result.error}`);
      }
    }
  }

  /**
   * Update connection state
   */
  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = {
      ...this.connectionState,
      ...updates,
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const state = this.getConnectionState();
    this.listeners.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error('[DataSourceManager] Error in listener callback:', error);
      }
    });
  }
}

/**
 * Singleton instance
 */
let defaultManagerInstance: DataSourceManager | null = null;

export function getDataSourceManager(
  config?: Partial<ConnectivityConfig>
): DataSourceManager {
  if (!defaultManagerInstance) {
    defaultManagerInstance = new DataSourceManager(config);
  }
  return defaultManagerInstance;
}

export function resetDataSourceManager(): void {
  if (defaultManagerInstance) {
    defaultManagerInstance.destroy();
    defaultManagerInstance = null;
  }
}

