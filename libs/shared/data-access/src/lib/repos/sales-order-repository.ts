/**
 * Sales Order Repository
 *
 * Handles creating and managing sales orders with payments
 * Works with both local DB (SQLite/IndexedDB) and server API
 */

import { LocalDbClient } from '../local-db-client';
import { RemoteApiClient } from '../types';

export interface OrderLineItemInput {
  variantId: string;
  salesPersonId?: string;
  quantity: number;
  unitPrice: number;
  saleDiscount?: {
    amount?: number;
    percent?: number;
  };
  customDiscount?: {
    amount?: number;
    percent?: number;
  };
  notes?: string;
}

export interface OrderPaymentInput {
  paymentMethodId: string;
  amount: number;
  transactionId?: string;
  authorizationCode?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export interface CreateSalesOrderInput {
  locationId: string;
  cashierId: string;
  salesPersonId?: string;
  customerId?: string;
  lineItems: OrderLineItemInput[];
  payments: OrderPaymentInput[];
  orderLevelDiscount?: {
    amount?: number;
    percent?: number;
  };
  adjustment?: {
    amount: number;
    reason?: string;
  };
  giftCardNumber?: string;
  notes?: string;
  customerNotes?: string;
  taxAmountOverride?: number;
  totalAmountOverride?: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  locationId: string;
  customerId?: string;
  cashierId: string;
  salesPersonId?: string;
  orderDate: string;
  completedAt?: string;
  status: 'Open' | 'Completed' | 'Voided' | 'Parked' | 'OnHold';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  discountPercent: number;
  adjustmentAmount: number;
  adjustmentReason?: string;
  giftCardNumber?: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  changeAmount: number;
  notes?: string;
  customerNotes?: string;
  customer?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    customerCode?: string;
  };
  salesPerson?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    code?: string;
    name?: string;
  };
}

export interface CreateOrderResult {
  success: boolean;
  order?: SalesOrder;
  error?: string;
  isOffline?: boolean;
}

export class SalesOrderRepository {
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
   * Create a new sales order with line items and payments
   */
  async createOrder(data: CreateSalesOrderInput, useServer = true): Promise<CreateOrderResult> {
    try {
      // Ensure payments array exists
      const payments = data.payments ?? [];
      const normalizedData: CreateSalesOrderInput = {
        ...data,
        payments,
      };

      // Calculate order totals
      const calculatedTotals = this.calculateOrderTotals(normalizedData);

      // Validate payments only when at least one payment is supplied.
      // Parked orders or drafts may intentionally defer tender collection.
      if (payments.length > 0) {
        const paymentValidation = this.validatePayments(
          payments,
          calculatedTotals.totalAmount
        );
        if (!paymentValidation.isValid) {
          return {
            success: false,
            error: paymentValidation.error,
          };
        }
      }

      // ALWAYS save to local DB first (like desktop app)
      // This ensures orders are saved even if server is offline
      // console.log('[SalesOrderRepository] Saving order to local DB first...');
      let localOrder: SalesOrder;
      try {
        localOrder = await this.saveOrderToLocalDb(null, normalizedData);
        // console.log('[SalesOrderRepository] Order saved to local DB:', localOrder.orderNumber);
      } catch (localDbError: any) {
        // console.error('[SalesOrderRepository] Failed to save order to local DB:', localDbError);
        return {
          success: false,
          error: `Failed to save order to local database: ${localDbError.message || 'Unknown error'}`,
        };
      }

      // Check server availability first if useServer is true
      let shouldUseServer = useServer;
      if (useServer) {
        const isServerAvailable = await this.checkServerAvailability();
        if (!isServerAvailable) {
          // console.log('[SalesOrderRepository] Server is not available, order saved locally only');
          shouldUseServer = false;
        }
      }

      // Try to save to server if requested and available
      if (shouldUseServer) {
        type CreateOrderApiResponse =
          | {
              success: true;
              order?: SalesOrder;
              data?: SalesOrder | { order: SalesOrder };
            }
          | {
              success: false;
              error?: string;
              data?: unknown;
            };
        try {
          // console.log('[SalesOrderRepository] Attempting to save order to server...');
          const response = await this.apiClient.post<CreateOrderApiResponse>('/api/orders', {
            ...normalizedData,
            ...calculatedTotals,
          });

          if (response.success) {
            const responseData = response.data as any;
            const serverOrder = response.order ?? responseData?.order ?? responseData;
            if (serverOrder) {
              // console.log('[SalesOrderRepository] Order saved to server, updating local DB with server data...');
              // Update local DB with server order data (including server ID and orderNumber)
              // Pass existing order ID so it updates instead of creating duplicate
              await this.saveOrderToLocalDb(serverOrder, normalizedData, localOrder.id);

              return {
                success: true,
                order: serverOrder,
                isOffline: false,
              };
            }
          } else {
            // console.warn('[SalesOrderRepository] Server returned unsuccessful response:', response);
          }
        } catch (serverError) {
          // console.warn('[SalesOrderRepository] Server save failed (order saved locally with pending sync):', serverError);
          // Order is already saved locally with sync_status='pending'
          // It will be synced when server comes back online
        }
      }

      // Return local order (with sync_status='pending' if server wasn't available)
      // console.log('[SalesOrderRepository] Returning success result:', {
      //   success: true,
      //   orderNumber: localOrder.orderNumber,
      //   orderId: localOrder.id,
      //   isOffline: !useServer,
      // });
      return {
        success: true,
        order: localOrder,
        isOffline: !useServer, // Mark as offline if server wasn't used or failed
      };
    } catch (error: any) {
      console.error('[SalesOrderRepository] Error creating order:', error);
      return {
        success: false,
        error: error.message || 'Failed to create order',
      };
    }
  }

  /**
   * Save order to local database
   */
  private async saveOrderToLocalDb(serverOrder: any | null, data: CreateSalesOrderInput, existingOrderId?: string): Promise<SalesOrder> {
    return this.runWithForeignKeysDisabled(async () => {
      // Use existing order ID if provided (for updating), otherwise use server ID or generate new
      const orderId = existingOrderId || serverOrder?.id || this.generateId();
      const orderNumber = serverOrder?.orderNumber || this.generateOrderNumber();
      const now = new Date().toISOString();

      const calculatedTotals = this.calculateOrderTotals(data);
      const amountPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
      const changeAmount = Math.max(0, amountPaid - calculatedTotals.totalAmount);

      // Start transaction (ignored for IndexedDB, but kept for SQLite compatibility)
      await this.localDb.execute('BEGIN TRANSACTION');

      try {
      // console.log('[SalesOrderRepository] Saving order to local DB:', {
      //   orderId,
      //   orderNumber,
      //   lineItemsCount: data.lineItems.length,
      //   paymentsCount: data.payments.length,
      //   totalAmount: calculatedTotals.totalAmount,
      //   isUpdate: !!existingOrderId,
      //   hasServerOrder: !!serverOrder,
      // });

      // Check if order already exists
      const existingOrder = existingOrderId ? await this.localDb.query<{ id: string }>(
        `SELECT id FROM SaleOrder WHERE id = ?`,
        [existingOrderId]
      ) : [];

      const orderStatus = serverOrder?.status || 'Completed';
      const completedAt = orderStatus === 'Completed' ? now : null;

      if (existingOrder.length > 0 && existingOrderId) {
        // Update existing order
        // console.log('[SalesOrderRepository] Updating existing order in local DB...');
        await this.localDb.execute(
          `UPDATE SaleOrder SET
            orderNumber = ?, locationId = ?, customerId = ?, cashierId = ?, salesPersonId = ?, 
            orderDate = ?, completedAt = ?, status = ?,
            subtotal = ?, taxAmount = ?, discountAmount = ?, discountPercent = ?,
            adjustmentAmount = ?, adjustmentReason = ?,
            totalAmount = ?, amountPaid = ?, amountDue = ?, changeAmount = ?,
            notes = ?, customerNotes = ?, updatedAt = ?,
            sync_status = ?, last_synced_at = ?
          WHERE id = ?`,
          [
            orderNumber,
            data.locationId,
            data.customerId || null,
            data.cashierId,
            data.salesPersonId || null,
            serverOrder?.orderDate || now,
            completedAt,
            orderStatus,
            calculatedTotals.subtotal,
            calculatedTotals.taxAmount,
            calculatedTotals.orderDiscount,
            data.orderLevelDiscount?.percent || 0,
            data.adjustment?.amount || 0,
            data.adjustment?.reason || null,
            calculatedTotals.totalAmount,
            amountPaid,
            Math.max(0, calculatedTotals.totalAmount - amountPaid),
            changeAmount,
            data.notes || null,
            data.customerNotes || null,
            serverOrder?.updatedAt || now,
            serverOrder ? 'synced' : 'pending',
            serverOrder ? now : null,
            existingOrderId,
          ]
        );

        // Delete existing line items and payments to re-insert
        // IndexedDB doesn't support WHERE clauses, so we need to query and delete individually
        try {
          const existingLineItems = await this.localDb.query<{ id: string }>(
            `SELECT id FROM OrderLineItem WHERE orderId = ?`,
            [existingOrderId]
          );
          // console.log(`[SalesOrderRepository] Found ${existingLineItems.length} existing line items to delete`);
          for (const item of existingLineItems) {
            try {
              // Pass id as array parameter for DELETE
              await this.localDb.execute(`DELETE FROM OrderLineItem WHERE id = ?`, [item.id]);
            } catch (deleteError) {
              // console.warn(`[SalesOrderRepository] Failed to delete line item ${item.id}:`, deleteError);
            }
          }
        } catch (error) {
          // console.warn('[SalesOrderRepository] Error querying/deleting existing line items:', error);
        }

        try {
          const existingPayments = await this.localDb.query<{ id: string }>(
            `SELECT id FROM OrderPayment WHERE orderId = ?`,
            [existingOrderId]
          );
          // console.log(`[SalesOrderRepository] Found ${existingPayments.length} existing payments to delete`);
          for (const payment of existingPayments) {
            try {
              // Pass id as array parameter for DELETE
              await this.localDb.execute(`DELETE FROM OrderPayment WHERE id = ?`, [payment.id]);
            } catch (deleteError) {
              // console.warn(`[SalesOrderRepository] Failed to delete payment ${payment.id}:`, deleteError);
            }
          }
        } catch (error) {
          // console.warn('[SalesOrderRepository] Error querying/deleting existing payments:', error);
        }
      } else {
        // Insert new order
        // console.log('[SalesOrderRepository] Inserting new order into local DB:', {
        //   orderId,
        //   orderNumber,
        //   locationId: data.locationId,
        //   totalAmount: calculatedTotals.totalAmount,
        // });
        try {
          await this.localDb.execute(
            `INSERT INTO SaleOrder (
              id, orderNumber, locationId, customerId, cashierId, salesPersonId, orderDate, completedAt, status,
              subtotal, taxAmount, discountAmount, discountPercent,
              adjustmentAmount, adjustmentReason,
              totalAmount, amountPaid, amountDue, changeAmount,
              notes, customerNotes, createdAt, updatedAt,
              sync_status, last_synced_at, is_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              orderNumber,
              data.locationId,
              data.customerId || null,
              data.cashierId,
              data.salesPersonId || null,
              serverOrder?.orderDate || now,
              completedAt,
              orderStatus,
              calculatedTotals.subtotal,
              calculatedTotals.taxAmount,
              calculatedTotals.orderDiscount,
              data.orderLevelDiscount?.percent || 0,
              data.adjustment?.amount || 0,
              data.adjustment?.reason || null,
              calculatedTotals.totalAmount,
              amountPaid,
              Math.max(0, calculatedTotals.totalAmount - amountPaid),
              changeAmount,
              data.notes || null,
              data.customerNotes || null,
              serverOrder?.createdAt || now,
              serverOrder?.updatedAt || now,
              serverOrder ? 'synced' : 'pending',
              serverOrder ? now : null,
              0,
            ]
          );
          // console.log('[SalesOrderRepository] Order INSERT completed successfully');
        } catch (insertError: any) {
          // console.error('[SalesOrderRepository] Order INSERT failed:', insertError);
          throw new Error(`Failed to insert order: ${insertError.message || 'Unknown error'}`);
        }
      }

      // Insert line items (for both new and updated orders)
      // console.log(`[SalesOrderRepository] Inserting ${data.lineItems.length} line items...`);
      for (let i = 0; i < data.lineItems.length; i++) {
        const lineItem = data.lineItems[i];
        const lineId = this.generateId();
        const lineSubtotal = lineItem.quantity * lineItem.unitPrice;

        let saleDiscount = 0;
        if (lineItem.saleDiscount?.amount) {
          saleDiscount = lineItem.saleDiscount.amount;
        } else if (lineItem.saleDiscount?.percent) {
          saleDiscount = (lineSubtotal * lineItem.saleDiscount.percent) / 100;
        }

        let customDiscount = 0;
        if (lineItem.customDiscount?.amount) {
          customDiscount = lineItem.customDiscount.amount;
        } else if (lineItem.customDiscount?.percent) {
          customDiscount = (lineSubtotal * lineItem.customDiscount.percent) / 100;
        }

        const lineTotal = Math.max(0, lineSubtotal - saleDiscount - customDiscount);

        try {
          await this.localDb.execute(
            `INSERT INTO OrderLineItem (
              id, orderId, variantId, salesPersonId, quantity, unitPrice,
              lineDiscount, lineDiscountPercent,
              customDiscountAmount, customDiscountPercent,
              lineTotal, notes, createdAt,
              sync_status, last_synced_at, is_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              lineId,
              orderId,
              lineItem.variantId,
              lineItem.salesPersonId || null,
              lineItem.quantity,
              lineItem.unitPrice,
              saleDiscount,
              lineItem.saleDiscount?.percent || 0,
              customDiscount,
              lineItem.customDiscount?.percent || 0,
              lineTotal,
              lineItem.notes || null,
              now,
              serverOrder ? 'synced' : 'pending',
              serverOrder ? now : null,
              0,
            ]
          );
          // console.log(`[SalesOrderRepository] Line item ${i + 1}/${data.lineItems.length} inserted successfully`);
        } catch (lineItemError: any) {
          // console.error(`[SalesOrderRepository] Failed to insert line item ${i + 1}:`, lineItemError);
          throw new Error(`Failed to insert line item: ${lineItemError.message || 'Unknown error'}`);
        }
      }

      // Insert payments
      // console.log(`[SalesOrderRepository] Inserting ${data.payments.length} payments...`);
      for (let i = 0; i < data.payments.length; i++) {
        const payment = data.payments[i];
        const paymentId = this.generateId();

        try {
          await this.localDb.execute(
            `INSERT INTO OrderPayment (
              id, orderId, paymentMethodId, amount, status,
              transactionId, authorizationCode, cardLast4, cardBrand,
              processedAt, createdAt,
              sync_status, last_synced_at, is_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              paymentId,
              orderId,
              payment.paymentMethodId,
              payment.amount,
              'Completed',
              payment.transactionId || null,
              payment.authorizationCode || null,
              payment.cardLast4 || null,
              payment.cardBrand || null,
              now,
              now,
              serverOrder ? 'synced' : 'pending',
              serverOrder ? now : null,
              0,
            ]
          );
          // console.log(`[SalesOrderRepository] Payment ${i + 1}/${data.payments.length} inserted successfully`);
        } catch (paymentError: any) {
          // console.error(`[SalesOrderRepository] Failed to insert payment ${i + 1}:`, paymentError);
          throw new Error(`Failed to insert payment: ${paymentError.message || 'Unknown error'}`);
        }
      }

      // Commit transaction (ignored for IndexedDB, but kept for SQLite compatibility)
      await this.localDb.execute('COMMIT');

      const savedOrder: SalesOrder = {
        id: orderId,
        orderNumber,
        locationId: data.locationId,
        customerId: data.customerId,
        cashierId: data.cashierId,
        salesPersonId: data.salesPersonId,
        orderDate: serverOrder?.orderDate || now,
        completedAt: completedAt || undefined,
        status: orderStatus,
        subtotal: calculatedTotals.subtotal,
        taxAmount: calculatedTotals.taxAmount,
        discountAmount: calculatedTotals.orderDiscount,
        discountPercent: data.orderLevelDiscount?.percent || 0,
        adjustmentAmount: data.adjustment?.amount || 0,
        adjustmentReason: data.adjustment?.reason,
        giftCardNumber: data.giftCardNumber,
        totalAmount: calculatedTotals.totalAmount,
        amountPaid,
        amountDue: Math.max(0, calculatedTotals.totalAmount - amountPaid),
        changeAmount,
        notes: data.notes,
        customerNotes: data.customerNotes,
      };

      // console.log('[SalesOrderRepository] Order saved successfully to local DB:', {
      //   orderNumber: savedOrder.orderNumber,
      //   orderId: savedOrder.id,
      //   totalAmount: savedOrder.totalAmount,
      //   status: savedOrder.status,
      // });

      return savedOrder;
    } catch (error: any) {
      // Rollback on error (ignored for IndexedDB, but kept for SQLite compatibility)
      try {
        await this.localDb.execute('ROLLBACK');
      } catch (rollbackError) {
        // console.warn('[SalesOrderRepository] Rollback failed (ignored for IndexedDB):', rollbackError);
      }
      // console.error('[SalesOrderRepository] Error saving order to local DB:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error saving order to local database';
      throw new Error(errorMessage);
    }
    });
  }

  /**
   * Calculate order totals
   */
  private calculateOrderTotals(data: CreateSalesOrderInput) {
    // Calculate subtotal from line items
    const subtotal = data.lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    // Calculate line item discounts
    const lineItemDiscount = data.lineItems.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      let lineDiscount = 0;

      if (item.saleDiscount?.amount) {
        lineDiscount += item.saleDiscount.amount;
      } else if (item.saleDiscount?.percent) {
        lineDiscount += (lineSubtotal * item.saleDiscount.percent) / 100;
      }

      if (item.customDiscount?.amount) {
        lineDiscount += item.customDiscount.amount;
      } else if (item.customDiscount?.percent) {
        lineDiscount += (lineSubtotal * item.customDiscount.percent) / 100;
      }

      return sum + lineDiscount;
    }, 0);

    // Calculate order-level discount
    let orderDiscount = 0;
    if (data.orderLevelDiscount?.amount) {
      orderDiscount = Math.min(data.orderLevelDiscount.amount, subtotal - lineItemDiscount);
    } else if (data.orderLevelDiscount?.percent) {
      orderDiscount = ((subtotal - lineItemDiscount) * data.orderLevelDiscount.percent) / 100;
    }

    const DEFAULT_TAX_RATE = 0.03;
    const subtotalAfterDiscounts = subtotal - lineItemDiscount - orderDiscount;
    const adjustmentAmount = data.adjustment?.amount || 0;
    const subtotalAfterAdjustment = subtotalAfterDiscounts + adjustmentAmount;

    const taxAmount =
      data.taxAmountOverride !== undefined
        ? data.taxAmountOverride
        : Math.max(0, subtotalAfterAdjustment * DEFAULT_TAX_RATE);

    const totalAmount =
      data.totalAmountOverride !== undefined
        ? data.totalAmountOverride
        : subtotalAfterAdjustment + taxAmount;

    return {
      subtotal,
      lineItemDiscount,
      orderDiscount,
      taxAmount,
      totalAmount: Math.max(0, totalAmount),
    };
  }

  /**
   * Validate payments
   */
  private validatePayments(payments: OrderPaymentInput[], totalAmount: number): { isValid: boolean; error?: string } {
    if (payments.length === 0) {
      return { isValid: false, error: 'At least one payment is required' };
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    // Use a small tolerance (0.01) to account for floating-point precision issues
    const tolerance = 0.01;
    const difference = totalAmount - totalPaid;

    if (difference > tolerance) {
      return {
        isValid: false,
        error: `Insufficient payment. Total: $${totalAmount.toFixed(2)}, Paid: $${totalPaid.toFixed(2)}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Some reference records (customers, variants, etc.) might not be synced locally yet.
   * Temporarily disable FK enforcement so we can cache offline orders and re-enable immediately after.
   */
  private async runWithForeignKeysDisabled<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.localDb.execute('PRAGMA foreign_keys = OFF');
      return await callback();
    } finally {
      await this.localDb.execute('PRAGMA foreign_keys = ON');
    }
  }

  /**
   * Get all orders with pagination
   */
  async getOrders(options: {
    page?: number;
    limit?: number;
    locationId?: string;
    status?: string;
  } = {}): Promise<{
    success: boolean;
    orders?: SalesOrder[];
    total?: number;
    page?: number;
    totalPages?: number;
    error?: string;
    isOffline?: boolean;
  }> {
    try {
      const { page = 1, limit = 50, locationId, status } = options;
      const offset = (page - 1) * limit;

      // Check server availability first
      let shouldUseServer = true;
      try {
        const isServerAvailable = await this.checkServerAvailability();
        if (!isServerAvailable) {
          shouldUseServer = false;
        }
      } catch {
        shouldUseServer = false;
      }

      // Try server first if available
      if (shouldUseServer) {
        try {
          const queryParams = new URLSearchParams();
          if (page) queryParams.append('page', page.toString());
          if (limit) queryParams.append('limit', limit.toString());
          if (locationId) queryParams.append('locationId', locationId);
          if (status) queryParams.append('status', status);

          const url = `/api/orders?${queryParams.toString()}`;
          const response = await this.apiClient.get<{
            success: boolean;
            orders?: SalesOrder[];
            total?: number;
            page?: number;
            totalPages?: number;
          }>(url);

          if (response.success && response.orders) {
            // Map server orders to ensure consistent structure
            // Server may or may not include customer/salesPerson, so we map them
            const mappedOrders = response.orders.map((order: any) => this.mapOrderFromDb(order));
            return {
              success: true,
              orders: mappedOrders,
              total: response.total,
              page: response.page,
              totalPages: response.totalPages,
              isOffline: false,
            };
          }
        } catch (serverError) {
          // Fall through to local DB
        }
      }

      // Fallback to local DB
      // Check if this is SQLite (supports JOIN) or IndexedDB
      const dbClassName = (this.localDb as any).constructor?.name || '';
      const isSqlite = dbClassName.includes('Sqlite') || dbClassName.includes('DesktopSqlite');
      const isIndexedDB = dbClassName.includes('IndexedDb') || dbClassName.includes('WebIndexedDb');

      let query: string;
      const params: any[] = [];

      if (isSqlite) {
        // SQLite: Use LEFT JOIN to get customer and salesPerson data
        query = `
          SELECT 
            o.*,
            c.id as customer_id,
            c.firstName as customer_firstName,
            c.lastName as customer_lastName,
            c.email as customer_email,
            c.phone as customer_phone,
            c.customerCode as customer_customerCode,
            sp.id as salesPerson_id,
            sp.name as salesPerson_name,
            sp.code as salesPerson_code,
            sp.email as salesPerson_email,
            sp.phone as salesPerson_phone
          FROM SaleOrder o
          LEFT JOIN Customer c ON o.customerId = c.id
          LEFT JOIN SalesPerson sp ON o.salesPersonId = sp.id
          WHERE o.is_deleted = 0
        `;
      } else {
        // IndexedDB: Simple query, we'll fetch related data separately
        query = 'SELECT * FROM SaleOrder WHERE is_deleted = 0';
      }

      if (locationId) {
        query += isSqlite ? ' AND o.locationId = ?' : ' AND locationId = ?';
        params.push(locationId);
      }

      if (status) {
        query += isSqlite ? ' AND o.status = ?' : ' AND status = ?';
        params.push(status);
      }

      query += isSqlite ? ' ORDER BY o.orderDate DESC LIMIT ? OFFSET ?' : ' ORDER BY orderDate DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const orders = await this.localDb.query<any>(query, params);

      // For IndexedDB, fetch customer and salesPerson data separately
      if (isIndexedDB || !isSqlite) {
        for (const order of orders) {
          if (order.customerId) {
            try {
              const customers = await this.localDb.query<any>('SELECT * FROM Customer WHERE id = ?', [order.customerId]);
              if (customers && customers.length > 0) {
                order.customer = customers[0];
              }
            } catch (err) {
              // Customer not found, ignore
            }
          }
          if (order.salesPersonId) {
            try {
              const salesPersons = await this.localDb.query<any>('SELECT * FROM SalesPerson WHERE id = ?', [order.salesPersonId]);
              if (salesPersons && salesPersons.length > 0) {
                order.salesPerson = salesPersons[0];
              }
            } catch (err) {
              // SalesPerson not found, ignore
            }
          }
        }
      }

      // Get total count
      let countQuery = 'SELECT COUNT(*) as count FROM SaleOrder WHERE is_deleted = 0';
      const countParams: any[] = [];
      if (locationId) {
        countQuery += ' AND locationId = ?';
        countParams.push(locationId);
      }
      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }
      const countResult = await this.localDb.query<{ count: number }>(countQuery, countParams);
      const total = countResult[0]?.count || 0;

      return {
        success: true,
        orders: orders.map((row: any) => this.mapOrderFromDb(row)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        isOffline: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch orders',
        isOffline: true,
      };
    }
  }

  /**
   * Map database row to SalesOrder interface
   */
  private mapOrderFromDb(row: any): SalesOrder {
    const order: SalesOrder = {
      id: row.id,
      orderNumber: row.orderNumber,
      locationId: row.locationId,
      customerId: row.customerId || undefined,
      cashierId: row.cashierId,
      salesPersonId: row.salesPersonId || undefined,
      orderDate: row.orderDate,
      completedAt: row.completedAt || undefined,
      status: row.status as 'Open' | 'Completed' | 'Voided' | 'Parked' | 'OnHold',
      subtotal: typeof row.subtotal === 'number' ? row.subtotal : parseFloat(row.subtotal || '0'),
      taxAmount: typeof row.taxAmount === 'number' ? row.taxAmount : parseFloat(row.taxAmount || '0'),
      discountAmount: typeof row.discountAmount === 'number' ? row.discountAmount : parseFloat(row.discountAmount || '0'),
      discountPercent: typeof row.discountPercent === 'number' ? row.discountPercent : parseFloat(row.discountPercent || '0'),
      adjustmentAmount: typeof row.adjustmentAmount === 'number' ? row.adjustmentAmount : parseFloat(row.adjustmentAmount || '0'),
      adjustmentReason: row.adjustmentReason || undefined,
      giftCardNumber: row.giftCardNumber || undefined,
      totalAmount: typeof row.totalAmount === 'number' ? row.totalAmount : parseFloat(row.totalAmount || '0'),
      amountPaid: typeof row.amountPaid === 'number' ? row.amountPaid : parseFloat(row.amountPaid || '0'),
      amountDue: typeof row.amountDue === 'number' ? row.amountDue : parseFloat(row.amountDue || '0'),
      changeAmount: typeof row.changeAmount === 'number' ? row.changeAmount : parseFloat(row.changeAmount || '0'),
      notes: row.notes || undefined,
      customerNotes: row.customerNotes || undefined,
    };

    // Add customer data if available (from JOIN, separate query, or API response)
    if (row.customer) {
      // Already attached customer object (from IndexedDB separate query or API)
      order.customer = {
        id: row.customer.id,
        firstName: row.customer.firstName,
        lastName: row.customer.lastName,
        email: row.customer.email,
        phone: row.customer.phone,
        customerCode: row.customer.customerCode,
      };
    } else if (row.customer_id || row.customer_firstName || row.customer_lastName || row.customer_email || row.customer_phone) {
      // From SQL JOIN - create customer object if any customer data exists
      order.customer = {
        id: row.customer_id,
        firstName: row.customer_firstName || undefined,
        lastName: row.customer_lastName || undefined,
        email: row.customer_email || undefined,
        phone: row.customer_phone || undefined,
        customerCode: row.customer_customerCode || undefined,
      };
    }

    // Add salesPerson data if available (from JOIN, separate query, or API response)
    if (row.salesPerson) {
      // Already attached salesPerson object (from IndexedDB separate query or API)
      order.salesPerson = {
        id: row.salesPerson.id,
        name: row.salesPerson.name,
        code: row.salesPerson.code,
        firstName: undefined, // SalesPerson table uses 'name', not firstName/lastName
        lastName: undefined,
      };
    } else if (row.salesPerson_id || row.salesPerson_name || row.salesPerson_code) {
      // From SQL JOIN
      order.salesPerson = {
        id: row.salesPerson_id,
        name: row.salesPerson_name,
        code: row.salesPerson_code,
        firstName: undefined, // SalesPerson table uses 'name', not firstName/lastName
        lastName: undefined,
      };
    }

    return order;
  }
}
