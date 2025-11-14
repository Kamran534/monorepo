import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ComponentProps } from '../types.js';

export interface PaginationProps extends ComponentProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

/**
 * Pagination Component
 * 
 * Displays pagination controls with page numbers and navigation buttons
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) {
    return null; // Don't show pagination if there's only one page
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {/* Items info */}
      {totalItems !== undefined && itemsPerPage !== undefined && (
        <div className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Showing <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{(currentPage - 1) * itemsPerPage + 1}</span> to <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{totalItems}</span>
        </div>
      )}
      
      {/* Pagination controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
          style={{
            backgroundColor: currentPage === 1 ? 'transparent' : 'var(--color-bg-secondary)',
            color: currentPage === 1 ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
            border: '1px solid var(--color-border-light)',
          }}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-1.5 py-1.5 text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className="min-w-[32px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: isActive ? 'var(--color-primary-500)' : 'var(--color-bg-secondary)',
                color: isActive ? 'var(--color-text-light)' : 'var(--color-text-primary)',
                border: '1px solid var(--color-border-light)',
                fontWeight: isActive ? 600 : 500,
              }}
              aria-label={`Page ${pageNum}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
          style={{
            backgroundColor: currentPage === totalPages ? 'transparent' : 'var(--color-bg-secondary)',
            color: currentPage === totalPages ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
            border: '1px solid var(--color-border-light)',
          }}
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

