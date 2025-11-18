/**
 * Parked Order Repository
 *
 * Handles parking, loading, and managing parked orders
 * Works with both local DB (SQLite/IndexedDB) and server API
 */

import type { LocalDbClient } from '../types';
import { RemoteApiClient } from '../types';
import type { CreateSalesOrderInput, SalesOrder } from './sales-order-repository';

export interface ParkedOrder {
  id: string;
  parkNumber: string;
  customerId?: string;
  orderId: string;
  parkedAt: string;
  parkedBy: string;
  expiryDate?: string;
  notes?: string;
  createdAt: string;

  // Populated fields
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  order?: SalesOrder;
}

export interface ParkedOrderListItem {
  id: string;
  parkNumber: string;
  orderId: string;
  orderNumber: string;
  customerName?: string;
  customerId?: string;
  parkedAt: string;
  parkedBy: string;
  totalAmount: number;
  notes?: string;
}

export interface ParkOrderInput {
  orderId: string;
  parkedBy: string;
  customerId?: string;
  notes?: string;
  expiryDate?: string;
}

export interface SearchParkedOrdersOptions {
  searchTerm?: string; // Search by customer name or order number
  customerId?: string;
  parkedBy?: string;
  useServer?: boolean;
}

export interface GetParkedOrdersResult {
  success: boolean;
  parkedOrders?: ParkedOrderListItem[];
  error?: string;
  isOffline?: boolean;
}

export interface GetParkedOrderResult {
  success: boolean;
  parkedOrder?: ParkedOrder;
  error?: string;
  isOffline?: boolean;
}

export interface ParkOrderResult {
  success: boolean;
  parkedOrder?: ParkedOrder;
  error?: string;
  isOffline?: boolean;
}

export interface LoadParkedOrderCustomer {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface LoadParkedOrderData {
  parkedOrderId: string;
  order: SalesOrder;
  lineItems: any[];
  payments: any[];
  customer?: LoadParkedOrderCustomer;
}

export interface LoadParkedOrderResult {
  success: boolean;
  data?: LoadParkedOrderData;
  error?: string;
  isOffline?: boolean;
}

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export class ParkedOrderRepository {
  constructor(
    private localDb: LocalDbClient,
    private apiClient: RemoteApiClient
  ) {}

  /**
   * Park an order for later completion
   */
  async parkOrder(input: ParkOrderInput, useServer = true): Promise<ParkOrderResult> {
    try {
      const parkedOrderId = this.generateId();
      const parkNumber = this.generateParkNumber();
      const now = new Date().toISOString();

      const parkedOrderData = {
        id: parkedOrderId,
        parkNumber,
        orderId: input.orderId,
        customerId: input.customerId || null,
        parkedBy: input.parkedBy,
        parkedAt: now,
        expiryDate: input.expiryDate || null,
        notes: input.notes || null,
        createdAt: now,
      };

      // Try server first if requested
      if (useServer) {
        try {
          const response = await this.apiClient.post<ApiResponse<ParkedOrder>>('/api/parked-orders', parkedOrderData);
          if (response.success && response.data) {
            // Also save to local DB
            await this.saveParkedOrderToLocalDb(response.data);

            // Update order status to Parked
            await this.updateOrderStatus(input.orderId, 'Parked');

            return {
              success: true,
              parkedOrder: response.data,
              isOffline: false,
            };
          }
        } catch (serverError) {
          console.warn('[ParkedOrderRepository] Server park failed, falling back to local DB:', serverError);
        }
      }

      // Fallback to local DB
      await this.saveParkedOrderToLocalDb(parkedOrderData);

      // Update order status to Parked
      await this.updateOrderStatus(input.orderId, 'Parked');

      return {
        success: true,
        parkedOrder: parkedOrderData as ParkedOrder,
        isOffline: true,
      };
    } catch (error: any) {
      console.error('[ParkedOrderRepository] Error parking order:', error);
      return {
        success: false,
        error: error.message || 'Failed to park order',
      };
    }
  }

  /**
   * Search parked orders
   */
  async searchParkedOrders(options: SearchParkedOrdersOptions = {}): Promise<GetParkedOrdersResult> {
    const { searchTerm, customerId, parkedBy, useServer = true } = options;

    try {
      // Try server first if requested
      if (useServer) {
        try {
          const queryParams = new URLSearchParams();
          if (searchTerm) queryParams.append('searchTerm', searchTerm);
          if (customerId) queryParams.append('customerId', customerId);
          if (parkedBy) queryParams.append('parkedBy', parkedBy);

          const url = `/api/parked-orders?${queryParams}`;
          const response = await this.apiClient.get<ApiResponse<{ parkedOrders?: ParkedOrderListItem[] } | ParkedOrderListItem[]>>(url);

          if (response.success && response.data) {
            const payload = Array.isArray(response.data)
              ? response.data
              : response.data.parkedOrders || [];
            return {
              success: true,
              parkedOrders: payload,
              isOffline: false,
            };
          }
        } catch (serverError) {
          console.warn('[ParkedOrderRepository] Server search failed, falling back to local DB:', serverError);
        }
      }

      // Fallback to local DB
      let query = `
        SELECT
          po.id,
          po.parkNumber,
          po.orderId,
          po.parkedAt,
          po.parkedBy,
          po.notes,
          so.orderNumber,
          so.totalAmount,
          so.customerId,
          CASE
            WHEN c.firstName IS NOT NULL THEN c.firstName || ' ' || c.lastName
            ELSE NULL
          END as customerName
        FROM ParkedOrder po
        INNER JOIN SaleOrder so ON po.orderId = so.id
        LEFT JOIN Customer c ON po.customerId = c.id
        WHERE so.status = 'Parked'
      `;

      const params: any[] = [];

      // Add search filter
      if (searchTerm) {
        query += ` AND (
          so.orderNumber LIKE ? OR
          c.firstName LIKE ? OR
          c.lastName LIKE ? OR
          (c.firstName || ' ' || c.lastName) LIKE ?
        )`;
        const searchPattern = `%${searchTerm}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (customerId) {
        query += ` AND po.customerId = ?`;
        params.push(customerId);
      }

      if (parkedBy) {
        query += ` AND po.parkedBy = ?`;
        params.push(parkedBy);
      }

      query += ` ORDER BY po.parkedAt DESC`;

      const results = await this.localDb.query(query, params.length > 0 ? params : undefined);

      const parkedOrders: ParkedOrderListItem[] = results.map((row: any) => ({
        id: row.id,
        parkNumber: row.parkNumber,
        orderId: row.orderId,
        orderNumber: row.orderNumber,
        customerName: row.customerName,
        customerId: row.customerId,
        parkedAt: row.parkedAt,
        parkedBy: row.parkedBy,
        totalAmount: row.totalAmount,
        notes: row.notes,
      }));

      return {
        success: true,
        parkedOrders,
        isOffline: true,
      };
    } catch (error: any) {
      console.error('[ParkedOrderRepository] Error searching parked orders:', error);
      return {
        success: false,
        error: error.message || 'Failed to search parked orders',
      };
    }
  }

  /**
   * Load a parked order with all details
   */
  async loadParkedOrder(parkedOrderId: string, useServer = true): Promise<LoadParkedOrderResult> {
    try {
      // Try server first if requested
      if (useServer) {
        try {
          const response = await this.apiClient.get<ApiResponse<LoadParkedOrderData>>(`/api/parked-orders/${parkedOrderId}/load`);
          if (response.success && response.data) {
            return {
              success: true,
              data: response.data,
              isOffline: false,
            };
          }
        } catch (serverError) {
          console.warn('[ParkedOrderRepository] Server load failed, falling back to local DB:', serverError);
        }
      }

      // Fallback to local DB
      // Get parked order
      const parkedOrderResults = await this.localDb.query<ParkedOrder>(
        'SELECT * FROM ParkedOrder WHERE id = ?',
        [parkedOrderId]
      );

      if (parkedOrderResults.length === 0) {
        return {
          success: false,
          error: 'Parked order not found',
        };
      }

      const parkedOrder = parkedOrderResults[0];

      // Get order details
      const orderResults = await this.localDb.query(
        'SELECT * FROM SaleOrder WHERE id = ?',
        [parkedOrder.orderId]
      );

      if (orderResults.length === 0) {
        return {
          success: false,
          error: 'Order not found',
        };
      }

      const order = this.mapSalesOrder(orderResults[0]);

      // Get customer details (required for transaction hydration)
      let customer: LoadParkedOrderCustomer | undefined;
      const customerId = parkedOrder.customerId || order.customerId;

      if (customerId) {
        const customerResults = await this.localDb.query(
          `SELECT 
            c.id,
            c.firstName,
            c.lastName,
            c.email,
            c.phone,
            ca.street1,
            ca.street2,
            ca.city,
            ca.state,
            ca.postalCode
          FROM Customer c
          LEFT JOIN CustomerAddress ca ON ca.customerId = c.id AND ca.isDefault = 1
          WHERE c.id = ?
          LIMIT 1`,
          [customerId]
        );

        if (customerResults.length > 0) {
          const row = customerResults[0] as any;
          const addressParts = [
            row.street1,
            row.street2,
            row.city,
            row.state,
            row.postalCode,
          ]
            .map((part: string | null | undefined) => (part ?? '').trim())
            .filter((part: string) => part.length > 0);

          customer = {
            id: row.id,
            firstName: row.firstName ?? undefined,
            lastName: row.lastName ?? undefined,
            email: row.email ?? undefined,
            phone: row.phone ?? undefined,
            address: addressParts.join(', ') || undefined,
          };
        }
      }

      // Get line items
      const lineItemResults = await this.localDb.query(
        `SELECT
          oli.*,
          pv.sku,
          pv.variantName,
          pv.image,
          p.name as productName
        FROM OrderLineItem oli
        LEFT JOIN ProductVariant pv ON oli.variantId = pv.id
        LEFT JOIN Product p ON pv.productId = p.id
        WHERE oli.orderId = ?`,
        [parkedOrder.orderId]
      );

      const lineItems = lineItemResults.map((row: any) => ({
        id: row.id,
        orderId: row.orderId,
        variantId: row.variantId,
        salesPersonId: row.salesPersonId,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        lineDiscount: row.lineDiscount,
        lineDiscountPercent: row.lineDiscountPercent,
        customDiscountAmount: row.customDiscountAmount,
        customDiscountPercent: row.customDiscountPercent,
        lineTax: row.lineTax,
        lineTotal: row.lineTotal,
        notes: row.notes,
        // Variant details
        sku: row.sku,
        variantName: row.variantName,
        productName: row.productName,
        image: row.image,
      }));

      // Get payments
      const paymentResults = await this.localDb.query(
        `SELECT
          op.*,
          pm.code as paymentMethodCode,
          pm.name as paymentMethodName,
          pm.type as paymentMethodType
        FROM OrderPayment op
        LEFT JOIN PaymentMethod pm ON op.paymentMethodId = pm.id
        WHERE op.orderId = ?`,
        [parkedOrder.orderId]
      );

      const payments = paymentResults.map((row: any) => ({
        id: row.id,
        orderId: row.orderId,
        paymentMethodId: row.paymentMethodId,
        amount: row.amount,
        status: row.status,
        transactionId: row.transactionId,
        authorizationCode: row.authorizationCode,
        cardLast4: row.cardLast4,
        cardBrand: row.cardBrand,
        processedAt: row.processedAt,
        createdAt: row.createdAt,
        // Payment method details
        paymentMethod: {
          id: row.paymentMethodId,
          code: row.paymentMethodCode,
          name: row.paymentMethodName,
          type: row.paymentMethodType,
        },
      }));

      return {
        success: true,
        data: {
          parkedOrderId,
          order,
          lineItems,
          payments,
          customer,
        },
        isOffline: true,
      };
    } catch (error: any) {
      console.error('[ParkedOrderRepository] Error loading parked order:', error);
      return {
        success: false,
        error: error.message || 'Failed to load parked order',
      };
    }
  }

  /**
   * Complete a parked order (change status from Parked to Completed)
   */
  async completeParkedOrder(parkedOrderId: string, useServer = true): Promise<{ success: boolean; error?: string }> {
    try {
      // Get parked order
      const parkedOrderResults = await this.localDb.query<ParkedOrder>(
        'SELECT * FROM ParkedOrder WHERE id = ?',
        [parkedOrderId]
      );

      if (parkedOrderResults.length === 0) {
        return {
          success: false,
          error: 'Parked order not found',
        };
      }

      const parkedOrder = parkedOrderResults[0];

      // Try server first if requested
      if (useServer) {
        try {
          const response = await this.apiClient.post<ApiResponse>(`/api/parked-orders/${parkedOrderId}/complete`);
          if (response.success) {
            // Update local DB
            await this.updateOrderStatus(parkedOrder.orderId, 'Completed');
            await this.deleteParkedOrderFromLocalDb(parkedOrderId);

            return {
              success: true,
            };
          }
        } catch (serverError) {
          console.warn('[ParkedOrderRepository] Server complete failed, falling back to local DB:', serverError);
        }
      }

      // Fallback to local DB
      await this.updateOrderStatus(parkedOrder.orderId, 'Completed');
      await this.deleteParkedOrderFromLocalDb(parkedOrderId);

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[ParkedOrderRepository] Error completing parked order:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete parked order',
      };
    }
  }

  /**
   * Delete a parked order
   */
  async deleteParkedOrder(parkedOrderId: string, useServer = true): Promise<{ success: boolean; error?: string }> {
    try {
      // Get parked order
      const parkedOrderResults = await this.localDb.query<ParkedOrder>(
        'SELECT * FROM ParkedOrder WHERE id = ?',
        [parkedOrderId]
      );

      if (parkedOrderResults.length === 0) {
        return {
          success: false,
          error: 'Parked order not found',
        };
      }

      const parkedOrder = parkedOrderResults[0];

      // Try server first if requested
      if (useServer) {
        try {
          const response = await this.apiClient.delete<ApiResponse>(`/api/parked-orders/${parkedOrderId}`);
          if (response.success) {
            // Update local DB
            await this.updateOrderStatus(parkedOrder.orderId, 'Voided');
            await this.deleteParkedOrderFromLocalDb(parkedOrderId);

            return {
              success: true,
            };
          }
        } catch (serverError) {
          console.warn('[ParkedOrderRepository] Server delete failed, falling back to local DB:', serverError);
        }
      }

      // Fallback to local DB
      await this.updateOrderStatus(parkedOrder.orderId, 'Voided');
      await this.deleteParkedOrderFromLocalDb(parkedOrderId);

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[ParkedOrderRepository] Error deleting parked order:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete parked order',
      };
    }
  }

  /**
   * Save parked order to local database
   */
  private async saveParkedOrderToLocalDb(data: any): Promise<void> {
    await this.localDb.execute(
      `INSERT INTO ParkedOrder (id, parkNumber, orderId, customerId, parkedBy, parkedAt, expiryDate, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.parkNumber,
        data.orderId,
        data.customerId,
        data.parkedBy,
        data.parkedAt,
        data.expiryDate,
        data.notes,
        data.createdAt,
      ]
    );
  }

  /**
   * Delete parked order from local database
   */
  private async deleteParkedOrderFromLocalDb(parkedOrderId: string): Promise<void> {
    await this.localDb.execute('DELETE FROM ParkedOrder WHERE id = ?', [parkedOrderId]);
  }

  /**
   * Update order status
   */
  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const now = new Date().toISOString();
    await this.localDb.execute(
      `UPDATE SaleOrder SET status = ?, updatedAt = ?, completedAt = ? WHERE id = ?`,
      [status, now, status === 'Completed' ? now : null, orderId]
    );
  }

  /**
   * Map database row to SalesOrder interface
   */
  private mapSalesOrder(row: any): SalesOrder {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      locationId: row.locationId,
      customerId: row.customerId,
      cashierId: row.cashierId,
      orderDate: row.orderDate,
      completedAt: row.completedAt,
      status: row.status,
      subtotal: row.subtotal,
      taxAmount: row.taxAmount,
      discountAmount: row.discountAmount,
      discountPercent: row.discountPercent,
      adjustmentAmount: row.adjustmentAmount,
      adjustmentReason: row.adjustmentReason,
      giftCardNumber: row.couponCode, // Map couponCode to giftCardNumber
      totalAmount: row.totalAmount,
      amountPaid: row.amountPaid,
      amountDue: row.amountDue,
      changeAmount: row.changeAmount,
      notes: row.notes,
      customerNotes: row.customerNotes,
    };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate park number
   */
  private generateParkNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PARK-${timestamp}-${random}`;
  }
}
