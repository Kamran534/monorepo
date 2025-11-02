import React, { useState, useEffect, useRef } from 'react';
import { ComponentProps } from '../../types.js';
import { Package } from 'lucide-react';

export interface CategoryCardItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  image?: string;
  onClick?: () => void;
}

export interface CategoryCardProps extends ComponentProps {
  category: CategoryCardItem;
}

/**
 * CategoryCard Component
 * 
 * Displays an individual category card with icon and name
 * 
 * @example
 * ```tsx
 * import { CategoryCard } from '@monorepo/shared-ui';
 * 
 * <CategoryCard 
 *   category={{ 
 *     id: '1', 
 *     name: 'Fashion Accessories',
 *     onClick: () => console.log('Clicked')
 *   }} 
 * />
 * ```
 */
export function CategoryCard({
  category,
  className = '',
}: CategoryCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const hasImage = !!category.image;
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
    <button
      onClick={category.onClick}
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
        focus:outline-none
        focus:ring-2
        focus:ring-offset-2
        overflow-hidden
        ${className}
      `}
      style={{
        backgroundColor: showImage ? 'transparent' : 'var(--color-bg-card)',
        borderColor: 'var(--color-border-light)',
        color: 'var(--color-text-primary)',
        minHeight: '120px',
      }}
    >
      {/* Image Background - If image provided */}
      {hasImage && (
        <>
          <img
            ref={imgRef}
            src={category.image}
            alt={category.name}
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
              setImageError(true);
              setImageLoaded(false);
            }}
          />
          {/* Dark overlay for better text readability on images */}
          {showImage && (
            <div className="absolute inset-0 bg-black/30 z-[1]" />
          )}
        </>
      )}

      {/* Icon - Left - Only shown if no image or image failed to load */}
      {!showImage && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-[1]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {category.icon || <Package size={48} style={{ opacity: 0.5 }} />}
        </div>
      )}

      {/* Category Name - Right Bottom */}
      <span 
        className="text-sm font-medium absolute bottom-4 right-4 text-right z-[5]"
        style={{ color: showImage ? 'var(--color-text-light)' : 'var(--color-text-primary)' }}
      >
        {category.name}
      </span>
    </button>
  );
}

