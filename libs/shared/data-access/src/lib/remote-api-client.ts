/**
 * Remote API Client
 *
 * Handles communication with the remote server API.
 * Supports desktop, web, and mobile platforms.
 */

import { RemoteApiClient } from './types';

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
}

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

const DEFAULT_CONFIG: Required<Omit<ApiClientConfig, 'headers'>> & {
  headers: Record<string, string>;
} = {
  baseUrl: getServerUrl(),
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  retryAttempts: 3,
  retryDelay: 1000,
};

export class HttpApiClient implements RemoteApiClient {
  private config: Required<Omit<ApiClientConfig, 'headers'>> & {
    headers: Record<string, string>;
  };
  private isReady: boolean = false;

  constructor(config?: ApiClientConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      headers: {
        ...DEFAULT_CONFIG.headers,
        ...config?.headers,
      },
    };
  }

  /**
   * Check if the API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      console.log(`[HttpApiClient] Checking server availability at: ${this.config.baseUrl}/api/health`);
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      // Get fetch function (with fallback for Electron)
      let fetchFn: typeof fetch;
      if (typeof fetch === 'undefined') {
        try {
          const nodeFetch = await import('node-fetch');
          fetchFn = (nodeFetch as any).default || nodeFetch;
        } catch {
          console.warn('[HttpApiClient] fetch not available and node-fetch not found');
          return false;
        }
      } else {
        fetchFn = fetch;
      }

      const response = await fetchFn(`${this.config.baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const isAvailable = response.ok;
      console.log(`[HttpApiClient] Server availability check: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'} (status: ${response.status})`);
      return isAvailable;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[HttpApiClient] Server availability check failed:`, errorMsg);
      return false;
    }
  }

  /**
   * Initialize the API client
   */
  async initialize(): Promise<void> {
    const available = await this.isAvailable();
    if (!available) {
      console.warn(
        `[HttpApiClient] Server not available at ${this.config.baseUrl}`
      );
    }
    this.isReady = true;
    console.log(`[HttpApiClient] Initialized with base URL: ${this.config.baseUrl}`);
  }

  /**
   * Close/cleanup the API client
   */
  async close(): Promise<void> {
    this.isReady = false;
    console.log('[HttpApiClient] Closed');
  }

  /**
   * Perform a GET request
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>('GET', url);
  }

  /**
   * Perform a POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    console.log(`[HttpApiClient] POST request to: ${url}`, data ? { dataKeys: Object.keys(data as any) } : 'no data');
    return this.request<T>('POST', url, data);
  }

  /**
   * Perform a PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('PUT', url, data);
  }

  /**
   * Perform a DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('DELETE', url);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      headers: {
        ...this.config.headers,
        ...config.headers,
      },
    };
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string): void {
    this.config.headers['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authorization token
   */
  clearAuthToken(): void {
    delete this.config.headers['Authorization'];
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(
    endpoint: string,
    params?: Record<string, unknown>
  ): string {
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/')
      ? endpoint.slice(1)
      : endpoint;

    // Build base URL
    let url = `${this.config.baseUrl}/${cleanEndpoint}`;

    // Add query parameters if provided
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * Perform HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    url: string,
    data?: unknown
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(method, url, data);

        // Clone response for error parsing (response body can only be read once)
        const responseClone = response.clone();

        if (!response.ok) {
          // Try to parse error response body for more details
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const contentType = responseClone.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorBody = await responseClone.json();
              if (errorBody.error) {
                errorMessage = errorBody.error;
              } else if (errorBody.message) {
                errorMessage = errorBody.message;
              }
            }
          } catch (parseError) {
            // If parsing fails, use the default error message
            console.warn('[HttpApiClient] Failed to parse error response:', parseError);
          }
          
          const error = new Error(errorMessage);
          (error as any).status = response.status;
          (error as any).statusText = response.statusText;
          throw error;
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return (await response.text()) as any;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.warn(
          `[HttpApiClient] Request failed (attempt ${attempt}/${this.config.retryAttempts}):`,
          error
        );

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw error;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    method: string,
    url: string,
    data?: unknown
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      // Check if fetch is available (might not be in Electron main process)
      let fetchFn: typeof fetch;
      
      if (typeof fetch === 'undefined') {
        // Try to use node-fetch as fallback
        console.warn('[HttpApiClient] fetch is not available, attempting to use node-fetch...');
        try {
          const nodeFetch = await import('node-fetch');
          fetchFn = (nodeFetch as any).default || nodeFetch;
        } catch (importError) {
          throw new Error(`fetch not available and node-fetch import failed: ${importError instanceof Error ? importError.message : String(importError)}`);
        }
      } else {
        fetchFn = fetch;
      }

      const options: RequestInit = {
        method,
        headers: this.config.headers,
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      console.log(`[HttpApiClient] Making ${method} request to: ${url}`);
      const response = await fetchFn(url, options);
      console.log(`[HttpApiClient] Response status: ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[HttpApiClient] Fetch error for ${method} ${url}:`, errorMsg);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 */
let defaultApiClient: HttpApiClient | null = null;

export function getApiClient(config?: ApiClientConfig): HttpApiClient {
  if (!defaultApiClient) {
    defaultApiClient = new HttpApiClient(config);
  } else if (config) {
    defaultApiClient.updateConfig(config);
  }
  return defaultApiClient;
}

export function resetApiClient(): void {
  if (defaultApiClient) {
    defaultApiClient.close();
    defaultApiClient = null;
  }
}
