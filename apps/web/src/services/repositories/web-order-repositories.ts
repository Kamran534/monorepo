/**
 * Web Order Repositories
 *
 * Wraps dataAccessService to interact with orders via IndexedDB
 * Orders are stored in IndexedDB via the data-access service
 */

import { dataAccessService } from '../data-access.service';
import {
  SalesOrderRepository,
  ParkedOrderRepository,
  PaymentMethodRepository,
  SalesPersonRepository,
  type CreateSalesOrderInput,
  type SalesOrder,
  type ParkedOrderListItem,
  type PaymentMethod,
  type SalesPerson,
  type ParkOrderInput,
  type ParkedOrder,
  type LoadParkedOrderData,
  type SearchParkedOrdersOptions,
} from '@monorepo/shared-data-access';

/**
 * Web Sales Order Repository (uses dataAccessService)
 */
export class WebSalesOrderRepository {
  private getRepository(): SalesOrderRepository {
    const localDb = dataAccessService.getLocalDb();
    const apiClient = dataAccessService.getApiClient();
    return new SalesOrderRepository(localDb, apiClient);
  }

  async createOrder(data: CreateSalesOrderInput, useServer = true): Promise<{
    success: boolean;
    order?: SalesOrder;
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      const repo = this.getRepository();
      const result = await repo.createOrder(data, useServer);
      return result;
    } catch (error) {
      // console.error('[WebSalesOrderRepository] Error creating order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      };
    }
  }

  async getOrderByNumber(orderNumber: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const repo = this.getRepository();
      const result = await repo.getOrderByNumber(orderNumber);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load order',
      };
    }
  }

  async getVariantDetails(variantId: string): Promise<{
    variantId: string;
    productId?: string;
    variantName?: string;
    productName?: string;
    sku?: string;
  } | null> {
    try {
      const repo = this.getRepository();
      const result = await repo.getVariantDetails(variantId);
      return result;
    } catch {
      return null;
    }
  }
}

/**
 * Web Parked Order Repository (uses dataAccessService)
 */
export class WebParkedOrderRepository {
  private getRepository(): ParkedOrderRepository {
    const localDb = dataAccessService.getLocalDb();
    const apiClient = dataAccessService.getApiClient();
    return new ParkedOrderRepository(localDb, apiClient);
  }

  async parkOrder(data: ParkOrderInput, useServer = true): Promise<{
    success: boolean;
    parkedOrder?: ParkedOrder;
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      const repo = this.getRepository();
      const result = await repo.parkOrder(data, useServer);
      return result;
    } catch (error) {
      // console.error('[WebParkedOrderRepository] Error parking order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to park order',
      };
    }
  }

  async searchParkedOrders(searchParams?: SearchParkedOrdersOptions): Promise<{
    success: boolean;
    orders?: ParkedOrderListItem[];
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      const repo = this.getRepository();
      const result = await repo.searchParkedOrders(searchParams);
      return {
        success: result.success,
        orders: result.parkedOrders,
        error: result.error,
        isOffline: result.isOffline,
      };
    } catch (error) {
      // console.error('[WebParkedOrderRepository] Error searching parked orders:', error);
      return {
        success: false,
        orders: [],
        error: error instanceof Error ? error.message : 'Failed to search parked orders',
      };
    }
  }

  async loadParkedOrder(parkNumber: string): Promise<{
    success: boolean;
    order?: LoadParkedOrderData;
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      const repo = this.getRepository();
      // First find the parked order by parkNumber
      const searchResult = await repo.searchParkedOrders({ searchTerm: parkNumber });
      if (!searchResult.success || !searchResult.parkedOrders || searchResult.parkedOrders.length === 0) {
        return {
          success: false,
          error: 'Parked order not found',
        };
      }

      const parkedOrder = searchResult.parkedOrders[0];
      const loadResult = await repo.loadParkedOrder(parkedOrder.id, searchResult.isOffline !== true);
      
      if (!loadResult.success || !loadResult.data) {
        return {
          success: false,
          error: loadResult.error || 'Failed to load parked order',
        };
      }

      return {
        success: true,
        order: loadResult.data,
        isOffline: loadResult.isOffline,
      };
    } catch (error) {
      // console.error('[WebParkedOrderRepository] Error loading parked order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load parked order',
      };
    }
  }

  async completeParkedOrder(data: { parkedOrderId?: string; id?: string }): Promise<{
    success: boolean;
    order?: LoadParkedOrderData;
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      const repo = this.getRepository();
      const parkedOrderId = data.parkedOrderId || data.id;
      if (!parkedOrderId) {
        return {
          success: false,
          error: 'Parked order ID is required',
        };
      }

      const result = await repo.completeParkedOrder(parkedOrderId, true);
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to complete parked order',
        };
      }

      // Reload the order to return it
      const loadResult = await repo.loadParkedOrder(parkedOrderId, false);
      return {
        success: true,
        order: loadResult.data,
        isOffline: loadResult.isOffline,
      };
    } catch (error) {
      // console.error('[WebParkedOrderRepository] Error completing parked order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete parked order',
      };
    }
  }
}

/**
 * Web Payment Method Repository (uses dataAccessService)
 */
export class WebPaymentMethodRepository {
  private getRepository(): PaymentMethodRepository {
    const localDb = dataAccessService.getLocalDb();
    const apiClient = dataAccessService.getApiClient();
    return new PaymentMethodRepository(localDb, apiClient);
  }

  async getPaymentMethods(params?: { isActive?: boolean }): Promise<{
    success: boolean;
    paymentMethods?: PaymentMethod[];
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      const repo = this.getRepository();
      const result = await repo.getPaymentMethods({ ...params, useServer: true });
      return result;
    } catch (error) {
      // console.error('[WebPaymentMethodRepository] Error getting payment methods:', error);
      return {
        success: false,
        paymentMethods: [],
        error: error instanceof Error ? error.message : 'Failed to get payment methods',
      };
    }
  }
}

/**
 * Web Sales Person Repository (uses dataAccessService)
 */
export class WebSalesPersonRepository {
  private getRepository(): SalesPersonRepository {
    const localDb = dataAccessService.getLocalDb();
    const apiClient = dataAccessService.getApiClient();
    return new SalesPersonRepository(localDb, apiClient);
  }

  async getSalesPersons(params?: { search?: string; isActive?: boolean; limit?: number; offset?: number }): Promise<{
    success: boolean;
    salesPersons?: SalesPerson[];
    total?: number;
    hasMore?: boolean;
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      const repo = this.getRepository();
      const result = await repo.getSalesPersons({ ...params, useServer: true });
      return result;
    } catch (error) {
      // console.error('[WebSalesPersonRepository] Error getting sales persons:', error);
      return {
        success: false,
        salesPersons: [],
        error: error instanceof Error ? error.message : 'Failed to get sales persons',
      };
    }
  }
}

/**
 * Get Web Sales Order Repository instance
 */
export function getWebSalesOrderRepository(): WebSalesOrderRepository {
  return new WebSalesOrderRepository();
}

/**
 * Get Web Parked Order Repository instance
 */
export function getWebParkedOrderRepository(): WebParkedOrderRepository {
  return new WebParkedOrderRepository();
}

/**
 * Get Web Payment Method Repository instance
 */
export function getWebPaymentMethodRepository(): WebPaymentMethodRepository {
  return new WebPaymentMethodRepository();
}

/**
 * Get Web Sales Person Repository instance
 */
export function getWebSalesPersonRepository(): WebSalesPersonRepository {
  return new WebSalesPersonRepository();
}

