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
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  locationId: string;
  customerId?: string;
  cashierId: string;
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

      // Try server first if requested
      if (useServer) {
        try {
          const response = await this.apiClient.post('/api/orders', {
            ...normalizedData,
            ...calculatedTotals,
          });

          if (response.success && response.data) {
            // Also save to local DB for offline access
            await this.saveOrderToLocalDb(response.data.order || response.data, normalizedData);

            return {
              success: true,
              order: response.data.order || response.data,
              isOffline: false,
            };
          }
        } catch (serverError) {
          console.warn('[SalesOrderRepository] Server create failed, falling back to local DB:', serverError);
        }
      }

      // Fallback to local DB
      const order = await this.saveOrderToLocalDb(null, normalizedData);

      return {
        success: true,
        order,
        isOffline: true,
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
  private async saveOrderToLocalDb(serverOrder: any | null, data: CreateSalesOrderInput): Promise<SalesOrder> {
    return this.runWithForeignKeysDisabled(async () => {
      const orderId = serverOrder?.id || this.generateId();
      const orderNumber = serverOrder?.orderNumber || this.generateOrderNumber();
      const now = new Date().toISOString();

      const calculatedTotals = this.calculateOrderTotals(data);
      const amountPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
      const changeAmount = Math.max(0, amountPaid - calculatedTotals.totalAmount);

      // Start transaction
      await this.localDb.execute('BEGIN TRANSACTION');

    try {
      // Insert order
      await this.localDb.execute(
        `INSERT INTO SaleOrder (
          id, orderNumber, locationId, customerId, cashierId, orderDate, status,
          subtotal, taxAmount, discountAmount,
          totalAmount, amountPaid, amountDue, changeAmount,
          notes, customerNotes, createdAt, updatedAt,
          sync_status, last_synced_at, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          orderNumber,
          data.locationId,
          data.customerId || null,
          data.cashierId,
          serverOrder?.orderDate || now,
          serverOrder?.status || 'Completed',
          calculatedTotals.subtotal,
          calculatedTotals.taxAmount,
          calculatedTotals.orderDiscount,
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

      // Insert line items
      for (const lineItem of data.lineItems) {
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
      }

      // Insert payments
      for (const payment of data.payments) {
        const paymentId = this.generateId();

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
      }

      // Commit transaction
      await this.localDb.execute('COMMIT');

      return {
        id: orderId,
        orderNumber,
        locationId: data.locationId,
        customerId: data.customerId,
        cashierId: data.cashierId,
        orderDate: serverOrder?.orderDate || now,
        status: serverOrder?.status || 'Completed',
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
    } catch (error) {
      // Rollback on error
      await this.localDb.execute('ROLLBACK');
      throw error;
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

    // Calculate subtotal after all discounts
    const subtotalAfterDiscounts = subtotal - lineItemDiscount - orderDiscount;

    // Add adjustment
    const adjustmentAmount = data.adjustment?.amount || 0;
    const subtotalAfterAdjustment = subtotalAfterDiscounts + adjustmentAmount;

    // Calculate tax (assuming 10% for now - should come from settings)
    const taxAmount = Math.max(0, subtotalAfterAdjustment * 0.1);

    // Calculate final total
    const totalAmount = subtotalAfterAdjustment + taxAmount;

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
