import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CategorySection,
  Loading,
  type CategoryCardItem,
} from '@monorepo/shared-ui';
import {
  useAppDispatch,
  useAppSelector,
  fetchCategories,
  selectCategories,
  selectCategoriesLoading,
  selectCategoriesError,
  selectIsOffline,
  selectCacheAge,
} from '@monorepo/shared-store';
import { WebCategoryRepository, type Category } from '../services/repositories';
import { dataAccessService } from '../services/data-access.service';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

// Singleton repository instance
const categoryRepository = new WebCategoryRepository();

export function Category() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Get data from Redux store
  const categories = useAppSelector(selectCategories);
  const loading = useAppSelector(selectCategoriesLoading);
  const error = useAppSelector(selectCategoriesError);
  const isOffline = useAppSelector(selectIsOffline);
  const cacheAge = useAppSelector(selectCacheAge);

  // Fetch categories on mount (will use cache if available)
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[Category] Checking cache...');
        if (cacheAge !== null) {
          console.log(`[Category] Using cached data (age: ${cacheAge}s)`);
        } else {
          console.log('[Category] No cache found, fetching...');
        }

        // Check connection state
        const connectionState = dataAccessService.getConnectionState();
        console.log('[Category] Connection state:', connectionState);
        console.log('[Category] Data source:', connectionState.dataSource);

        // Dispatch fetch action (will skip if cache is valid)
        await dispatch(
          fetchCategories({
            repository: categoryRepository,
            options: {
              includeInactive: false, // Only active categories
            },
          })
        ).unwrap();

        console.log('[Category] Fetch completed successfully');
      } catch (err) {
        console.error('[Category] ❌ Failed to fetch categories:', err);
      }
    };

    fetchData();
  }, [dispatch, cacheAge]); // dispatch is stable from Redux, cacheAge included for completeness

  // Handler to navigate to category detail page showing products in that category
  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    navigate(`/category/${encodeURIComponent(categoryName)}`, { state: { categoryId } });
  };

  const handleSectionClick = (categoryId: string, categoryName: string) => {
    console.log(`Section ${categoryName} clicked`);
    // Navigate to the parent category's detail page
    navigate(`/category/${encodeURIComponent(categoryName)}`, { state: { categoryId } });
  };

  // Convert Category to CategoryCardItem
  const convertToCardItem = (category: Category): CategoryCardItem => {
    // Build image URL - use server URL for relative paths
    let imageUrl = category.image || '';
    if (imageUrl && !imageUrl.startsWith('http')) {
      // Relative path - prepend server URL
      imageUrl = `${SERVER_URL}/${imageUrl}`;
    }

    return {
      id: category.id,
      name: category.name,
      image: imageUrl,
      onClick: () => handleCategoryClick(category.id, category.name),
    };
  };

  // Filter for parent categories only
  const parentCategories = categories.filter(
    cat => cat.parentCategoryId === null || cat.parentCategoryId === undefined
  );

  // Build hierarchy if needed
  parentCategories.forEach(parent => {
    if (!parent.childCategories) {
      parent.childCategories = categories
        .filter(cat => cat.parentCategoryId === parent.id)
        .map(child => ({
          id: child.id,
          name: child.name,
          isActive: child.isActive,
          image: child.image,
        }));
    }
  });

  // Sort by sortOrder, then by name
  parentCategories.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-40" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Loading
          message={isOffline ? "Loading categories from local storage..." : "Loading categories..."}
          size="lg"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full p-8 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center max-w-2xl">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Categories</h2>
          <p className="text-red-600 mb-4 font-mono text-sm bg-red-50 p-4 rounded">{error}</p>
          <p className="text-gray-600 mb-4">
            Check the browser console (F12) for detailed error logs.
          </p>
          <button
            onClick={() => {
              // Force refresh by passing forceRefresh option
              dispatch(
                fetchCategories({
                  repository: categoryRepository,
                  options: {
                    includeInactive: false,
                  },
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

  if (parentCategories.length === 0) {
    return (
      <div className="h-full w-full p-8 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center">
          <p className="text-gray-600">
            {isOffline ? 'No categories available offline' : 'No categories available'}
          </p>
          {cacheAge !== null && (
            <p className="text-gray-500 text-sm mt-2">
              Last updated: {cacheAge}s ago
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-8 overflow-auto" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Render each parent category as a section with its children */}
      {parentCategories.map((parentCategory) => {
        // Get child categories from the childCategories array
        const childCategories = parentCategory.childCategories || [];

        // Build image URL for parent category
        let parentImageUrl = parentCategory.image || '';
        if (parentImageUrl && !parentImageUrl.startsWith('http')) {
          // For local development, try local assets first, then fallback to server
          parentImageUrl = `/${parentImageUrl}`;
        }
        // If no image, use a placeholder or empty
        if (!parentImageUrl) {
          parentImageUrl = '/assets/images/categories/placeholder.png';
        }

        // Include the parent category itself as the first card
        const categoryItems: CategoryCardItem[] = [
          // Parent category as first item
          {
            id: parentCategory.id,
            name: parentCategory.name,
            image: parentImageUrl,
            onClick: () => handleCategoryClick(parentCategory.id, parentCategory.name),
          },
          // Then add all child categories
          ...childCategories.map((child) => {
            // Build image URL for child category
            let childImageUrl = (child as any).image || '';
            if (childImageUrl && !childImageUrl.startsWith('http')) {
              childImageUrl = `/${childImageUrl}`;
            }
            if (!childImageUrl) {
              childImageUrl = '/assets/images/categories/placeholder.png';
            }

            return {
              id: child.id,
              name: child.name,
              image: childImageUrl,
              onClick: () => handleCategoryClick(child.id, child.name),
            };
          }),
        ];

        return (
          <CategorySection
            key={parentCategory.id}
            title={parentCategory.name}
            categories={categoryItems}
            onTitleClick={() => handleSectionClick(parentCategory.id, parentCategory.name)}
            columns={6}
          />
        );
      })}
    </div>
  );
}
