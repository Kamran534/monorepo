import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CategorySection,
  Loading,
  type CategoryCardItem,
} from '@monorepo/shared-ui';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

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
        
        const result = await window.electronAPI.category.getAll(true); // Include inactive categories

        if (result.success && result.categories) {
          console.log('[Category] Total categories fetched:', result.categories.length);
          console.log('[Category] Categories:', result.categories);

          // Filter for parent categories only (those without parentCategoryId)
          const parents = result.categories.filter(cat => cat.parentCategoryId === null);
          
          console.log('[Category] Parent categories:', parents.length);
          console.log('[Category] Parents:', parents);

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
        } else {
          setError(result.error || 'Failed to fetch categories');
        }
      } catch (err) {
        console.error('[Category] Failed to fetch categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
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

  if (loading) {
    return <Loading fullScreen message="Loading categories..." size="lg" />;
  }

  if (error) {
    return (
      <div className="h-full w-full p-8 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
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
          // For local development, try local assets first
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
