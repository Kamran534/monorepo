/**
 * Payment Method Repository
 *
 * Handles fetching and managing payment methods
 * Works with both local DB (SQLite/IndexedDB) and server API
 */

import { LocalDbClient } from '../local-db-client';
import { RemoteApiClient } from '../types';

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: 'Cash' | 'Card' | 'BankTransfer' | 'Check' | 'GiftCard' | 'StoreCredit' | 'OnAccount';
  isActive: boolean;
  requiresAuthorization: boolean;
  icon?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetPaymentMethodsOptions {
  isActive?: boolean;
  useServer?: boolean;
}

export interface GetPaymentMethodsResult {
  success: boolean;
  paymentMethods?: PaymentMethod[];
  error?: string;
  isOffline?: boolean;
}

export class PaymentMethodRepository {
  constructor(
    private localDb: LocalDbClient,
    private apiClient: RemoteApiClient
  ) {}

  /**
   * Check if server is available by calling root URL (/)
   */
  private async checkServerAvailability(): Promise<boolean> {
    try {
      // Get fetch function (with fallback for Electron)
      let fetchFn: typeof fetch;
      if (typeof fetch === 'undefined') {
        try {
          const nodeFetch = await import('node-fetch');
          fetchFn = (nodeFetch as any).default || nodeFetch;
        } catch {
          return false;
        }
      } else {
        fetchFn = fetch;
      }

      // Get base URL from apiClient
      const baseUrl = (this.apiClient as any).config?.baseUrl || 'http://localhost:4000';
      
      // Check server by calling root URL
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      try {
        const response = await fetchFn(`${baseUrl}/`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok || response.status < 500; // Accept any non-server-error status
      } catch (error) {
        clearTimeout(timeoutId);
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all payment methods
   */
  async getPaymentMethods(options: GetPaymentMethodsOptions = {}): Promise<GetPaymentMethodsResult> {
    const { isActive, useServer = true } = options;

    try {
      // Check server availability first if useServer is true
      let shouldUseServer = useServer;
      if (useServer) {
        const isServerAvailable = await this.checkServerAvailability();
        if (!isServerAvailable) {
          // console.log('[PaymentMethodRepository] Server is not available, using local DB');
          shouldUseServer = false;
        }
      }

      // Try server first if requested and available
      if (shouldUseServer) {
        try {
          const endpoint = '/api/payment-methods';
          const queryParams = new URLSearchParams();
          if (isActive !== undefined) {
            queryParams.append('isActive', isActive.toString());
          }

          const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;
          const response = await this.apiClient.get<{ success: boolean; data?: { paymentMethods?: PaymentMethod[] } | PaymentMethod[] }>(url);

          if (response.success && response.data) {
            return {
              success: true,
              paymentMethods: (response.data as any).paymentMethods || response.data,
              isOffline: false,
            };
          }
        } catch (serverError) {
          // console.warn('[PaymentMethodRepository] Server fetch failed, falling back to local DB:', serverError);
        }
      }

      // Fallback to local DB
      const query = isActive !== undefined
        ? 'SELECT * FROM PaymentMethod WHERE isActive = ? ORDER BY sortOrder ASC'
        : 'SELECT * FROM PaymentMethod ORDER BY sortOrder ASC';

      const params = isActive !== undefined ? [isActive ? 1 : 0] : undefined;
      const results = await this.localDb.query(query, params);

      return {
        success: true,
        paymentMethods: results.map(this.mapPaymentMethod),
        isOffline: true,
      };
    } catch (error: any) {
      // console.error('[PaymentMethodRepository] Error fetching payment methods:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment methods',
      };
    }
  }

  /**
   * Get payment method by ID
   */
  async getPaymentMethodById(id: string, useServer = true): Promise<{ success: boolean; paymentMethod?: PaymentMethod; error?: string }> {
    try {
      // Check server availability first if useServer is true
      let shouldUseServer = useServer;
      if (useServer) {
        const isServerAvailable = await this.checkServerAvailability();
        if (!isServerAvailable) {
          shouldUseServer = false;
        }
      }

      // Try server first if requested and available
      if (shouldUseServer) {
        try {
          const response = await this.apiClient.get<{ success: boolean; data?: { paymentMethod?: PaymentMethod } | PaymentMethod }>(`/api/payment-methods/${id}`);
          if (response.success && response.data) {
            return {
              success: true,
              paymentMethod: (response.data as any).paymentMethod || response.data,
            };
          }
        } catch (serverError) {
          // console.warn('[PaymentMethodRepository] Server fetch failed, falling back to local DB:', serverError);
        }
      }

      // Fallback to local DB
      const results = await this.localDb.query(
        'SELECT * FROM PaymentMethod WHERE id = ?',
        [id]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: 'Payment method not found',
        };
      }

      return {
        success: true,
        paymentMethod: this.mapPaymentMethod(results[0]),
      };
    } catch (error: any) {
      // console.error('[PaymentMethodRepository] Error fetching payment method:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment method',
      };
    }
  }

  /**
   * Get payment method by code
   */
  async getPaymentMethodByCode(code: string, useServer = true): Promise<{ success: boolean; paymentMethod?: PaymentMethod; error?: string }> {
    try {
      // Check server availability first if useServer is true
      let shouldUseServer = useServer;
      if (useServer) {
        const isServerAvailable = await this.checkServerAvailability();
        if (!isServerAvailable) {
          shouldUseServer = false;
        }
      }

      // Try server first if requested and available
      if (shouldUseServer) {
        try {
          const response = await this.apiClient.get<{ success: boolean; data?: { paymentMethod?: PaymentMethod } | PaymentMethod }>(`/api/payment-methods/code/${code}`);
          if (response.success && response.data) {
            return {
              success: true,
              paymentMethod: (response.data as any).paymentMethod || response.data,
            };
          }
        } catch (serverError) {
          // console.warn('[PaymentMethodRepository] Server fetch failed, falling back to local DB:', serverError);
        }
      }

      // Fallback to local DB
      const results = await this.localDb.query(
        'SELECT * FROM PaymentMethod WHERE code = ?',
        [code]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: 'Payment method not found',
        };
      }

      return {
        success: true,
        paymentMethod: this.mapPaymentMethod(results[0]),
      };
    } catch (error: any) {
      console.error('[PaymentMethodRepository] Error fetching payment method:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment method',
      };
    }
  }

  /**
   * Map database row to PaymentMethod interface
   */
  private mapPaymentMethod(row: any): PaymentMethod {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      isActive: Boolean(row.isActive),
      requiresAuthorization: Boolean(row.requiresAuthorization),
      icon: row.icon,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
