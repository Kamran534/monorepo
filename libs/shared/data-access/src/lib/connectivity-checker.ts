/**
 * Connectivity Checker Service
 *
 * Checks if the server is online by attempting to reach a health endpoint.
 * Supports desktop, web, and mobile platforms.
 */

import {
  ConnectivityConfig,
  ConnectivityCheckResult,
  ConnectionStatus,
} from './types';

/**
 * Get server URL from environment variable
 * Supports both Node.js (process.env) and Vite (import.meta.env) environments
 */
function getServerUrl(): string {
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
}

const DEFAULT_CONFIG: Required<ConnectivityConfig> = {
  serverUrl: getServerUrl(),
  checkInterval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

export class ConnectivityChecker {
  private config: Required<ConnectivityConfig>;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private lastCheckResult: ConnectivityCheckResult | null = null;

  constructor(config?: Partial<ConnectivityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Perform a single connectivity check
   */
  async checkConnectivity(): Promise<ConnectivityCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.serverUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      if (response.ok) {
        this.lastCheckResult = {
          isOnline: true,
          latency,
          timestamp,
        };
        return this.lastCheckResult;
      } else {
        this.lastCheckResult = {
          isOnline: false,
          latency,
          error: `Server returned status ${response.status}`,
          timestamp,
        };
        return this.lastCheckResult;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.lastCheckResult = {
        isOnline: false,
        error: errorMessage,
        timestamp,
      };
      return this.lastCheckResult;
    }
  }

  /**
   * Check connectivity with retry logic
   */
  async checkWithRetry(): Promise<ConnectivityCheckResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      const result = await this.checkConnectivity();

      if (result.isOnline) {
        return result;
      }

      lastError = result.error;

      // Don't wait after the last attempt
      if (attempt < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay);
      }
    }

    return {
      isOnline: false,
      error: lastError || 'Failed after retries',
      timestamp: new Date(),
    };
  }

  /**
   * Start periodic connectivity checks
   */
  startPeriodicCheck(
    callback: (result: ConnectivityCheckResult) => void
  ): void {
    // Clear any existing interval
    this.stopPeriodicCheck();

    // Perform immediate check
    this.checkConnectivity().then(callback);

    // Set up periodic checks
    this.checkIntervalId = setInterval(async () => {
      const result = await this.checkConnectivity();
      callback(result);
    }, this.config.checkInterval);
  }

  /**
   * Stop periodic connectivity checks
   */
  stopPeriodicCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Get the last check result
   */
  getLastCheckResult(): ConnectivityCheckResult | null {
    return this.lastCheckResult;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConnectivityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ConnectivityConfig> {
    return { ...this.config };
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopPeriodicCheck();
    this.lastCheckResult = null;
  }
}

/**
 * Create a singleton instance
 */
let defaultInstance: ConnectivityChecker | null = null;

export function getConnectivityChecker(
  config?: Partial<ConnectivityConfig>
): ConnectivityChecker {
  if (!defaultInstance) {
    defaultInstance = new ConnectivityChecker(config);
  } else if (config) {
    defaultInstance.updateConfig(config);
  }
  return defaultInstance;
}

export function resetConnectivityChecker(): void {
  if (defaultInstance) {
    defaultInstance.destroy();
    defaultInstance = null;
  }
}
