/**
 * Redux Store Configuration
 *
 * Central store for state management across all apps (web, desktop, mobile)
 */

import { configureStore } from '@reduxjs/toolkit';
import categoryReducer from './slices/categorySlice';
import productReducer from './slices/productSlice';

export const createStore = () => {
  return configureStore({
    reducer: {
      category: categoryReducer,
      product: productReducer,
      // Add more reducers here as needed (inventory, etc.)
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types for date serialization
          ignoredActions: ['category/fetchCategories/fulfilled', 'product/fetchProducts/fulfilled'],
          // Ignore these field paths in all actions
          ignoredActionPaths: ['payload.timestamp', 'meta.arg.timestamp'],
          // Ignore these paths in the state
          ignoredPaths: ['category.lastFetched', 'product.lastFetched'],
        },
      }),
  });
};

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
