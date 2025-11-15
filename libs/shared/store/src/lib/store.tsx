/**
 * Redux Store Configuration
 *
 * Central store for state management across all apps (web, desktop, mobile)
 */

import { configureStore } from '@reduxjs/toolkit';
import categoryReducer from './slices/categorySlice';
import productReducer from './slices/productSlice';
import customerReducer from './slices/customerSlice';

export const createStore = () => {
  return configureStore({
    reducer: {
      category: categoryReducer,
      product: productReducer,
      customer: customerReducer,
      // Add more reducers here as needed (inventory, etc.)
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types for date serialization
          ignoredActions: ['category/fetchCategories/fulfilled', 'product/fetchProducts/fulfilled', 'customer/fetchCustomers/fulfilled'],
          // Ignore these field paths in all actions
          ignoredActionPaths: ['payload.timestamp', 'meta.arg.timestamp'],
          // Ignore these paths in the state
          ignoredPaths: ['category.lastFetched', 'product.lastFetched', 'customer.lastFetched'],
        },
      }),
  });
};

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
