/**
 * Redux Store Configuration
 *
 * Central store for state management across all apps (web, desktop, mobile)
 */

import { configureStore } from '@reduxjs/toolkit';
import categoryReducer from './slices/categorySlice';
import productReducer from './slices/productSlice';
import customerReducer from './slices/customerSlice';
import salesOrderReducer from './slices/salesOrderSlice';
import promotionReducer from './slices/promotionSlice';

export const createStore = () => {
  return configureStore({
    reducer: {
      category: categoryReducer,
      product: productReducer,
      customer: customerReducer,
      salesOrder: salesOrderReducer,
      promotion: promotionReducer,
      // Add more reducers here as needed (inventory, etc.)
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types for date serialization
          ignoredActions: [
            'category/fetchCategories/fulfilled',
            'product/fetchProducts/fulfilled',
            'customer/fetchCustomers/fulfilled',
            'salesOrder/fetchOrders/fulfilled',
            'salesOrder/createOrder/fulfilled',
            'promotion/fetchPromotions/fulfilled',
            'promotion/createPromotion/fulfilled',
          ],
          // Ignore these field paths in all actions
          ignoredActionPaths: ['payload.timestamp', 'meta.arg.timestamp', 'meta.arg.startDate', 'meta.arg.endDate'],
          // Ignore these paths in the state
          ignoredPaths: [
            'category.lastFetched',
            'product.lastFetched',
            'customer.lastFetched',
            'salesOrder.lastFetched',
            'promotion.lastFetched',
            'promotion.lastActiveFetched',
          ],
        },
      }),
  });
};

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
