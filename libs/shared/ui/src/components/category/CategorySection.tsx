import React from 'react';
import { ComponentProps } from '../../types.js';
import { CategoryCard, CategoryCardItem } from './CategoryCard.js';
import { ChevronRight } from 'lucide-react';

export interface CategorySectionProps extends ComponentProps {
  title: string;
  categories: CategoryCardItem[];
  onTitleClick?: () => void;
  columns?: number;
}

/**
 * CategorySection Component
 * 
 * Displays a section with a title and grid of category cards
 * 
 * @example
 * ```tsx
 * import { CategorySection } from '@monorepo/shared-ui';
 * 
 * const categories = [
 *   { id: '1', name: 'Fashion Accessories', onClick: () => {} },
 *   { id: '2', name: 'Fashion Sunglasses', onClick: () => {} },
 * ];
 * 
 * <CategorySection title="Fashion Accessories" categories={categories} />
 * ```
 */
export function CategorySection({
  title,
  categories,
  onTitleClick,
  columns = 6,
  className = '',
}: CategorySectionProps) {
  return (
    <div className={`mb-8 ${className}`} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Section Title */}
      <button
        onClick={onTitleClick}
        className="flex items-center mb-4 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ color: 'var(--color-text-primary)' }}
      >
        <h2 className="text-lg font-semibold mr-1">
          {title}
        </h2>
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Category Cards Grid */}
      <div 
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
        }}
      >
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}

