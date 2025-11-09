/**
 * Order Repository
 * Handles sales order data access and creation
 */

import { BaseRepository } from './base-repository';

export interface SaleOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  userId: string;
  locationId: string;
  shiftId?: string;
  status: 'Pending' | 'Completed' | 'Cancelled' | 'Refunded';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface OrderLineItem {
  id: string;
  orderId: string;
  productVariantId: string;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  paymentMethodId: string;
  amount: number;
  reference?: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  createdAt: string;
}

export interface OrderDiscount {
  id: string;
  orderId: string;
  discountType: 'Percentage' | 'FixedAmount' | 'PromotionCode';
  discountValue: number;
  discountAmount: number;
  reason?: string;
}

export interface CreateOrderRequest {
  customerId?: string;
  userId: string;
  locationId: string;
  shiftId?: string;
  lineItems: {
    productVariantId: string;
    productName: string;
    variantName?: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    taxAmount?: number;
  }[];
  payments: {
    paymentMethodId: string;
    amount: number;
    reference?: string;
  }[];
  discounts?: {
    discountType: 'Percentage' | 'FixedAmount' | 'PromotionCode';
    discountValue: number;
    reason?: string;
  }[];
  notes?: string;
}

export interface OrderWithDetails extends SaleOrder {
  lineItems: OrderLineItem[];
  payments: OrderPayment[];
  discounts?: OrderDiscount[];
}

export class OrderRepository extends BaseRepository {
  /**
   * Create a new sale order
   */
  async createOrder(orderData: CreateOrderRequest): Promise<OrderWithDetails | null> {
    try {
      // Generate order ID and number
      const orderId = this.generateId();
      const orderNumber = await this.generateOrderNumber();

      // Calculate totals
      const subtotal = orderData.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const discountAmount = orderData.lineItems.reduce(
        (sum, item) => sum + (item.discountAmount || 0),
        0
      );
      const taxAmount = orderData.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
      const totalAmount = subtotal - discountAmount + taxAmount;

      // Create order object
      const order: SaleOrder = {
        id: orderId,
        orderNumber,
        customerId: orderData.customerId,
        userId: orderData.userId,
        locationId: orderData.locationId,
        shiftId: orderData.shiftId,
        status: 'Completed',
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        notes: orderData.notes,
        createdAt: this.now(),
        updatedAt: this.now(),
        completedAt: this.now(),
      };

      // Create line items
      const lineItems: OrderLineItem[] = orderData.lineItems.map(item => ({
        id: this.generateId(),
        orderId,
        productVariantId: item.productVariantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
        taxAmount: item.taxAmount || 0,
        totalAmount: item.quantity * item.unitPrice - (item.discountAmount || 0) + (item.taxAmount || 0),
        notes: undefined,
      }));

      // Create payments
      const payments: OrderPayment[] = orderData.payments.map(payment => ({
        id: this.generateId(),
        orderId,
        paymentMethodId: payment.paymentMethodId,
        amount: payment.amount,
        reference: payment.reference,
        status: 'Completed',
        createdAt: this.now(),
      }));

      // Create discounts
      const discounts: OrderDiscount[] =
        orderData.discounts?.map(discount => ({
          id: this.generateId(),
          orderId,
          discountType: discount.discountType,
          discountValue: discount.discountValue,
          discountAmount:
            discount.discountType === 'Percentage'
              ? (subtotal * discount.discountValue) / 100
              : discount.discountValue,
          reason: discount.reason,
        })) || [];

      if (this.isOnline()) {
        // Save to server
        const savedOrder = await this.getApi().post<OrderWithDetails>('/api/orders', {
          order,
          lineItems,
          payments,
          discounts,
        });
        // Also save to local DB for offline access
        await this.saveOrderToLocal(savedOrder);
        return savedOrder;
      } else {
        // Save to local DB with pending sync status
        const orderWithSync = this.addSyncMetadata(order);
        await this.getDb().execute('INSERT INTO SaleOrder VALUES (?)', [
          this.sanitizeForDb(orderWithSync),
        ]);

        // Save line items
        for (const item of lineItems) {
          const itemWithSync = this.addSyncMetadata(item);
          await this.getDb().execute('INSERT INTO OrderLineItem VALUES (?)', [
            this.sanitizeForDb(itemWithSync),
          ]);
        }

        // Save payments
        for (const payment of payments) {
          const paymentWithSync = this.addSyncMetadata(payment);
          await this.getDb().execute('INSERT INTO OrderPayment VALUES (?)', [
            this.sanitizeForDb(paymentWithSync),
          ]);
        }

        // Save discounts
        for (const discount of discounts) {
          const discountWithSync = this.addSyncMetadata(discount);
          await this.getDb().execute('INSERT INTO OrderDiscount VALUES (?)', [
            this.sanitizeForDb(discountWithSync),
          ]);
        }

        return {
          ...order,
          lineItems,
          payments,
          discounts,
        };
      }
    } catch (error) {
      console.error('[OrderRepository] Create order failed:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<OrderWithDetails | null> {
    try {
      if (this.isOnline()) {
        return await this.getApi().get<OrderWithDetails>(`/api/orders/${orderId}`);
      } else {
        const orders = await this.getDb().query<SaleOrder>('SaleOrder', [{ id: orderId }]);
        if (orders.length === 0) return null;

        const order = orders[0];
        const lineItems = await this.getDb().query<OrderLineItem>('OrderLineItem', [{ orderId }]);
        const payments = await this.getDb().query<OrderPayment>('OrderPayment', [{ orderId }]);
        const discounts = await this.getDb().query<OrderDiscount>('OrderDiscount', [{ orderId }]);

        return {
          ...order,
          lineItems,
          payments,
          discounts,
        };
      }
    } catch (error) {
      console.error('[OrderRepository] Get order failed:', error);
      return null;
    }
  }

  /**
   * Get orders for current shift
   */
  async getOrdersByShift(shiftId: string): Promise<SaleOrder[]> {
    try {
      if (this.isOnline()) {
        return await this.getApi().get<SaleOrder[]>(`/api/orders/shift/${shiftId}`);
      } else {
        return await this.getDb().query<SaleOrder>('SaleOrder', [{ shiftId }]);
      }
    } catch (error) {
      console.error('[OrderRepository] Get orders by shift failed:', error);
      return [];
    }
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 50): Promise<SaleOrder[]> {
    try {
      if (this.isOnline()) {
        return await this.getApi().get<SaleOrder[]>('/api/orders/recent', {
          params: { limit },
        });
      } else {
        const orders = await this.getDb().query<SaleOrder>('SaleOrder');
        // Sort by createdAt descending and take limit
        return orders
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      }
    } catch (error) {
      console.error('[OrderRepository] Get recent orders failed:', error);
      return [];
    }
  }

  // Private helper methods

  private async generateOrderNumber(): Promise<string> {
    // Generate order number: ORD-YYYYMMDD-XXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ORD-${dateStr}-${random}`;
  }

  private async saveOrderToLocal(order: OrderWithDetails): Promise<void> {
    try {
      const db = this.getDb();

      await db.execute('INSERT INTO SaleOrder VALUES (?)', [this.sanitizeForDb(order)]);

      for (const item of order.lineItems) {
        await db.execute('INSERT INTO OrderLineItem VALUES (?)', [this.sanitizeForDb(item)]);
      }

      for (const payment of order.payments) {
        await db.execute('INSERT INTO OrderPayment VALUES (?)', [this.sanitizeForDb(payment)]);
      }

      if (order.discounts) {
        for (const discount of order.discounts) {
          await db.execute('INSERT INTO OrderDiscount VALUES (?)', [this.sanitizeForDb(discount)]);
        }
      }
    } catch (error) {
      console.warn('[OrderRepository] Failed to save order to local:', error);
    }
  }
}
