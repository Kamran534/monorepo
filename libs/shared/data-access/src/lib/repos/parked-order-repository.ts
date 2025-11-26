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
  orderId?: string; // Optional - only needed if order already exists
  parkedBy: string;
  customerId?: string;
  notes?: string;
  expiryDate?: string;
  // Order data to store when parking without creating SaleOrder
  orderData?: {
    locationId: string;
    cashierId: string;
    salesPersonId?: string;
    lineItems: Array<{
      variantId: string;
      salesPersonId?: string;
      quantity: number;
      unitPrice: number;
      saleDiscount?: { amount?: number; percent?: number };
      customDiscount?: { amount?: number; percent?: number };
    }>;
    orderLevelDiscount?: { amount?: number; percent?: number };
    adjustment?: { amount: number; reason?: string };
    giftCardNumber?: string;
    subtotal?: number;
    taxAmount?: number;
    totalAmount?: number;
  };
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

      // If orderData is provided, store it as JSON in notes and use temporary orderId
      // Otherwise, use the provided orderId (for backward compatibility)
      let orderId: string;
      let notes: string | null = input.notes || null;
      
      if (input.orderData && !input.orderId) {
        // Store order data as JSON in notes
        const orderDataJson = JSON.stringify({
          ...input.orderData,
          parkedAt: now,
        });
        notes = orderDataJson;
        // Use temporary orderId that we can identify later
        orderId = `PARKED-${parkNumber}`;
      } else if (input.orderId) {
        // Use provided orderId (existing order)
        orderId = input.orderId;
      } else {
        throw new Error('Either orderId or orderData must be provided');
      }

      const parkedOrderData = {
        id: parkedOrderId,
        parkNumber,
        orderId: orderId,
        customerId: input.customerId || null,
        parkedBy: input.parkedBy,
        parkedAt: now,
        expiryDate: input.expiryDate || null,
        notes: notes,
        createdAt: now,
      };

      // Try server first if requested
      if (useServer) {
        try {
          const response = await this.apiClient.post<ApiResponse<ParkedOrder>>('/api/parked-orders', parkedOrderData);
          if (response.success && response.data) {
            // Also save to local DB
            await this.saveParkedOrderToLocalDb(response.data);

            // Only update order status if orderId is a real order (not temporary)
            if (input.orderId && !orderId.startsWith('PARKED-')) {
              await this.updateOrderStatus(input.orderId, 'Parked');
            }

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

      // Only update order status if orderId is a real order (not temporary)
      if (input.orderId && !orderId.startsWith('PARKED-')) {
        await this.updateOrderStatus(input.orderId, 'Parked');
      }

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
      // Use LEFT JOIN to include parked orders without SaleOrder records
      let query = `
        SELECT
          po.id,
          po.parkNumber,
          po.orderId,
          po.parkedAt,
          po.parkedBy,
          po.notes,
          COALESCE(so.orderNumber, po.parkNumber) as orderNumber,
          COALESCE(so.totalAmount, 0) as totalAmount,
          COALESCE(so.customerId, po.customerId) as customerId,
          CASE
            WHEN c.firstName IS NOT NULL THEN c.firstName || ' ' || c.lastName
            ELSE NULL
          END as customerName
        FROM ParkedOrder po
        LEFT JOIN SaleOrder so ON po.orderId = so.id AND (so.status = 'Parked' OR po.orderId LIKE 'PARKED-%')
        LEFT JOIN Customer c ON po.customerId = c.id
        WHERE so.status = 'Parked' OR po.orderId LIKE 'PARKED-%'
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

      const parkedOrders: ParkedOrderListItem[] = results.map((row: any) => {
        // If orderId starts with PARKED-, extract totalAmount from notes JSON
        let totalAmount = row.totalAmount || 0;
        if (row.orderId && row.orderId.startsWith('PARKED-') && row.notes) {
          try {
            const orderData = JSON.parse(row.notes);
            totalAmount = orderData.totalAmount || 0;
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        return {
          id: row.id,
          parkNumber: row.parkNumber,
          orderId: row.orderId,
          orderNumber: row.orderNumber,
          customerName: row.customerName,
          customerId: row.customerId,
          parkedAt: row.parkedAt,
          parkedBy: row.parkedBy,
          totalAmount: totalAmount,
          notes: row.notes,
        };
      });

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

      // Check if this is a parked order without a SaleOrder record (orderId starts with PARKED-)
      let order: SalesOrder;
      let lineItems: any[] = [];
      let payments: any[] = [];

      if (parkedOrder.orderId.startsWith('PARKED-')) {
        // Reconstruct order from stored JSON data
        try {
          const orderData = JSON.parse(parkedOrder.notes || '{}');
          if (!orderData.locationId) {
            return {
              success: false,
              error: 'Invalid parked order data',
            };
          }

          // Create a temporary order object from stored data
          const now = new Date().toISOString();
          order = {
            id: parkedOrder.orderId,
            orderNumber: parkedOrder.parkNumber,
            locationId: orderData.locationId,
            customerId: parkedOrder.customerId || undefined,
            cashierId: orderData.cashierId,
            salesPersonId: orderData.salesPersonId || undefined,
            orderDate: orderData.parkedAt || now,
            completedAt: undefined,
            status: 'Parked',
            subtotal: orderData.subtotal || 0,
            taxAmount: orderData.taxAmount || 0,
            discountAmount: orderData.orderLevelDiscount?.amount || 0,
            discountPercent: orderData.orderLevelDiscount?.percent || 0,
            adjustmentAmount: orderData.adjustment?.amount || 0,
            adjustmentReason: orderData.adjustment?.reason || undefined,
            giftCardNumber: orderData.giftCardNumber || undefined,
            totalAmount: orderData.totalAmount || 0,
            amountPaid: 0,
            amountDue: orderData.totalAmount || 0,
            changeAmount: 0,
            notes: undefined,
            customerNotes: undefined,
          };

          // Reconstruct line items from stored data
          lineItems = (orderData.lineItems || []).map((item: any, index: number) => ({
            id: `temp-${index}`,
            orderId: parkedOrder.orderId,
            variantId: item.variantId,
            productId: item.variantId, // Use variantId as productId for now
            salesPersonId: item.salesPersonId || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineDiscount: item.saleDiscount?.amount || 0,
            lineDiscountPercent: item.saleDiscount?.percent || 0,
            customDiscountAmount: item.customDiscount?.amount || 0,
            customDiscountPercent: item.customDiscount?.percent || 0,
            lineTax: 0,
            lineTotal: (item.quantity * item.unitPrice) - (item.saleDiscount?.amount || 0) - (item.customDiscount?.amount || 0),
            notes: undefined,
            sku: undefined,
            variantName: undefined,
            productName: undefined,
            image: undefined,
          }));

          // No payments for parked orders
          payments = [];
        } catch (parseError) {
          return {
            success: false,
            error: 'Failed to parse parked order data',
          };
        }
      } else {
        // Get order details from SaleOrder table (existing order)
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

        order = this.mapSalesOrder(orderResults[0]);

        // Get line items
        const lineItemResults = await this.localDb.query(
          `SELECT
            oli.*,
            pv.sku,
            pv.variantName,
            pv.productId,
            pv.image,
            p.name as productName
          FROM OrderLineItem oli
          LEFT JOIN ProductVariant pv ON oli.variantId = pv.id
          LEFT JOIN Product p ON pv.productId = p.id
          WHERE oli.orderId = ?`,
          [parkedOrder.orderId]
        );

        lineItems = lineItemResults.map((row: any) => ({
          id: row.id,
          orderId: row.orderId,
          variantId: row.variantId,
          productId: row.productId || undefined,
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

        payments = paymentResults.map((row: any) => ({
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
      }

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
   * Complete a parked order (delete the ParkedOrder record)
   * Note: This does not change the SaleOrder status - that is handled by createOrder
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
            // Server call succeeded, delete from local DB
            await this.deleteParkedOrderFromLocalDb(parkedOrderId);
            
            // Verify deletion
            const verifyResults = await this.localDb.query<ParkedOrder>(
              'SELECT * FROM ParkedOrder WHERE id = ?',
              [parkedOrderId]
            );
            
            if (verifyResults.length > 0) {
              console.error('[ParkedOrderRepository] ParkedOrder still exists after deletion (server path), retrying...');
              await this.deleteParkedOrderFromLocalDb(parkedOrderId);
            }
            
            return {
              success: true,
            };
          } else {
            // Server call failed, but still delete from local DB
            console.warn('[ParkedOrderRepository] Server complete returned failure, deleting from local DB anyway');
            await this.deleteParkedOrderFromLocalDb(parkedOrderId);
            return {
              success: true,
            };
          }
        } catch (serverError) {
          console.warn('[ParkedOrderRepository] Server complete failed, falling back to local DB:', serverError);
          // Continue to delete from local DB even if server call failed
        }
      }

      // Always delete from local DB (either as primary action or fallback)
      await this.deleteParkedOrderFromLocalDb(parkedOrderId);
      
      // Verify deletion was successful
      const verifyResults = await this.localDb.query<ParkedOrder>(
        'SELECT * FROM ParkedOrder WHERE id = ?',
        [parkedOrderId]
      );
      
      if (verifyResults.length > 0) {
        console.error('[ParkedOrderRepository] ParkedOrder still exists after deletion attempt, retrying...');
        // Try one more time
        await this.deleteParkedOrderFromLocalDb(parkedOrderId);
        
        // Verify again
        const verifyResults2 = await this.localDb.query<ParkedOrder>(
          'SELECT * FROM ParkedOrder WHERE id = ?',
          [parkedOrderId]
        );
        
        if (verifyResults2.length > 0) {
          throw new Error('Failed to delete ParkedOrder record after multiple attempts');
        }
      }

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
      `INSERT INTO ParkedOrder (id, parkNumber, orderId, customerId, parkedBy, parkedAt, expiryDate, notes, createdAt, sync_status, last_synced_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        'pending',
        null,
        0,
      ]
    );
  }

  /**
   * Delete parked order from local database
   */
  private async deleteParkedOrderFromLocalDb(parkedOrderId: string): Promise<void> {
    try {
      await this.localDb.execute('DELETE FROM ParkedOrder WHERE id = ?', [parkedOrderId]);
      console.log('[ParkedOrderRepository] Successfully deleted ParkedOrder:', parkedOrderId);
    } catch (error: any) {
      console.error('[ParkedOrderRepository] Error deleting ParkedOrder:', parkedOrderId, error);
      throw error; // Re-throw to be caught by caller
    }
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
