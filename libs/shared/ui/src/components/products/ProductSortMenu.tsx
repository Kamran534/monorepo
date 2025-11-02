import React, { useRef, useEffect } from 'react';
import { ComponentProps } from '../../types.js';

export type SortField = 'name' | 'productNumber' | 'rating' | 'none';
export type SortDirection = 'asc' | 'desc';

export interface ProductSortMenuProps extends ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortOption: (field: SortField) => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

/**
 * ProductSortMenu Component
 * 
 * Displays a dropdown menu for sorting products
 * 
 * @example
 * ```tsx
 * import { ProductSortMenu } from '@monorepo/shared-ui';
 * 
 * <ProductSortMenu
 *   isOpen={showSortMenu}
 *   onClose={() => setShowSortMenu(false)}
 *   sortField="name"
 *   sortDirection="asc"
 *   onSortOption={(field) => handleSortOption(field)}
 * />
 * ```
 */
export function ProductSortMenu({
  isOpen,
  onClose,
  sortField,
  sortDirection,
  onSortOption,
  buttonRef,
  className = '',
}: ProductSortMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef?.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Menu */}
      <div
        ref={menuRef}
        className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 ${className}`}
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <div className="py-1">
          <button
            onClick={() => {
              onSortOption('none');
            }}
            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
              sortField === 'none' ? 'font-semibold' : ''
            }`}
            style={{
              color: sortField === 'none' ? 'var(--color-primary-500)' : 'var(--color-text-primary)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            No Sort
          </button>
          <button
            onClick={() => {
              onSortOption('name');
            }}
            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
              sortField === 'name' ? 'font-semibold' : ''
            }`}
            style={{
              color: sortField === 'name' ? 'var(--color-primary-500)' : 'var(--color-text-primary)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Name {sortField === 'name' && (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)')}
          </button>
          <button
            onClick={() => {
              onSortOption('productNumber');
            }}
            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
              sortField === 'productNumber' ? 'font-semibold' : ''
            }`}
            style={{
              color: sortField === 'productNumber' ? 'var(--color-primary-500)' : 'var(--color-text-primary)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Product Number {sortField === 'productNumber' && (sortDirection === 'asc' ? '(↑)' : '(↓)')}
          </button>
          <button
            onClick={() => {
              onSortOption('rating');
            }}
            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
              sortField === 'rating' ? 'font-semibold' : ''
            }`}
            style={{
              color: sortField === 'rating' ? 'var(--color-primary-500)' : 'var(--color-text-primary)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Rating {sortField === 'rating' && (sortDirection === 'asc' ? '(Low-High)' : '(High-Low)')}
          </button>
        </div>
      </div>
    </>
  );
}

