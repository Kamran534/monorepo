import React from 'react';
import { ComponentProps } from '../../types.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CategoryBreadcrumbProps extends ComponentProps {
  currentCategory: string;
  onBack?: () => void;
}

/**
 * CategoryBreadcrumb Component
 * 
 * Displays breadcrumb navigation for category pages
 * 
 * @example
 * ```tsx
 * import { CategoryBreadcrumb } from '@monorepo/shared-ui';
 * 
 * <CategoryBreadcrumb 
 *   currentCategory="Fashion Accessories"
 *   onBack={() => navigate('/category')}
 * />
 * ```
 */
export function CategoryBreadcrumb({
  currentCategory,
  onBack,
  className = '',
}: CategoryBreadcrumbProps) {
  return (
    <div 
      className={`flex items-center mb-6 ${className}`}
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="mr-2 p-1 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
          style={{ color: 'var(--color-text-primary)' }}
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <span className="text-base font-medium mr-1" style={{ color: 'var(--color-text-primary)' }}>
        {currentCategory}
      </span>
      <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
    </div>
  );
}

