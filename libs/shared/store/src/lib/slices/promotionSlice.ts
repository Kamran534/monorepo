/**
 * Promotion Slice
 *
 * Manages promotions and coupons state
 * Integrates with Promotion API for data access
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// ============================================
// Types
// ============================================

export interface Promotion {
  id: string;
  code: string;
  name: string;
  type: 'Percentage' | 'FixedAmount' | 'BuyXGetY' | 'FreeShipping';
  value: number;
  applicableTo: 'EntireOrder' | 'Category' | 'Product' | 'Customer';
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;

  // Usage limits
  usageLimit?: number;
  usageCount: number;
  usageLimitPerCustomer?: number;
  isSingleUse: boolean;

  customerGroupIds?: string[];
  categoryIds?: string[];
  productIds?: string[];
  isActive: boolean;
  requiresCouponCode: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionInput {
  code: string;
  name: string;
  type: 'Percentage' | 'FixedAmount' | 'BuyXGetY' | 'FreeShipping';
  value: number;
  applicableTo: 'EntireOrder' | 'Category' | 'Product' | 'Customer';
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: Date | string;
  endDate: Date | string;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  isSingleUse?: boolean;
  requiresCouponCode?: boolean;
  description?: string;
  customerGroupIds?: string[];
  categoryIds?: string[];
  productIds?: string[];
}

export interface GetPromotionsOptions {
  page?: number;
  limit?: number;
  isActive?: boolean;
  type?: string;
  includeExpired?: boolean;
  useServer?: boolean;
}

export interface GetPromotionsResult {
  success: boolean;
  promotions?: Promotion[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
  isOffline?: boolean;
}

export interface CreatePromotionResult {
  success: boolean;
  promotion?: Promotion;
  error?: string;
}

export interface PromotionStats {
  promotionId: string;
  code: string;
  name: string;
  usageCount: number;
  usageLimit?: number;
  remainingUses?: number;
  totalRevenue: number;
  totalDiscount: number;
  uniqueCustomers: number;
  averageOrderValue: number;
  averageDiscount: number;
}

// Repository interface
export interface PromotionRepository {
  getPromotions(options?: GetPromotionsOptions): Promise<GetPromotionsResult>;
  getPromotionById(id: string): Promise<{ success: boolean; promotion?: Promotion; error?: string }>;
  getPromotionByCode(code: string): Promise<{ success: boolean; promotion?: Promotion; error?: string }>;
  getActivePromotions(): Promise<{ success: boolean; promotions?: Promotion[]; error?: string }>;
  createPromotion(data: CreatePromotionInput): Promise<CreatePromotionResult>;
  updatePromotion(id: string, data: Partial<CreatePromotionInput>): Promise<{ success: boolean; promotion?: Promotion; error?: string }>;
  deletePromotion(id: string): Promise<{ success: boolean; error?: string }>;
  getPromotionStats(id: string): Promise<{ success: boolean; stats?: PromotionStats; error?: string }>;
}

export interface PromotionState {
  // Data
  promotions: Promotion[];
  activePromotions: Promotion[];
  selectedPromotion: Promotion | null;
  promotionStats: PromotionStats | null;

  // Loading states
  loading: boolean;
  loadingActive: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  loadingStats: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalPromotions: number;

  // Metadata
  lastFetched: number | null;
  lastActiveFetched: number | null;
  isOffline: boolean;
  cacheTimeout: number;
}

const initialState: PromotionState = {
  promotions: [],
  activePromotions: [],
  selectedPromotion: null,
  promotionStats: null,
  loading: false,
  loadingActive: false,
  creating: false,
  updating: false,
  deleting: false,
  loadingStats: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  totalPromotions: 0,
  lastFetched: null,
  lastActiveFetched: null,
  isOffline: false,
  cacheTimeout: 10 * 60 * 1000, // 10 minutes
};

// ============================================
// Async Thunks
// ============================================

let repositoryInstance: PromotionRepository | null = null;

export const setPromotionRepository = (repository: PromotionRepository) => {
  repositoryInstance = repository;
};

// Fetch promotions
export const fetchPromotions = createAsyncThunk(
  'promotion/fetchPromotions',
  async (options: GetPromotionsOptions = {}, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.getPromotions(options);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to fetch promotions');
      }

      return {
        promotions: result.promotions || [],
        total: result.total || 0,
        page: result.page || 1,
        totalPages: result.totalPages || 1,
        isOffline: result.isOffline || false,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch promotions');
    }
  }
);

// Fetch active promotions
export const fetchActivePromotions = createAsyncThunk(
  'promotion/fetchActivePromotions',
  async (_, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.getActivePromotions();

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to fetch active promotions');
      }

      return result.promotions || [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch active promotions');
    }
  }
);

// Fetch promotion by ID
export const fetchPromotionById = createAsyncThunk(
  'promotion/fetchPromotionById',
  async (id: string, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.getPromotionById(id);

      if (!result.success || !result.promotion) {
        return rejectWithValue(result.error || 'Promotion not found');
      }

      return result.promotion;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch promotion');
    }
  }
);

// Fetch promotion by code
export const fetchPromotionByCode = createAsyncThunk(
  'promotion/fetchPromotionByCode',
  async (code: string, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.getPromotionByCode(code);

      if (!result.success || !result.promotion) {
        return rejectWithValue(result.error || 'Promotion not found');
      }

      return result.promotion;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch promotion');
    }
  }
);

// Create promotion
export const createPromotion = createAsyncThunk(
  'promotion/createPromotion',
  async (data: CreatePromotionInput, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.createPromotion(data);

      if (!result.success || !result.promotion) {
        return rejectWithValue(result.error || 'Failed to create promotion');
      }

      return result.promotion;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create promotion');
    }
  }
);

// Update promotion
export const updatePromotion = createAsyncThunk(
  'promotion/updatePromotion',
  async ({ id, data }: { id: string; data: Partial<CreatePromotionInput> }, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.updatePromotion(id, data);

      if (!result.success || !result.promotion) {
        return rejectWithValue(result.error || 'Failed to update promotion');
      }

      return result.promotion;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update promotion');
    }
  }
);

// Delete promotion
export const deletePromotion = createAsyncThunk(
  'promotion/deletePromotion',
  async (id: string, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.deletePromotion(id);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to delete promotion');
      }

      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete promotion');
    }
  }
);

// Fetch promotion stats
export const fetchPromotionStats = createAsyncThunk(
  'promotion/fetchPromotionStats',
  async (id: string, { rejectWithValue }) => {
    if (!repositoryInstance) {
      return rejectWithValue('Repository not initialized');
    }

    try {
      const result = await repositoryInstance.getPromotionStats(id);

      if (!result.success || !result.stats) {
        return rejectWithValue(result.error || 'Failed to fetch promotion stats');
      }

      return result.stats;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch promotion stats');
    }
  }
);

// ============================================
// Slice
// ============================================

const promotionSlice = createSlice({
  name: 'promotion',
  initialState,
  reducers: {
    setSelectedPromotion: (state, action: PayloadAction<Promotion | null>) => {
      state.selectedPromotion = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetPromotionsCache: (state) => {
      state.lastFetched = null;
      state.lastActiveFetched = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch promotions
    builder
      .addCase(fetchPromotions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPromotions.fulfilled, (state, action) => {
        state.loading = false;
        state.promotions = action.payload.promotions;
        state.totalPromotions = action.payload.total;
        state.currentPage = action.payload.page;
        state.totalPages = action.payload.totalPages;
        state.isOffline = action.payload.isOffline;
        state.lastFetched = Date.now();
      })
      .addCase(fetchPromotions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch active promotions
    builder
      .addCase(fetchActivePromotions.pending, (state) => {
        state.loadingActive = true;
        state.error = null;
      })
      .addCase(fetchActivePromotions.fulfilled, (state, action) => {
        state.loadingActive = false;
        state.activePromotions = action.payload;
        state.lastActiveFetched = Date.now();
      })
      .addCase(fetchActivePromotions.rejected, (state, action) => {
        state.loadingActive = false;
        state.error = action.payload as string;
      });

    // Fetch promotion by ID
    builder
      .addCase(fetchPromotionById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPromotionById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPromotion = action.payload;
      })
      .addCase(fetchPromotionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch promotion by code
    builder
      .addCase(fetchPromotionByCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPromotionByCode.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPromotion = action.payload;
      })
      .addCase(fetchPromotionByCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create promotion
    builder
      .addCase(createPromotion.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createPromotion.fulfilled, (state, action) => {
        state.creating = false;
        state.promotions.unshift(action.payload);
        state.totalPromotions += 1;
      })
      .addCase(createPromotion.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      });

    // Update promotion
    builder
      .addCase(updatePromotion.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updatePromotion.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.promotions.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.promotions[index] = action.payload;
        }
        if (state.selectedPromotion?.id === action.payload.id) {
          state.selectedPromotion = action.payload;
        }
      })
      .addCase(updatePromotion.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      });

    // Delete promotion
    builder
      .addCase(deletePromotion.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deletePromotion.fulfilled, (state, action) => {
        state.deleting = false;
        state.promotions = state.promotions.filter(p => p.id !== action.payload);
        state.totalPromotions -= 1;
        if (state.selectedPromotion?.id === action.payload) {
          state.selectedPromotion = null;
        }
      })
      .addCase(deletePromotion.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });

    // Fetch promotion stats
    builder
      .addCase(fetchPromotionStats.pending, (state) => {
        state.loadingStats = true;
        state.error = null;
      })
      .addCase(fetchPromotionStats.fulfilled, (state, action) => {
        state.loadingStats = false;
        state.promotionStats = action.payload;
      })
      .addCase(fetchPromotionStats.rejected, (state, action) => {
        state.loadingStats = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSelectedPromotion,
  clearError,
  resetPromotionsCache,
} = promotionSlice.actions;

export default promotionSlice.reducer;
