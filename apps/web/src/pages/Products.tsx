import React, { useState, useMemo, useEffect } from 'react';
import { useCart, useToast, Loading } from '@monorepo/shared-ui';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ProductList,
  ProductTabs,
  ProductActionButtons,
  Product,
  ViewMode,
  SortField,
  SortDirection,
  RatingFilter,
  PriceFilter,
  Pagination,
} from '@monorepo/shared-ui';
import {
  useAppDispatch,
  useAppSelector,
  fetchProducts,
  setProductPage,
  selectProducts,
  selectProductsLoading,
  selectProductsError,
  selectProductsIsOffline,
  selectProductCacheAge,
  selectProductPagination,
} from '@monorepo/shared-store';
import { WebProductRepository } from '../services/repositories';

const VIEW_MODE_STORAGE_KEY = 'category.viewMode';
const ACTION_STATE_STORAGE_KEY = 'category.actionState';

// Singleton repository instance
const productRepository = new WebProductRepository();

export function Products() {
  const { addItem } = useCart();
  const { show } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);

  // Get data from Redux store
  const allProducts = useAppSelector(selectProducts);
  const loading = useAppSelector(selectProductsLoading);
  const error = useAppSelector(selectProductsError);
  const isOffline = useAppSelector(selectProductsIsOffline);
  const cacheAge = useAppSelector(selectProductCacheAge);
  const pagination = useAppSelector(selectProductPagination);
  
  // Load view mode from localStorage, default to 'list'
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return (saved === 'list' || saved === 'grid') ? saved : 'list';
  });
  
  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);
  const [sortField, setSortField] = useState<SortField>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return (JSON.parse(saved).sortField as SortField) ?? 'none'; } catch { /* noop */ }
    }
    return 'none';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return (JSON.parse(saved).sortDirection as SortDirection) ?? 'asc'; } catch { /* noop */ }
    }
    return 'asc';
  });
  const [hideDetails, setHideDetails] = useState<boolean>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return Boolean(JSON.parse(saved).hideDetails); } catch { /* noop */ }
    }
    return false;
  });
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return (JSON.parse(saved).ratingFilter as RatingFilter) ?? 'all'; } catch { /* noop */ }
    }
    return 'all';
  });
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return (JSON.parse(saved).priceFilter as PriceFilter) ?? 'all'; } catch { /* noop */ }
    }
    return 'all';
  });

  useEffect(() => {
    const payload = { sortField, sortDirection, hideDetails, ratingFilter, priceFilter };
    sessionStorage.setItem(ACTION_STATE_STORAGE_KEY, JSON.stringify(payload));
  }, [sortField, sortDirection, hideDetails, ratingFilter, priceFilter]);

  // Skip the effect-triggered fetch when we've already fetched manually (e.g., page change)
  const skipPaginationFetchRef = React.useRef(false);

  // Fetch products on mount and when page changes (will use cache if available)
  useEffect(() => {
    if (skipPaginationFetchRef.current) {
      skipPaginationFetchRef.current = false;
      return;
    }

    const fetchData = async () => {
      try {
        console.log('[Products] Checking cache...');
        if (cacheAge !== null) {
          console.log(`[Products] Cache age: ${cacheAge}s`);
        } else {
          console.log('[Products] No cache found, fetching...');
        }

        // Dispatch fetch action with pagination options
        // Redux condition will check cache and skip if valid
        await dispatch(
          fetchProducts({
            repository: productRepository,
            options: {
              page: pagination.page,
              limit: pagination.limit,
            },
            forceRefresh: false, // Let Redux condition handle cache check
          })
        ).unwrap();

        console.log('[Products] Fetch completed successfully');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[Products] ❌ Failed to fetch products:', errorMsg);
        console.error('[Products] Error details:', err);
        console.error('[Products] Error stack:', err instanceof Error ? err.stack : 'N/A');
        
        // Show error toast to user
        show(`Failed to load products: ${errorMsg}`, 'error');
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, pagination.page, pagination.limit]); // Fetch when page or limit changes

  // Handle page change
  const handlePageChange = async (page: number) => {
    if (page === pagination.page) {
      return;
    }

    // Prevent the effect from refetching after we manually fetch
    skipPaginationFetchRef.current = true;
    dispatch(setProductPage(page));

    try {
      await dispatch(
        fetchProducts({
          repository: productRepository,
          options: {
            page,
            limit: pagination.limit,
          },
          forceRefresh: true,
        })
      ).unwrap();
    } catch (err) {
      console.error('[Products] ❌ Failed to fetch page:', err);
    }
  };

  // Helper function to parse price from string (e.g., "$29.99" -> 29.99)
  const parsePrice = (priceStr?: string): number | null => {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  // Filter and sort products
  const products = useMemo(() => {
    let filtered = [...allProducts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => {
        const nameMatch = product.name.toLowerCase().includes(query);
        const productNumberMatch = product.productNumber.toLowerCase().includes(query);
        return nameMatch || productNumberMatch;
      });
    }

    // Apply rating filter
    if (ratingFilter !== 'all') {
      const minRating = parseFloat(ratingFilter.replace('+', ''));
      filtered = filtered.filter(product => {
        if (!product.rating) return false;
        return product.rating >= minRating;
      });
    }

    // Apply price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(product => {
        const price = parsePrice(product.price);
        if (price === null) return false;
        
        switch (priceFilter) {
          case 'under50':
            return price < 50;
          case '50-100':
            return price >= 50 && price < 100;
          case '100-200':
            return price >= 100 && price < 200;
          case 'over200':
            return price >= 200;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    if (sortField !== 'none') {
      filtered = filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'productNumber':
            comparison = a.productNumber.localeCompare(b.productNumber);
            break;
          case 'rating': {
            const aRating = a.rating ?? 0;
            const bRating = b.rating ?? 0;
            comparison = aRating - bRating;
            break;
          }
          default:
            return 0;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [allProducts, sortField, sortDirection, ratingFilter, priceFilter, searchQuery]);

  const handleProductClick = (product: Product) => {
    setSelectedProductId(product.id);
    navigate(`/products/${product.id}`);
  };

  const handleTabChange = (tab: 'products' | 'categories') => {
    if (tab === 'categories') {
      // Navigate back to category page
      navigate('/category');
    }
    // If 'products' tab is clicked, stay on current page (no action needed)
  };

  const handleSortOption = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-40" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Loading
          message={isOffline ? "Loading products from local storage..." : "Loading products..."}
          size="lg"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full p-8 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center max-w-2xl">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Products</h2>
          <p className="text-red-600 mb-4 font-mono text-sm bg-red-50 p-4 rounded">{error}</p>
          <p className="text-gray-600 mb-4">
            Check the browser console (F12) for detailed error logs.
          </p>
          <button
            onClick={() => {
              // Force refresh by passing forceRefresh option
              dispatch(
                fetchProducts({
                  repository: productRepository,
                  forceRefresh: true,
                })
              );
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Breadcrumb and Tabs Section - Sticky */}
      <div className="flex-shrink-0 sticky top-0 z-10" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <ProductTabs activeTab="products" onTabChange={handleTabChange} />
            {/* Action Buttons */}
            <ProductActionButtons
              ratingFilter={ratingFilter}
              priceFilter={priceFilter}
              onRatingFilterChange={setRatingFilter}
              onPriceFilterChange={setPriceFilter}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortOption={handleSortOption}
              hideDetails={hideDetails}
              onHideDetailsChange={setHideDetails}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>
      </div>

      {/* Product List Section */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-hidden">
          <ProductList
            products={products}
            selectedProductId={selectedProductId}
            onProductClick={handleProductClick}
            hideDetails={hideDetails}
            viewMode={viewMode}
            onAddProduct={(product) => {
              const numericPrice = parseFloat((product.price || '0').replace(/[^0-9.]/g, '')) || 0;
              addItem({ name: product.name, price: numericPrice, quantity: 1 });
              show('Added to cart', 'success');
            }}
            className="h-full"
          />
        </div>
        
        {/* Pagination - Hide when searching */}
        {!searchQuery.trim() && pagination.totalPages > 1 && (
          <div className="flex-shrink-0 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-primary)' }}>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={pagination.limit}
              totalItems={pagination.total}
            />
          </div>
        )}
      </div>
    </div>
  );
}
