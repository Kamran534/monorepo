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
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(`${this.config.baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
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

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
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
      const options: RequestInit = {
        method,
        headers: this.config.headers,
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      return response;
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
