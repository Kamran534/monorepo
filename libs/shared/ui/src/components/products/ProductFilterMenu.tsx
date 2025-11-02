import React, { useRef, useEffect } from 'react';
import { ComponentProps } from '../../types.js';

export type RatingFilter = 'all' | '4+' | '3.5+' | '3+' | '2.5+' | '2+' | '1.5+' | '1+';
export type PriceFilter = 'all' | 'under50' | '50-100' | '100-200' | 'over200';

export interface ProductFilterMenuProps extends ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  ratingFilter: RatingFilter;
  priceFilter: PriceFilter;
  onRatingFilterChange: (filter: RatingFilter) => void;
  onPriceFilterChange: (filter: PriceFilter) => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

/**
 * ProductFilterMenu Component
 * 
 * Displays a dropdown menu for filtering products by rating and price
 * 
 * @example
 * ```tsx
 * import { ProductFilterMenu } from '@monorepo/shared-ui';
 * 
 * <ProductFilterMenu
 *   isOpen={showFilterMenu}
 *   onClose={() => setShowFilterMenu(false)}
 *   ratingFilter="all"
 *   priceFilter="all"
 *   onRatingFilterChange={(filter) => setRatingFilter(filter)}
 *   onPriceFilterChange={(filter) => setPriceFilter(filter)}
 * />
 * ```
 */
export function ProductFilterMenu({
  isOpen,
  onClose,
  ratingFilter,
  priceFilter,
  onRatingFilterChange,
  onPriceFilterChange,
  buttonRef,
  className = '',
}: ProductFilterMenuProps) {
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
        className={`absolute right-0 mt-2 rounded-lg shadow-lg z-50 max-h-[90vh] overflow-y-auto ${className}`}
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-light)',
          width: 'max-content',
          minWidth: '280px',
          maxWidth: 'calc(100vw - 2rem)',
        }}
      >
        <div className="p-4">
          {/* Rating Filter Section */}
          <div className="mb-4">
            <div className="px-2 py-1 mb-2 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                Rating
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['all', '4+', '3.5+', '3+', '2.5+', '2+', '1.5+', '1+'] as RatingFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    onRatingFilterChange(filter);
                    onClose();
                  }}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    ratingFilter === filter ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: ratingFilter === filter ? 'var(--color-text-light)' : 'var(--color-text-primary)',
                    backgroundColor: ratingFilter === filter ? 'var(--color-primary-500)' : 'var(--color-bg-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (ratingFilter !== filter) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (ratingFilter !== filter) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                    }
                  }}
                >
                  {filter === 'all' ? 'All' : filter}
                </button>
              ))}
            </div>
          </div>
          
          {/* Price Filter Section */}
          <div>
            <div className="px-2 py-1 mb-2 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                Price
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'all', label: 'All Prices' },
                { value: 'under50', label: 'Under $50' },
                { value: '50-100', label: '$50-$100' },
                { value: '100-200', label: '$100-$200' },
                { value: 'over200', label: 'Over $200' },
              ] as Array<{ value: PriceFilter; label: string }>).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    onPriceFilterChange(value);
                    onClose();
                  }}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    priceFilter === value ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: priceFilter === value ? 'var(--color-text-light)' : 'var(--color-text-primary)',
                    backgroundColor: priceFilter === value ? 'var(--color-primary-500)' : 'var(--color-bg-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (priceFilter !== value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (priceFilter !== value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

