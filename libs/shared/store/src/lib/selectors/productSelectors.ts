/**
 * Product Selectors
 *
 * Memoized selectors for efficient data access from Redux store
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { Product } from '../slices/productSlice';

// Base selectors
export const selectProductState = (state: RootState) => state.product;

export const selectProducts = (state: RootState) => state.product.products;

export const selectProductsLoading = (state: RootState) => state.product.loading;

export const selectProductsError = (state: RootState) => state.product.error;

export const selectSelectedProduct = (state: RootState) => state.product.selectedProduct;

export const selectProductsIsOffline = (state: RootState) => state.product.isOffline;

export const selectProductsLastFetched = (state: RootState) => state.product.lastFetched;

// Memoized selectors
export const selectProductById = createSelector(
  [selectProducts, (_state: RootState, productId: string) => productId],
  (products, productId) => products.find(product => product.id === productId) || null
);

export const selectProductsByCategoryId = createSelector(
  [selectProducts, (_state: RootState, categoryId: string | null) => categoryId],
  (products, categoryId) => {
    if (categoryId === null) {
      return products.filter(product => !product.categoryId);
    }
    return products.filter(product => product.categoryId === categoryId);
  }
);

export const selectProductCount = createSelector(
  [selectProducts],
  (products) => products.length
);

// Check if cache is fresh
export const selectProductIsCacheFresh = createSelector(
  [selectProductsLastFetched, selectProductState],
  (lastFetched, productState) => {
    if (!lastFetched) return false;
    const timeSinceLastFetch = Date.now() - lastFetched;
    return timeSinceLastFetch < productState.cacheTimeout;
  }
);

// Get cache age in seconds
export const selectProductCacheAge = createSelector(
  [selectProductsLastFetched],
  (lastFetched) => {
    if (!lastFetched) return null;
    return Math.round((Date.now() - lastFetched) / 1000);
  }
);

// Pagination selectors
export const selectProductPagination = (state: RootState) => state.product.pagination;

