/**
 * Customer Slice
 *
 * Manages customer state with caching to prevent unnecessary API calls
 * Integrates with CustomerRepository for data access
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Customer types (matching the UI component interface)
export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface CreateCustomerData {
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface GetCustomersOptions {
  /**
   * Whether to use server for fetching customers
   * If false, will use local database directly
   * If undefined, will check server availability automatically
   */
  useServer?: boolean;
}

export interface GetCustomersResult {
  success: boolean;
  customers?: Customer[];
  error?: string;
  isOffline?: boolean;
}

export interface CreateCustomerResult {
  success: boolean;
  customer?: Customer;
  error?: string;
}

// Interface for customer repository (only methods needed by Redux)
export interface CustomerRepository {
  getCustomers(options?: GetCustomersOptions): Promise<GetCustomersResult>;
  createCustomer(data: CreateCustomerData, options?: GetCustomersOptions): Promise<CreateCustomerResult>;
  updateCustomer(id: string, data: CreateCustomerData, options?: GetCustomersOptions): Promise<CreateCustomerResult>;
  deleteCustomer(id: string, options?: GetCustomersOptions): Promise<{ success: boolean; error?: string }>;
}

export interface CustomerState {
  // Data
  customers: Customer[];
  selectedCustomer: Customer | null;

  // Loading states
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;

  // Metadata
  lastFetched: number | null;
  isOffline: boolean;

  // Cache control
  cacheTimeout: number; // milliseconds
}

const initialState: CustomerState = {
  customers: [],
  selectedCustomer: null,
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
  lastFetched: null,
  isOffline: false,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes default cache
};

// Repository provider - set once at app initialization
let customerRepository: CustomerRepository | null = null;

/**
 * Configure the customer repository to be used by Redux actions
 * This should be called once during app initialization
 */
export function setCustomerRepository(repository: CustomerRepository): void {
  customerRepository = repository;
  console.log('[CustomerSlice] Repository configured');
}

/**
 * Get the configured repository
 * @throws Error if repository is not configured
 */
function getRepository(): CustomerRepository {
  if (!customerRepository) {
    throw new Error('Customer repository not configured. Call setCustomerRepository() during app initialization.');
  }
  return customerRepository;
}

// Async thunk for fetching customers
export const fetchCustomers = createAsyncThunk<
  GetCustomersResult,
  {
    options?: GetCustomersOptions;
    forceRefresh?: boolean;
  },
  { rejectValue: string }
>(
  'customer/fetchCustomers',
  async ({ options, forceRefresh = false }, { rejectWithValue }) => {
    try {
      const repository = getRepository();
      const result = await repository.getCustomers(options);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to fetch customers');
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
        console.log('[Redux] Force refresh requested for customers');
        return true;
      }

      const state = getState() as { customer: CustomerState };
      const { lastFetched, cacheTimeout, loading, customers } = state.customer;

      // Don't fetch if already loading
      if (loading) {
        console.log('[Redux] Skipping customer fetch - already loading');
        return false;
      }

      // Check if we have cached data that's still valid
      if (lastFetched && customers.length > 0) {
        const timeSinceLastFetch = Date.now() - lastFetched;
        if (timeSinceLastFetch < cacheTimeout) {
          console.log('[Redux] Using cached customers (age:', Math.round(timeSinceLastFetch / 1000), 'seconds)');
          return false; // Skip fetch, use cache
        } else {
          console.log('[Redux] Cache expired, fetching fresh customers');
          return true; // Cache expired, fetch fresh data
        }
      }

      // No cache or empty customers - fetch
      if (!lastFetched || customers.length === 0) {
        console.log('[Redux] No cache found or customers empty, fetching...');
        return true;
      }

      return true;
    },
  }
);

// Async thunk for creating a customer
export const createCustomer = createAsyncThunk<
  CreateCustomerResult,
  {
    data: CreateCustomerData;
    options?: GetCustomersOptions;
  },
  { rejectValue: string }
>(
  'customer/createCustomer',
  async ({ data, options }, { rejectWithValue }) => {
    try {
      const repository = getRepository();
      const result = await repository.createCustomer(data, options);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to create customer');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for updating a customer
export const updateCustomer = createAsyncThunk<
  CreateCustomerResult,
  {
    id: string;
    data: CreateCustomerData;
    options?: GetCustomersOptions;
  },
  { rejectValue: string }
>(
  'customer/updateCustomer',
  async ({ id, data, options }, { rejectWithValue }) => {
    try {
      const repository = getRepository();
      const result = await repository.updateCustomer(id, data, options);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to update customer');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for deleting a customer
export const deleteCustomer = createAsyncThunk<
  { success: boolean; id: string; error?: string },
  {
    id: string;
    options?: GetCustomersOptions;
  },
  { rejectValue: string }
>(
  'customer/deleteCustomer',
  async ({ id, options }, { rejectWithValue }) => {
    try {
      const repository = getRepository();
      const result = await repository.deleteCustomer(id, options);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to delete customer');
      }

      return { ...result, id };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return rejectWithValue(errorMsg);
    }
  }
);

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    // Clear customers cache
    clearCache: (state) => {
      state.customers = [];
      state.lastFetched = null;
      state.error = null;
    },

    // Set selected customer
    setSelectedCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.selectedCustomer = action.payload;
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
    // Fetch customers
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload.customers || [];
        state.lastFetched = Date.now();
        state.isOffline = action.payload.isOffline || false;
        state.error = null;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch customers';
      });

    // Create customer
    builder
      .addCase(createCustomer.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.creating = false;
        if (action.payload.customer) {
          state.customers.push(action.payload.customer);
          // Invalidate cache to force refresh on next fetch
          state.lastFetched = null;
        }
        state.error = null;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload || 'Failed to create customer';
      });

    // Update customer
    builder
      .addCase(updateCustomer.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.updating = false;
        if (action.payload.customer) {
          const index = state.customers.findIndex(c => c.id === action.payload.customer?.id);
          if (index !== -1) {
            state.customers[index] = action.payload.customer;
          }
          // Update selected customer if it's the one being updated
          if (state.selectedCustomer?.id === action.payload.customer.id) {
            state.selectedCustomer = action.payload.customer;
          }
        }
        state.error = null;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || 'Failed to update customer';
      });

    // Delete customer
    builder
      .addCase(deleteCustomer.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.deleting = false;
        // Remove customer from list
        state.customers = state.customers.filter(c => c.id !== action.payload.id);
        // Clear selected customer if it was the deleted one
        if (state.selectedCustomer?.id === action.payload.id) {
          state.selectedCustomer = null;
        }
        state.error = null;
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload || 'Failed to delete customer';
      });
  },
});

export const {
  clearCache,
  setSelectedCustomer,
  setCacheTimeout,
  clearError,
  setOfflineMode,
} = customerSlice.actions;

export default customerSlice.reducer;

