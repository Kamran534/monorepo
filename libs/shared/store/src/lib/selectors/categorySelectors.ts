/**
 * Category Selectors
 *
 * Memoized selectors for efficient data access from Redux store
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { Category } from '@monorepo/shared-data-access';

// Base selectors
export const selectCategoryState = (state: RootState) => state.category;

export const selectCategories = (state: RootState) => state.category.categories;

export const selectCategoriesLoading = (state: RootState) => state.category.loading;

export const selectCategoriesError = (state: RootState) => state.category.error;

export const selectSelectedCategory = (state: RootState) => state.category.selectedCategory;

export const selectIsOffline = (state: RootState) => state.category.isOffline;

export const selectLastFetched = (state: RootState) => state.category.lastFetched;

// Memoized selectors
export const selectActiveCategories = createSelector(
  [selectCategories],
  (categories) => categories.filter(cat => cat.isActive)
);

export const selectRootCategories = createSelector(
  [selectActiveCategories],
  (categories) => categories.filter(cat => !cat.parentCategoryId)
);

export const selectCategoriesByParentId = createSelector(
  [selectCategories, (_state: RootState, parentId: string | null) => parentId],
  (categories, parentId) => {
    if (parentId === null) {
      return categories.filter(cat => !cat.parentCategoryId);
    }
    return categories.filter(cat => cat.parentCategoryId === parentId);
  }
);

export const selectCategoryById = createSelector(
  [selectCategories, (_state: RootState, categoryId: string) => categoryId],
  (categories, categoryId) => categories.find(cat => cat.id === categoryId) || null
);

export const selectCategoriesWithProducts = createSelector(
  [selectActiveCategories],
  (categories) => categories.filter(cat => cat._count && cat._count.products > 0)
);

export const selectCategoryCount = createSelector(
  [selectCategories],
  (categories) => categories.length
);

export const selectActiveCategoryCount = createSelector(
  [selectActiveCategories],
  (categories) => categories.length
);

// Check if cache is fresh
export const selectIsCacheFresh = createSelector(
  [selectLastFetched, selectCategoryState],
  (lastFetched, categoryState) => {
    if (!lastFetched) return false;
    const timeSinceLastFetch = Date.now() - lastFetched;
    return timeSinceLastFetch < categoryState.cacheTimeout;
  }
);

// Get cache age in seconds
export const selectCacheAge = createSelector(
  [selectLastFetched],
  (lastFetched) => {
    if (!lastFetched) return null;
    return Math.round((Date.now() - lastFetched) / 1000);
  }
);
