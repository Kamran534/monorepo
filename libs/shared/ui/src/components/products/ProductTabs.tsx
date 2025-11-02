import React from 'react';
import { ComponentProps } from '../../types.js';

export type ProductTab = 'products' | 'categories';

export interface ProductTabsProps extends ComponentProps {
  activeTab: ProductTab;
  onTabChange?: (tab: ProductTab) => void;
}

/**
 * ProductTabs Component
 * 
 * Displays tabs for Products and Categories
 * 
 * @example
 * ```tsx
 * import { ProductTabs } from '@monorepo/shared-ui';
 * 
 * <ProductTabs activeTab="products" onTabChange={(tab) => {}} />
 * ```
 */
export function ProductTabs({
  activeTab,
  onTabChange,
  className = '',
}: ProductTabsProps) {
  return (
    <div className={`flex gap-1 ${className}`} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <button
        onClick={() => onTabChange?.('products')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'products' ? '' : 'opacity-60 hover:opacity-80'
        }`}
        style={{
          color: activeTab === 'products' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          borderBottom: activeTab === 'products' ? '2px solid var(--color-primary-500)' : '2px solid transparent',
        }}
      >
        Products
      </button>
      <button
        onClick={() => onTabChange?.('categories')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'categories' ? '' : 'opacity-60 hover:opacity-80'
        }`}
        style={{
          color: activeTab === 'categories' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          borderBottom: activeTab === 'categories' ? '2px solid var(--color-primary-500)' : '2px solid transparent',
        }}
      >
        Categories
      </button>
    </div>
  );
}

