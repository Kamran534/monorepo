/**
 * Shared Redux Store Library
 *
 * Centralized state management for all apps (web, desktop, mobile)
 */

// Store configuration
export { createStore } from './lib/store';
export type { AppStore, RootState, AppDispatch } from './lib/store';

// Provider
export { StoreProvider } from './lib/provider';

// Typed hooks
export { useAppDispatch, useAppSelector } from './lib/hooks';

// Category slice
export {
  fetchCategories,
  fetchCategoryById,
  clearCache,
  setSelectedCategory,
  setCacheTimeout,
  clearError,
  setOfflineMode,
} from './lib/slices/categorySlice';
export type { CategoryState } from './lib/slices/categorySlice';

// Category selectors
export {
  selectCategoryState,
  selectCategories,
  selectCategoriesLoading,
  selectCategoriesError,
  selectSelectedCategory,
  selectIsOffline,
  selectLastFetched,
  selectActiveCategories,
  selectRootCategories,
  selectCategoriesByParentId,
  selectCategoryById,
  selectCategoriesWithProducts,
  selectCategoryCount,
  selectActiveCategoryCount,
  selectIsCacheFresh,
  selectCacheAge,
} from './lib/selectors/categorySelectors';

// Product slice
export {
  fetchProducts,
  clearCache as clearProductCache,
  setSelectedProduct,
  setCacheTimeout as setProductCacheTimeout,
  clearError as clearProductError,
  setOfflineMode as setProductOfflineMode,
} from './lib/slices/productSlice';
export type { ProductState, Product, ProductRepository, GetProductsResult } from './lib/slices/productSlice';

// Product selectors
export {
  selectProductState,
  selectProducts,
  selectProductsLoading,
  selectProductsError,
  selectSelectedProduct,
  selectProductsIsOffline,
  selectProductsLastFetched,
  selectProductById,
  selectProductsByCategoryId,
  selectProductCount,
  selectProductIsCacheFresh,
  selectProductCacheAge,
} from './lib/selectors/productSelectors';
