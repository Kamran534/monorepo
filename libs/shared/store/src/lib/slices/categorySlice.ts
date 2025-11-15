/**
 * Category Slice
 *
 * Manages category state with caching to prevent unnecessary API calls
 * Integrates with existing CategoryRepository for data access
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Category types (defined locally to avoid buildable/non-buildable library issues)
export interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  parentCategory?: {
    id: string;
    name: string;
  } | null;
  childCategories?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    image: string | null;
  }>;
  _count?: {
    products: number;
  };
}

export interface GetCategoriesOptions {
  /**
   * Whether to include inactive categories
   * Default: false
   */
  includeInactive?: boolean;
  
  /**
   * Whether to use server for fetching categories
   * If false, will use local database directly
   * If undefined, will check server availability automatically
   */
  useServer?: boolean;
}

export interface GetCategoriesResult {
  success: boolean;
  categories?: Category[];
  error?: string;
  isOffline?: boolean;
}

// Interface for category repository (only methods needed by Redux)
export interface CategoryRepository {
  getCategories(options?: GetCategoriesOptions): Promise<GetCategoriesResult>;
  getCategoryById(categoryId: string, options?: GetCategoriesOptions): Promise<Category | null>;
}

export interface CategoryState {
  // Data
  categories: Category[];
  selectedCategory: Category | null;

  // Loading states
  loading: boolean;
  error: string | null;

  // Metadata
  lastFetched: number | null;
  isOffline: boolean;

  // Cache control
  cacheTimeout: number; // milliseconds
}

const initialState: CategoryState = {
  categories: [],
  selectedCategory: null,
  loading: false,
  error: null,
  lastFetched: null,
  isOffline: false,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes default cache
};

// Async thunk for fetching categories
export const fetchCategories = createAsyncThunk<
  GetCategoriesResult,
  {
    repository: CategoryRepository;
    options?: GetCategoriesOptions;
    forceRefresh?: boolean;
    isOnline?: boolean;
  },
  { rejectValue: string }
>(
  'category/fetchCategories',
  async ({ repository, options, forceRefresh = false }, { rejectWithValue }) => {
    try {
      const result = await repository.getCategories(options);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to fetch categories');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return rejectWithValue(errorMsg);
    }
  },
  {
    condition: ({ forceRefresh = false }, { getState }) => {
      // Always allow if force refresh
      if (forceRefresh) {
        console.log('[Redux] Force refresh requested');
        return true;
      }

      const state = getState() as { category: CategoryState };
      const { lastFetched, cacheTimeout, loading, categories } = state.category;

      // Don't fetch if already loading
      if (loading) {
        console.log('[Redux] Skipping category fetch - already loading');
        return false;
      }

      // Check if we have cached data that's still valid
      if (lastFetched && categories.length > 0) {
        const timeSinceLastFetch = Date.now() - lastFetched;
        if (timeSinceLastFetch < cacheTimeout) {
          console.log('[Redux] Using cached categories (age:', Math.round(timeSinceLastFetch / 1000), 'seconds, valid for', Math.round(cacheTimeout / 1000), 'seconds)');
          return false; // Skip fetch, use cache
        } else {
          console.log('[Redux] Cache expired (age:', Math.round(timeSinceLastFetch / 1000), 'seconds), fetching fresh data');
          return true; // Cache expired, fetch fresh data
        }
      }

      // No cache or empty categories - fetch
      if (!lastFetched || categories.length === 0) {
        console.log('[Redux] No cache found or categories empty, fetching...');
        return true;
      }

      return true;
    },
  }
);

// Async thunk for fetching a single category by ID
export const fetchCategoryById = createAsyncThunk<
  Category,
  {
    repository: CategoryRepository;
    categoryId: string;
    options?: GetCategoriesOptions;
  },
  { rejectValue: string }
>(
  'category/fetchCategoryById',
  async ({ repository, categoryId, options }, { rejectWithValue }) => {
    try {
      const category = await repository.getCategoryById(categoryId, options);

      if (!category) {
        return rejectWithValue(`Category with ID ${categoryId} not found`);
      }

      return category;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return rejectWithValue(errorMsg);
    }
  }
);

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    // Clear categories cache
    clearCache: (state) => {
      state.categories = [];
      state.lastFetched = null;
      state.error = null;
    },

    // Set selected category
    setSelectedCategory: (state, action: PayloadAction<Category | null>) => {
      state.selectedCategory = action.payload;
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
    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload.categories || [];
        state.lastFetched = Date.now();
        state.isOffline = action.payload.isOffline || false;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch categories';
      });

    // Fetch category by ID
    builder
      .addCase(fetchCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCategory = action.payload;

        // Also update the category in the categories array if it exists
        const index = state.categories.findIndex(cat => cat.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        } else {
          state.categories.push(action.payload);
        }

        state.error = null;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch category';
        state.selectedCategory = null;
      });
  },
});

export const {
  clearCache,
  setSelectedCategory,
  setCacheTimeout,
  clearError,
  setOfflineMode,
} = categorySlice.actions;

export default categorySlice.reducer;
