import React, { useRef, useState } from 'react';
import { Filter, ArrowUpDown, Eye, List, Grid } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { ProductFilterMenu, RatingFilter, PriceFilter } from './ProductFilterMenu.js';
import { ProductSortMenu, SortField, SortDirection } from './ProductSortMenu.js';

export type ViewMode = 'list' | 'grid';

export interface ProductActionButtonsProps extends ComponentProps {
  ratingFilter: RatingFilter;
  priceFilter: PriceFilter;
  onRatingFilterChange: (filter: RatingFilter) => void;
  onPriceFilterChange: (filter: PriceFilter) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortOption: (field: SortField) => void;
  hideDetails: boolean;
  onHideDetailsChange: (hide: boolean) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * ProductActionButtons Component
 * 
 * Displays action buttons for filtering, sorting, hiding details, and toggling view mode
 * 
 * @example
 * ```tsx
 * import { ProductActionButtons } from '@monorepo/shared-ui';
 * 
 * <ProductActionButtons
 *   ratingFilter="all"
 *   priceFilter="all"
 *   onRatingFilterChange={(filter) => setRatingFilter(filter)}
 *   onPriceFilterChange={(filter) => setPriceFilter(filter)}
 *   sortField="name"
 *   sortDirection="asc"
 *   onSortOption={(field) => handleSortOption(field)}
 *   hideDetails={false}
 *   onHideDetailsChange={(hide) => setHideDetails(hide)}
 *   viewMode="list"
 *   onViewModeChange={(mode) => setViewMode(mode)}
 * />
 * ```
 */
export function ProductActionButtons({
  ratingFilter,
  priceFilter,
  onRatingFilterChange,
  onPriceFilterChange,
  sortField,
  sortDirection,
  onSortOption,
  hideDetails,
  onHideDetailsChange,
  viewMode,
  onViewModeChange,
  className = '',
}: ProductActionButtonsProps) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);

  const hasActiveFilters = ratingFilter !== 'all' || priceFilter !== 'all';

  const handleSortOption = (field: SortField) => {
    onSortOption(field);
    setShowSortMenu(false);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Filter Button */}
      <div className="relative">
        <button
          ref={filterButtonRef}
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          className={`p-1.5 rounded transition-colors hover:opacity-90 ${
            hasActiveFilters ? 'opacity-100' : ''
          }`}
          style={{
            backgroundColor: hasActiveFilters ? 'var(--color-primary-500)' : 'var(--color-bg-secondary)',
            color: hasActiveFilters ? 'var(--color-text-light)' : 'var(--color-text-primary)',
          }}
          title="Filter"
        >
          <Filter className="w-4 h-4" />
        </button>

        <ProductFilterMenu
          isOpen={showFilterMenu}
          onClose={() => setShowFilterMenu(false)}
          ratingFilter={ratingFilter}
          priceFilter={priceFilter}
          onRatingFilterChange={onRatingFilterChange}
          onPriceFilterChange={onPriceFilterChange}
          buttonRef={filterButtonRef}
        />
      </div>

      {/* Sort Button */}
      <div className="relative">
        <button
          ref={sortButtonRef}
          onClick={() => setShowSortMenu(!showSortMenu)}
          className={`p-1.5 rounded transition-colors hover:opacity-90 ${
            sortField !== 'none' ? 'opacity-100' : ''
          }`}
          style={{
            backgroundColor: sortField !== 'none' ? 'var(--color-primary-500)' : 'var(--color-bg-secondary)',
            color: sortField !== 'none' ? 'var(--color-text-light)' : 'var(--color-text-primary)',
          }}
          title="Sort"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        <ProductSortMenu
          isOpen={showSortMenu}
          onClose={() => setShowSortMenu(false)}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortOption={handleSortOption}
          buttonRef={sortButtonRef}
        />
      </div>

      {/* Eye Button */}
      <button
        onClick={() => onHideDetailsChange(!hideDetails)}
        className={`p-1.5 rounded transition-colors hover:opacity-90 ${
          hideDetails ? '' : ''
        }`}
        style={{
          backgroundColor: hideDetails ? 'var(--color-primary-500)' : 'var(--color-bg-secondary)',
          color: hideDetails ? 'var(--color-text-light)' : 'var(--color-text-primary)',
        }}
        title={hideDetails ? 'Show Details' : 'Hide Details'}
      >
        <Eye className="w-4 h-4" />
      </button>

      {/* View Mode Toggle Button */}
      <button
        onClick={() => onViewModeChange(viewMode === 'list' ? 'grid' : 'list')}
        className="p-1.5 rounded transition-colors hover:opacity-90"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
        }}
        title={viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
      >
        {viewMode === 'list' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
      </button>
    </div>
  );
}

