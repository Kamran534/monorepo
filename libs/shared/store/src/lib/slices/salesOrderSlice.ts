/**
 * Sales Order Slice
 *
 * Manages sales order state with comprehensive discount support
 * Integrates with SalesOrder API for data access
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// ============================================
// Types
// ============================================

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

export interface OrderLineItem extends OrderLineItemInput {
  id: string;
  lineSubtotal: number;
  lineDiscount: number;
  lineDiscountPercent: number;
  customDiscountAmount: number;
  customDiscountPercent: number;
  lineTotal: number;
  variant?: {
    id: string;
    sku: string;
    variantName: string;
    product?: {
      id: string;
      name: string;
    };
  };
  salesPerson?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

// Payment Types
export type PaymentMethodType = 'Cash' | 'Card' | 'BankTransfer' | 'Check' | 'GiftCard' | 'StoreCredit' | 'OnAccount';

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: PaymentMethodType;
  isActive: boolean;
  requiresAuthorization: boolean;
  icon?: string;
  sortOrder: number;
}

export interface OrderPaymentInput {
  paymentMethodId: string;
  amount: number;
  transactionId?: string;
  authorizationCode?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export interface OrderPayment extends OrderPaymentInput {
  id: string;
  orderId: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  processedAt: string;
  refundedAmount: number;
  createdAt: string;
  paymentMethod?: PaymentMethod;
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

  // Amounts
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  discountPercent: number;
  adjustmentAmount: number;
  adjustmentReason?: string;
  couponCode?: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  changeAmount: number;

  // Related data
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  cashier?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lineItems?: OrderLineItem[];
  payments?: OrderPayment[];

  notes?: string;
  customerNotes?: string;
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
  couponCode?: string;
  notes?: string;
  customerNotes?: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  error?: string;
  promotion?: any;
  discountAmount?: number;
}

export interface GetOrdersOptions {
  page?: number;
  limit?: number;
  customerId?: string;
  locationId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  useServer?: boolean;
}

export interface GetOrdersResult {
  success: boolean;
  orders?: SalesOrder[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
  isOffline?: boolean;
}

export interface CreateOrderResult {
  success: boolean;
  order?: SalesOrder;
  error?: string;
}

// Repository interface
export interface SalesOrderRepository {
  getOrders(options?: GetOrdersOptions): Promise<GetOrdersResult>;
  getOrderById(id: string): Promise<{ success: boolean; order?: SalesOrder; error?: string }>;
  getOrderByNumber(orderNumber: string): Promise<{ success: boolean; data?: any; error?: string }>;
  getVariantDetails?(variantId: string): Promise<{
    variantId: string;
    productId?: string;
    variantName?: string;
    productName?: string;
    sku?: string;
  } | null>;
  createOrder(data: CreateSalesOrderInput): Promise<CreateOrderResult>;
  updateOrderStatus(id: string, status: string): Promise<{ success: boolean; error?: string }>;
  validateCoupon(couponCode: string, customerId?: string): Promise<CouponValidationResult>;
  addPayment(orderId: string, paymentMethodId: string, amount: number): Promise<{ success: boolean; error?: string }>;
}

export interface SalesOrderState {
  // Data
  orders: SalesOrder[];
  currentOrder: SalesOrder | null;
  selectedOrder: SalesOrder | null;

  // Loading states
  loading: boolean;
  creating: boolean;
  updating: boolean;
  validatingCoupon: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalOrders: number;

  // Metadata
  lastFetched: number | null;
  isOffline: boolean;
  cacheTimeout: number;

  // Coupon validation
  couponValidation: CouponValidationResult | null;
}

const initialState: SalesOrderState = {
  orders: [],
  currentOrder: null,
  selectedOrder: null,
  loading: false,
  creating: false,
  updating: false,
  validatingCoupon: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  totalOrders: 0,
  lastFetched: null,
  isOffline: false,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  couponValidation: null,
};

// ============================================
// Async Thunks
// ============================================

let repositoryInstance: SalesOrderRepository | null = null;

export const setSalesOrderRepository = (repository: SalesOrderRepository) => {
  repositoryInstance = repository;
};

// Fetch orders
export const fetchOrders = createAsyncThunk(
  'salesOrder/fetchOrders',
  async (options: GetOrdersOptions = {}, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.getOrders(options);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to fetch orders');
      }

      return {
        orders: result.orders || [],
        total: result.total || 0,
        page: result.page || 1,
        totalPages: result.totalPages || 1,
        isOffline: result.isOffline || false,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch orders');
    }
  }
);

// Fetch order by ID
export const fetchOrderById = createAsyncThunk(
  'salesOrder/fetchOrderById',
  async (id: string, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.getOrderById(id);

      if (!result.success || !result.order) {
        return rejectWithValue(result.error || 'Order not found');
      }

      return result.order;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch order');
    }
  }
);

// Create order
export const createOrder = createAsyncThunk(
  'salesOrder/createOrder',
  async (data: CreateSalesOrderInput, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.createOrder(data);

      if (!result.success || !result.order) {
        return rejectWithValue(result.error || 'Failed to create order');
      }

      return result.order;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create order');
    }
  }
);

// Update order status
export const updateOrderStatus = createAsyncThunk(
  'salesOrder/updateOrderStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.updateOrderStatus(id, status);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to update order status');
      }

      return { id, status };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update order status');
    }
  }
);

// Validate coupon
export const validateCoupon = createAsyncThunk(
  'salesOrder/validateCoupon',
  async ({ couponCode, customerId }: { couponCode: string; customerId?: string }, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.validateCoupon(couponCode, customerId);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to validate coupon');
    }
  }
);

// Add payment
export const addPayment = createAsyncThunk(
  'salesOrder/addPayment',
  async ({ orderId, paymentMethodId, amount }: { orderId: string; paymentMethodId: string; amount: number }, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.addPayment(orderId, paymentMethodId, amount);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to add payment');
      }

      return { orderId, paymentMethodId, amount };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add payment');
    }
  }
);

// ============================================
// Slice
// ============================================

const salesOrderSlice = createSlice({
  name: 'salesOrder',
  initialState,
  reducers: {
    setCurrentOrder: (state, action: PayloadAction<SalesOrder | null>) => {
      state.currentOrder = action.payload;
    },
    setSelectedOrder: (state, action: PayloadAction<SalesOrder | null>) => {
      state.selectedOrder = action.payload;
    },
    clearCouponValidation: (state) => {
      state.couponValidation = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetOrdersCache: (state) => {
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders;
        state.totalOrders = action.payload.total;
        state.currentPage = action.payload.page;
        state.totalPages = action.payload.totalPages;
        state.isOffline = action.payload.isOffline;
        state.lastFetched = Date.now();
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch order by ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create order
    builder
      .addCase(createOrder.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.creating = false;
        state.currentOrder = action.payload;
        state.orders.unshift(action.payload);
        state.totalOrders += 1;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      });

    // Update order status
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.updating = false;
        const { id, status } = action.payload;

        // Update in orders list
        const orderIndex = state.orders.findIndex(o => o.id === id);
        if (orderIndex !== -1) {
          state.orders[orderIndex].status = status as any;
        }

        // Update selected order
        if (state.selectedOrder?.id === id) {
          state.selectedOrder.status = status as any;
        }

        // Update current order
        if (state.currentOrder?.id === id) {
          state.currentOrder.status = status as any;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      });

    // Validate coupon
    builder
      .addCase(validateCoupon.pending, (state) => {
        state.validatingCoupon = true;
        state.error = null;
        state.couponValidation = null;
      })
      .addCase(validateCoupon.fulfilled, (state, action) => {
        state.validatingCoupon = false;
        state.couponValidation = action.payload;
      })
      .addCase(validateCoupon.rejected, (state, action) => {
        state.validatingCoupon = false;
        state.error = action.payload as string;
        state.couponValidation = { isValid: false, error: action.payload as string };
      });

    // Add payment
    builder
      .addCase(addPayment.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(addPayment.fulfilled, (state) => {
        state.updating = false;
        // Payment added successfully - refetch order if needed
      })
      .addCase(addPayment.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentOrder,
  setSelectedOrder,
  clearCouponValidation,
  clearError,
  resetOrdersCache,
} = salesOrderSlice.actions;

export default salesOrderSlice.reducer;
