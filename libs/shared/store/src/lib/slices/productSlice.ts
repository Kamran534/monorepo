/**
 * Product Slice
 *
 * Manages product state with caching to prevent unnecessary API calls
 * Integrates with ProductRepository for data access
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Product {
  id: string;
  productNumber: string;
  name: string;
  description?: string;
  categoryId?: string;
  price: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

export interface GetProductsResult {
  success: boolean;
  products: Product[];
  error?: string;
  isOffline: boolean;
}

export interface ProductRepository {
  getAllProducts(): Promise<GetProductsResult>;
}

export interface ProductState {
  // Data
  products: Product[];
  selectedProduct: Product | null;

  // Loading states
  loading: boolean;
  error: string | null;

  // Metadata
  lastFetched: number | null;
  isOffline: boolean;

  // Cache control
  cacheTimeout: number; // milliseconds
}

const initialState: ProductState = {
  products: [],
  selectedProduct: null,
  loading: false,
  error: null,
  lastFetched: null,
  isOffline: false,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes default cache
};

// Async thunk for fetching products
export const fetchProducts = createAsyncThunk<
  GetProductsResult,
  {
    repository: ProductRepository;
    forceRefresh?: boolean;
  },
  { rejectValue: string }
>(
  'product/fetchProducts',
  async ({ repository, forceRefresh = false }, { rejectWithValue }) => {
    try {
      const result = await repository.getAllProducts();

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to fetch products');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return rejectWithValue(errorMsg);
    }
  },
  {
    condition: ({ forceRefresh = false }, { getState }) => {
      // Skip fetch if cache is still valid (unless force refresh)
      if (forceRefresh) return true;

      const state = getState() as { product: ProductState };
      const { lastFetched, cacheTimeout, loading } = state.product;

      // Don't fetch if already loading
      if (loading) {
        console.log('[Redux] Skipping product fetch - already loading');
        return false;
      }

      // Check if cache is still valid
      if (lastFetched) {
        const timeSinceLastFetch = Date.now() - lastFetched;
        if (timeSinceLastFetch < cacheTimeout) {
          console.log('[Redux] Using cached products (age:', Math.round(timeSinceLastFetch / 1000), 'seconds)');
          return false;
        }
      }

      return true;
    },
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    // Clear products cache
    clearCache: (state) => {
      state.products = [];
      state.lastFetched = null;
      state.error = null;
    },

    // Set selected product
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },

    // Update cache timeout
    setCacheTimeout: (state, action: PayloadAction<number>) => {
      state.cacheTimeout = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Manual offline mode toggle (for testing)
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.isOffline = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products || [];
        state.lastFetched = Date.now();
        state.isOffline = action.payload.isOffline || false;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch products';
      });
  },
});

export const {
  clearCache,
  setSelectedProduct,
  setCacheTimeout,
  clearError,
  setOfflineMode,
} = productSlice.actions;

export default productSlice.reducer;

