/**
 * Desktop Order Repositories
 *
 * Wraps Electron IPC calls to interact with orders via main process
 * Orders are stored in SQLite via the main process data-access service
 */

import type {
  SalesOrderRepository,
  ParkedOrderRepository,
  PaymentMethodRepository,
  CreateSalesOrderInput,
  SalesOrder,
  ParkedOrderListItem,
  PaymentMethod,
} from '@monorepo/shared-data-access';

/**
 * Desktop Sales Order Repository (IPC-based)
 */
export class DesktopSalesOrderRepository implements SalesOrderRepository {
  async createOrder(data: CreateSalesOrderInput, useServer: boolean = true): Promise<{
    success: boolean;
    order?: SalesOrder;
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.order) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.order.create(data);
      return result;
    } catch (error) {
      // console.error('[DesktopSalesOrderRepository] Error creating order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      };
    }
  }

  async getOrders(options?: { page?: number; limit?: number; locationId?: string; status?: string }): Promise<{
    success: boolean;
    orders?: SalesOrder[];
    total?: number;
    page?: number;
    totalPages?: number;
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.order) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.order.getAll(options);
      return result;
    } catch (error) {
      // console.error('[DesktopSalesOrderRepository] Error getting orders:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get orders',
      };
    }
  }
}

/**
 * Desktop Parked Order Repository (IPC-based)
 */
export class DesktopParkedOrderRepository implements ParkedOrderRepository {
  async parkOrder(data: any): Promise<{
    success: boolean;
    parkedOrder?: any;
    error?: string;
  }> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.order) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.order.park(data);
      return result;
    } catch (error) {
      // console.error('[DesktopParkedOrderRepository] Error parking order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to park order',
      };
    }
  }

  async searchParkedOrders(searchParams?: any): Promise<{
    success: boolean;
    orders?: ParkedOrderListItem[];
    error?: string;
  }> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.order) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.order.searchParked(searchParams);
      return result;
    } catch (error) {
      // console.error('[DesktopParkedOrderRepository] Error searching parked orders:', error);
      return {
        success: false,
        orders: [],
        error: error instanceof Error ? error.message : 'Failed to search parked orders',
      };
    }
  }

  async loadParkedOrder(parkNumber: string): Promise<{
    success: boolean;
    order?: any;
    error?: string;
  }> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.order) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.order.loadParked(parkNumber);
      return result;
    } catch (error) {
      // console.error('[DesktopParkedOrderRepository] Error loading parked order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load parked order',
      };
    }
  }

  async completeParkedOrder(data: any): Promise<{
    success: boolean;
    order?: any;
    error?: string;
  }> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.order) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.order.completeParked(data);
      return result;
    } catch (error) {
       // console.error('[DesktopParkedOrderRepository] Error completing parked order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete parked order',
      };
    }
  }
}

/**
 * Desktop Payment Method Repository (IPC-based)
 */
export class DesktopPaymentMethodRepository implements PaymentMethodRepository {
  async getPaymentMethods(params?: { isActive?: boolean }): Promise<{
    success: boolean;
    paymentMethods?: PaymentMethod[];
    error?: string;
  }> {
    try {
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.paymentMethod) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.paymentMethod.getAll(params);
      return result;
    } catch (error) {
      // console.error('[DesktopPaymentMethodRepository] Error getting payment methods:', error);
      return {
        success: false,
        paymentMethods: [],
        error: error instanceof Error ? error.message : 'Failed to get payment methods',
      };
    }
  }
}

/**
 * Get Desktop Sales Order Repository instance
 */
export function getDesktopSalesOrderRepository(): DesktopSalesOrderRepository {
  return new DesktopSalesOrderRepository();
}

/**
 * Get Desktop Parked Order Repository instance
 */
export function getDesktopParkedOrderRepository(): DesktopParkedOrderRepository {
  return new DesktopParkedOrderRepository();
}

/**
 * Get Desktop Payment Method Repository instance
 */
export function getDesktopPaymentMethodRepository(): DesktopPaymentMethodRepository {
  return new DesktopPaymentMethodRepository();
}
