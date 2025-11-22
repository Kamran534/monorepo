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
      console.log('[SalesOrderRepository] Saving order to local DB first...');
      let localOrder: SalesOrder;
      try {
        localOrder = await this.saveOrderToLocalDb(null, normalizedData);
        console.log('[SalesOrderRepository] Order saved to local DB:', localOrder.orderNumber);
      } catch (localDbError: any) {
        console.error('[SalesOrderRepository] Failed to save order to local DB:', localDbError);
        return {
          success: false,
          error: `Failed to save order to local database: ${localDbError.message || 'Unknown error'}`,
        };
      }

      // Try to save to server if requested and available
      if (useServer) {
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
          console.log('[SalesOrderRepository] Attempting to save order to server...');
          const response = await this.apiClient.post<CreateOrderApiResponse>('/api/orders', {
            ...normalizedData,
            ...calculatedTotals,
          });

          if (response.success) {
            const responseData = response.data as any;
            const serverOrder = response.order ?? responseData?.order ?? responseData;
            if (serverOrder) {
              console.log('[SalesOrderRepository] Order saved to server, updating local DB with server data...');
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
            console.warn('[SalesOrderRepository] Server returned unsuccessful response:', response);
          }
        } catch (serverError) {
          console.warn('[SalesOrderRepository] Server save failed (order saved locally with pending sync):', serverError);
          // Order is already saved locally with sync_status='pending'
          // It will be synced when server comes back online
        }
      }

      // Return local order (with sync_status='pending' if server wasn't available)
      console.log('[SalesOrderRepository] Returning success result:', {
        success: true,
        orderNumber: localOrder.orderNumber,
        orderId: localOrder.id,
        isOffline: !useServer,
      });
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
      console.log('[SalesOrderRepository] Saving order to local DB:', {
        orderId,
        orderNumber,
        lineItemsCount: data.lineItems.length,
        paymentsCount: data.payments.length,
        totalAmount: calculatedTotals.totalAmount,
        isUpdate: !!existingOrderId,
        hasServerOrder: !!serverOrder,
      });

      // Check if order already exists
      const existingOrder = existingOrderId ? await this.localDb.query<{ id: string }>(
        `SELECT id FROM SaleOrder WHERE id = ?`,
        [existingOrderId]
      ) : [];

      const orderStatus = serverOrder?.status || 'Completed';
      const completedAt = orderStatus === 'Completed' ? now : null;

      if (existingOrder.length > 0 && existingOrderId) {
        // Update existing order
        console.log('[SalesOrderRepository] Updating existing order in local DB...');
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
          console.log(`[SalesOrderRepository] Found ${existingLineItems.length} existing line items to delete`);
          for (const item of existingLineItems) {
            try {
              // Pass id as array parameter for DELETE
              await this.localDb.execute(`DELETE FROM OrderLineItem WHERE id = ?`, [item.id]);
            } catch (deleteError) {
              console.warn(`[SalesOrderRepository] Failed to delete line item ${item.id}:`, deleteError);
            }
          }
        } catch (error) {
          console.warn('[SalesOrderRepository] Error querying/deleting existing line items:', error);
        }

        try {
          const existingPayments = await this.localDb.query<{ id: string }>(
            `SELECT id FROM OrderPayment WHERE orderId = ?`,
            [existingOrderId]
          );
          console.log(`[SalesOrderRepository] Found ${existingPayments.length} existing payments to delete`);
          for (const payment of existingPayments) {
            try {
              // Pass id as array parameter for DELETE
              await this.localDb.execute(`DELETE FROM OrderPayment WHERE id = ?`, [payment.id]);
            } catch (deleteError) {
              console.warn(`[SalesOrderRepository] Failed to delete payment ${payment.id}:`, deleteError);
            }
          }
        } catch (error) {
          console.warn('[SalesOrderRepository] Error querying/deleting existing payments:', error);
        }
      } else {
        // Insert new order
        console.log('[SalesOrderRepository] Inserting new order into local DB:', {
          orderId,
          orderNumber,
          locationId: data.locationId,
          totalAmount: calculatedTotals.totalAmount,
        });
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
          console.log('[SalesOrderRepository] Order INSERT completed successfully');
        } catch (insertError: any) {
          console.error('[SalesOrderRepository] Order INSERT failed:', insertError);
          throw new Error(`Failed to insert order: ${insertError.message || 'Unknown error'}`);
        }
      }

      // Insert line items (for both new and updated orders)
      console.log(`[SalesOrderRepository] Inserting ${data.lineItems.length} line items...`);
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
          console.log(`[SalesOrderRepository] Line item ${i + 1}/${data.lineItems.length} inserted successfully`);
        } catch (lineItemError: any) {
          console.error(`[SalesOrderRepository] Failed to insert line item ${i + 1}:`, lineItemError);
          throw new Error(`Failed to insert line item: ${lineItemError.message || 'Unknown error'}`);
        }
      }

      // Insert payments
      console.log(`[SalesOrderRepository] Inserting ${data.payments.length} payments...`);
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
          console.log(`[SalesOrderRepository] Payment ${i + 1}/${data.payments.length} inserted successfully`);
        } catch (paymentError: any) {
          console.error(`[SalesOrderRepository] Failed to insert payment ${i + 1}:`, paymentError);
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

      console.log('[SalesOrderRepository] Order saved successfully to local DB:', {
        orderNumber: savedOrder.orderNumber,
        orderId: savedOrder.id,
        totalAmount: savedOrder.totalAmount,
        status: savedOrder.status,
      });

      return savedOrder;
    } catch (error: any) {
      // Rollback on error (ignored for IndexedDB, but kept for SQLite compatibility)
      try {
        await this.localDb.execute('ROLLBACK');
      } catch (rollbackError) {
        console.warn('[SalesOrderRepository] Rollback failed (ignored for IndexedDB):', rollbackError);
      }
      console.error('[SalesOrderRepository] Error saving order to local DB:', error);
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
}
