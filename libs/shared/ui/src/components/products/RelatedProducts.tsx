import React, { useState } from 'react';
import { ComponentProps } from '../../types.js';
import { Product } from './ProductList.js';
import { Package } from 'lucide-react';

export interface RelatedProductsProps extends ComponentProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
}

/**
 * RelatedProducts Component
 * 
 * Displays a grid of related products
 * 
 * @example
 * ```tsx
 * <RelatedProducts
 *   products={relatedProducts}
 *   onProductClick={(product) => console.log(product)}
 * />
 * ```
 */
export function RelatedProducts({
  products,
  onProductClick,
  className = '',
}: RelatedProductsProps) {
  const formatRating = (rating?: number, reviewCount?: number) => {
    if (rating === undefined) return '';
    const reviewText = reviewCount ? ` (${reviewCount})` : '';
    return `${rating.toFixed(1)}${reviewText}`;
  };

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
          Related products
        </h2>
        <button
          className="text-sm transition-colors"
          style={{ color: 'var(--color-primary-500)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          See all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {products.slice(0, 4).map((product) => {
          const hasImage = !!product.image;
          const [imageError, setImageError] = useState(false);
          const [imageLoaded, setImageLoaded] = useState(false);

          return (
            <button
              key={product.id}
              onClick={() => onProductClick?.(product)}
              className="flex flex-col rounded border overflow-hidden transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-card)',
              }}
            >
              {/* Product Image */}
              <div className="relative aspect-square w-full">
                {hasImage && !imageError ? (
                  <>
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageLoaded(true)}
                    />
                    {imageLoaded && (
                      <div className="absolute inset-0 bg-black/20" />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <Package size={32} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3 flex flex-col gap-1">
                <div className="text-xs font-medium line-clamp-1 text-left" style={{ color: 'var(--color-text-primary)' }}>
                  {product.name}
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {product.productNumber}
                </div>
                {product.rating && (
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatRating(product.rating, product.reviewCount)}
                  </div>
                )}
                {product.price && (
                  <div className="text-sm font-semibold text-left" style={{ color: 'var(--color-text-primary)' }}>
                    {product.price}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

