import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CategorySection,
  Loading,
  type CategoryCardItem,
} from '@monorepo/shared-ui';
import { WebCategoryRepository, type Category } from '../services/repositories';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

// Singleton repository instance
const categoryRepository = new WebCategoryRepository();

export function Category() {
  const navigate = useNavigate();
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        setError(null);
        
        // Debug: Check IndexedDB directly
        let rawCategories: any[] = [];
        try {
          const dbName = 'cpos_web_db';
          const dbRequest = indexedDB.open(dbName);
          
          await new Promise<void>((resolve, reject) => {
            dbRequest.onsuccess = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              console.log('[Category] 📊 IndexedDB opened successfully');
              console.log('[Category] 📊 Object stores:', Array.from(db.objectStoreNames));
              
              const transaction = db.transaction('Category', 'readonly');
              const store = transaction.objectStore('Category');
              console.log('[Category] 📊 Store indexes:', Array.from(store.indexNames));
              
              const getAllRequest = store.getAll();
              
              getAllRequest.onsuccess = () => {
                rawCategories = getAllRequest.result;
                console.log('[Category] 📊 Direct IndexedDB - Categories in store:', rawCategories.length);
                console.log('[Category] 📊 First 3 categories:', rawCategories.slice(0, 3));
                console.log('[Category] 📊 Sample category structure:', rawCategories[0]);
                
                // Check parentCategoryId values
                const parents = rawCategories.filter(c => c.parentCategoryId === null || c.parentCategoryId === undefined);
                const children = rawCategories.filter(c => c.parentCategoryId !== null && c.parentCategoryId !== undefined);
                console.log('[Category] 📊 Parent categories (null parentCategoryId):', parents.length);
                console.log('[Category] 📊 Child categories (has parentCategoryId):', children.length);
                console.log('[Category] 📊 Parent category names:', parents.map(p => p.name));
                
                resolve();
              };
              
              getAllRequest.onerror = () => {
                console.error('[Category] ❌ IndexedDB getAll failed:', getAllRequest.error);
                reject(getAllRequest.error);
              };
            };
            
            dbRequest.onerror = () => {
              console.error('[Category] ❌ IndexedDB open failed:', dbRequest.error);
              reject(dbRequest.error);
            };
          });
        } catch (dbError) {
          console.error('[Category] ❌ Error checking IndexedDB directly:', dbError);
        }
        
        // Check data source
        const { dataAccessService } = await import('../services/data-access.service');
        const connectionState = dataAccessService.getConnectionState();
        console.log('[Category] Connection state:', connectionState);
        console.log('[Category] Will fetch from:', connectionState.dataSource === 'server' ? 'SERVER' : 'LOCAL DB');
        
        console.log('[Category] About to call categoryRepository.getCategories...');
        let categories: any[] = [];
        
        try {
          categories = await categoryRepository.getCategories({
            includeInactive: true, // Include all categories (active and inactive)
          });
          console.log('[Category] ✅ Repository returned:', categories.length, 'categories');
        } catch (repoError) {
          console.error('[Category] ❌ Repository failed, using raw data:', repoError);
          // Fallback: Use raw categories from direct IndexedDB query
          if (rawCategories.length > 0) {
            console.log('[Category] 🔄 Fallback: Using', rawCategories.length, 'raw categories from IndexedDB');
            categories = rawCategories;
          } else {
            throw new Error('Both repository and raw IndexedDB query failed');
          }
        }

        console.log('[Category] ✅ Total categories to process:', categories.length);
        console.log('[Category] Categories data:', categories);
        console.log('[Category] First 3 categories:', categories.slice(0, 3));

        // Filter for parent categories only (those without parentCategoryId)
        const parents = categories.filter(cat => cat.parentCategoryId === null || cat.parentCategoryId === undefined);
        
        console.log('[Category] Parent categories found:', parents.length);
        console.log('[Category] Parent category names:', parents.map(p => p.name));

        // Build hierarchy if childCategories not populated (fallback case)
        if (parents.length > 0 && !parents[0].childCategories) {
          console.log('[Category] 🔧 Building hierarchy manually (childCategories not populated)');
          parents.forEach(parent => {
            parent.childCategories = categories
              .filter(cat => cat.parentCategoryId === parent.id)
              .map(child => ({
                id: child.id,
                name: child.name,
                isActive: child.isActive,
                image: child.image // Include image field
              }));
            console.log(`[Category] Parent "${parent.name}" has ${parent.childCategories.length} children`);
          });
        }

        // Calculate total cards (parent + all their children)
        const totalCards = parents.reduce((sum, parent) => {
          return sum + 1 + (parent.childCategories?.length || 0);
        }, 0);
        console.log('[Category] Total cards to display:', totalCards);
        
        // Sort by sortOrder, then by name
        parents.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return a.name.localeCompare(b.name);
        });

        setParentCategories(parents);
      } catch (err) {
        console.error('[Category] ❌ Failed to fetch categories:', err);
        console.error('[Category] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
        console.error('[Category] Setting error message:', errorMessage);
        setError(errorMessage);
      } finally {
        console.log('[Category] Setting loading to false');
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

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

  if (loading) {
    return <Loading fullScreen message="Loading categories..." size="lg" />;
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
            onClick={() => window.location.reload()}
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
          <p className="text-gray-600">No categories available</p>
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
