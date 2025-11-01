import React from 'react';
import { ComponentProps } from '../../types.js';

export interface ProductCategory {
  id: string;
  name: string;
  image: string;
  onClick?: () => void;
}

export interface ProductSectionProps extends ComponentProps {
  categories: ProductCategory[];
  title?: string;
}

/**
 * ProductSection Component
 *
 * Displays product categories in a grid with images
 *
 * @example
 * ```tsx
 * import { ProductSection } from '@monorepo/shared-ui';
 *
 * const categories = [
 *   { id: '1', name: 'WOMENS', image: '/images/womens.jpg', onClick: () => {} },
 *   { id: '2', name: 'MENS', image: '/images/mens.jpg', onClick: () => {} },
 * ];
 *
 * <ProductSection categories={categories} title="Products" />
 * ```
 */
export function ProductSection({
  categories,
  title = 'Products',
  className = '',
}: ProductSectionProps) {
  return (
    <div className={`p-6 pt-0 pr-0 pb-0 ${className}`} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Title */}
      <h2
        className="text-xl font-bold mb-2 uppercase"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>

      {/* Category Cards Grid */}
      <div className="flex gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={category.onClick}
            className="relative flex-1 h-[400px] overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            {/* Category Image */}
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Overlay with gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 h-20 flex items-end justify-center pb-3"
              style={{
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))',
              }}
            >
              <span
                className="text-sm font-bold tracking-wider uppercase"
                style={{ color: 'var(--color-text-light)' }}
              >
                {category.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
