import React, { useState, useEffect, useRef } from 'react';
import { Package, ShoppingCart } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { ViewMode } from './ProductActionButtons.js';

export interface Product {
  id: string;
  productNumber: string;
  name: string;
  price?: string;
  rating?: number;
  reviewCount?: number;
  image?: string;
}

export interface ProductListProps extends ComponentProps {
  products: Product[];
  selectedProductId?: string;
  onProductClick?: (product: Product) => void;
  hideDetails?: boolean;
  viewMode?: ViewMode;
  onAddProduct?: (product: Product) => void;
}

interface ProductGridCardProps {
  product: Product;
  isSelected: boolean;
  hideDetails: boolean;
  onProductClick?: (product: Product) => void;
  formatRating: (rating?: number, reviewCount?: number) => string;
  onAddProduct?: (product: Product) => void;
}

function ProductGridCard({ product, isSelected, hideDetails, onProductClick, formatRating, onAddProduct }: ProductGridCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const hasImage = !!product.image;
  const showImage = hasImage && !imageError && imageLoaded;
  
  // Check if image is already loaded (cached images)
  useEffect(() => {
    if (hasImage && imgRef.current) {
      // Check if image is already loaded from cache
      if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
        setImageLoaded(true);
        setImageError(false);
      } else if (imgRef.current.complete && imgRef.current.naturalHeight === 0) {
        // Image completed loading but has 0 height (error case)
        setImageError(true);
        setImageLoaded(false);
      }
    }
  }, [hasImage]);
  
  return (
    <div
      onClick={() => onProductClick?.(product)}
      className={`
        relative
        flex flex-col
        p-4
        rounded
        border
        transition-all
        hover:opacity-90
        hover:scale-[1.02]
        active:scale-[0.98]
        min-h-[180px]
        overflow-hidden
        cursor-pointer
      `}
      style={{
        backgroundColor: showImage
          ? 'transparent'
          : (isSelected
            ? 'var(--color-primary-500)'
            : 'var(--color-bg-card)'),
        borderColor: isSelected
          ? 'var(--color-primary-500)'
          : 'var(--color-border-light)',
        color: showImage || isSelected ? 'var(--color-text-light)' : 'var(--color-text-primary)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected && !showImage) {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !showImage) {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-card)';
        }
      }}
    >
      {/* Background image with lazy loading */}
      {hasImage && (
        <img
          ref={imgRef}
          src={product.image}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover z-0"
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
          onLoad={() => {
            setImageError(false);
            setImageLoaded(true);
          }}
          onAbort={() => {
            // Handle case where image loading was aborted
            setImageError(true);
            setImageLoaded(false);
          }}
        />
      )}
      
      {/* Product icon placeholder when image fails to load or not provided */}
      {!showImage && (
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <Package 
            size={64} 
            style={{ 
              color: isSelected 
                ? 'var(--color-text-light)' 
                : 'var(--color-text-secondary)',
              opacity: 0.5
            }} 
          />
        </div>
      )}
      
      {/* Dark overlay for better text readability on images */}
      {showImage && (
        <div className="absolute inset-0 bg-black/40 z-0 transition-opacity" />
      )}
      
      {/* Top Section - Product Number and Name */}
      <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-1 px-4 z-[5]">
        <span className="text-xs font-mono opacity-80">
          {hideDetails ? '...' : product.productNumber}
        </span>
        <span className="text-sm font-medium text-center line-clamp-2">
          {hideDetails ? '...' : product.name}
        </span>
      </div>
      
      {/* Bottom Section - Action Buttons (left) and Price (right) */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-4 z-[5]">
        {/* Action Buttons - Bottom Left */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddProduct?.(product); }}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: isSelected
                ? 'rgba(255,255,255,0.2)'
                : 'var(--color-primary-500)',
              color: 'var(--color-text-light)',
            }}
            title="Add to cart"
            aria-label="Add to cart"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
          {/* Rating - Next to button */}
          {!hideDetails && product.rating && (
            <span className="text-xs opacity-80 ml-1">
              {formatRating(product.rating, product.reviewCount)}
            </span>
          )}
          {hideDetails && (
            <span className="text-sm ml-1">...</span>
          )}
        </div>
        
        {/* Price - Bottom Right */}
        <div>
          {!hideDetails && product.price && (
            <span className="text-sm font-semibold">
              {product.price}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ProductList Component
 * 
 * Displays a table of products with product number, name, price, and rating
 * 
 * @example
 * ```tsx
 * import { ProductList } from '@monorepo/shared-ui';
 * 
 * const products = [
 *   { id: '1', productNumber: '81300', name: 'Brown Leather Travel Bag', price: '$29.99', rating: 3.8, reviewCount: 195 },
 * ];
 * 
 * <ProductList products={products} selectedProductId="1" onProductClick={(product) => {}} />
 * ```
 */
export function ProductList({
  products,
  selectedProductId,
  onProductClick,
  hideDetails = false,
  viewMode = 'list',
  className = '',
  onAddProduct,
}: ProductListProps) {
  const formatRating = (rating?: number, reviewCount?: number) => {
    if (rating === undefined) return '';
    const reviewText = reviewCount ? ` (${reviewCount})` : '';
    return `${rating.toFixed(1)}${reviewText}`;
  };

  if (viewMode === 'grid') {
    return (
      <div className={`w-full h-full flex flex-col ${className}`} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {/* Grid View */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div 
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            }}
          >
            {products.map((product) => (
              <ProductGridCard
                key={product.id}
                product={product}
                isSelected={product.id === selectedProductId}
                hideDetails={hideDetails}
                onProductClick={onProductClick}
                formatRating={formatRating}
                onAddProduct={onAddProduct}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List View (default)
  return (
    <div className={`w-full h-full flex flex-col ${className}`} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Table Header */}
      <div
        className="flex items-center border-b py-3 px-4 flex-shrink-0"
        style={{
          borderColor: 'var(--color-border-light)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <div className="w-32 flex-shrink-0">
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
            Product Number
          </span>
        </div>
        <div className="flex-1 px-4">
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
            Product Name
          </span>
        </div>
        <div className="w-32 flex-shrink-0">
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
            Price
          </span>
        </div>
        <div className="w-32 flex-shrink-0">
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
            Rating
          </span>
        </div>
        <div className="w-24 flex-shrink-0">
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
            Actions
          </span>
        </div>
      </div>

      {/* Product Rows - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {products.map((product) => {
          const isSelected = product.id === selectedProductId;
          
          return (
            <div
              key={product.id}
              onClick={() => onProductClick?.(product)}
              className={`w-full flex items-center border-b py-3 px-4 transition-colors cursor-pointer ${
                isSelected ? '' : ''
              }`}
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: isSelected
                  ? 'var(--color-primary-500)'
                  : 'transparent',
                color: isSelected ? 'var(--color-text-light)' : 'var(--color-text-primary)',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Product Number */}
              <div className="w-32 flex-shrink-0">
                <span className="text-sm font-mono">
                  {hideDetails ? '...' : product.productNumber}
                </span>
              </div>
              
              {/* Product Name */}
              <div className="flex-1 px-4">
                <span className="text-sm">{hideDetails ? '...' : product.name}</span>
              </div>
              
              {/* Price */}
              <div className="w-32 flex-shrink-0">
                <span className="text-sm">{hideDetails ? '...' : (product.price || '')}</span>
              </div>
              
              {/* Rating */}
              <div className="w-32 flex-shrink-0">
                <span className="text-sm">{hideDetails ? '...' : formatRating(product.rating, product.reviewCount)}</span>
              </div>
              
              {/* Add to Cart Button */}
              <div className="w-24 flex-shrink-0 flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddProduct?.(product);
                  }}
                  className="px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(255,255,255,0.2)'
                      : 'var(--color-primary-500)',
                    color: 'var(--color-text-light)',
                  }}
                  title="Add to cart"
                  aria-label="Add to cart"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

