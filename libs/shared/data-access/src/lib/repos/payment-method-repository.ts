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
   * Get all payment methods
   */
  async getPaymentMethods(options: GetPaymentMethodsOptions = {}): Promise<GetPaymentMethodsResult> {
    const { isActive, useServer = true } = options;

    try {
      // Try server first if requested
      if (useServer) {
        try {
          const endpoint = '/api/payment-methods';
          const queryParams = new URLSearchParams();
          if (isActive !== undefined) {
            queryParams.append('isActive', isActive.toString());
          }

          const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;
          const response = await this.apiClient.get(url);

          if (response.success && response.data) {
            return {
              success: true,
              paymentMethods: response.data.paymentMethods || response.data,
              isOffline: false,
            };
          }
        } catch (serverError) {
          console.warn('[PaymentMethodRepository] Server fetch failed, falling back to local DB:', serverError);
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
      console.error('[PaymentMethodRepository] Error fetching payment methods:', error);
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
      // Try server first if requested
      if (useServer) {
        try {
          const response = await this.apiClient.get(`/api/payment-methods/${id}`);
          if (response.success && response.data) {
            return {
              success: true,
              paymentMethod: response.data.paymentMethod || response.data,
            };
          }
        } catch (serverError) {
          console.warn('[PaymentMethodRepository] Server fetch failed, falling back to local DB:', serverError);
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
      console.error('[PaymentMethodRepository] Error fetching payment method:', error);
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
      // Try server first if requested
      if (useServer) {
        try {
          const response = await this.apiClient.get(`/api/payment-methods/code/${code}`);
          if (response.success && response.data) {
            return {
              success: true,
              paymentMethod: response.data.paymentMethod || response.data,
            };
          }
        } catch (serverError) {
          console.warn('[PaymentMethodRepository] Server fetch failed, falling back to local DB:', serverError);
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
