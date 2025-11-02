import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ComponentProps } from '../../types.js';

export interface SlideItem {
  path: string;
  webp?: string;
  alt: string;
  title: string;
  subtitle: string;
}

export interface ImageSliderProps extends ComponentProps {
  slides: SlideItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  height?: string;
  width?: string;
  onSlideChange?: (index: number) => void;
  onSlideClick?: (slide: SlideItem, index: number) => void;
}

/**
 * ImageSlider Component
 * 
 * A professional, responsive image carousel/slider with:
 * - Auto-play functionality (infinite loop)
 * - Navigation controls (prev/next arrows)
 * - Indicators (dots)
 * - Keyboard navigation
 * - Touch/swipe support
 * - Smooth transitions
 * - Title and subtitle overlay
 * - Theme-aware styling
 * 
 * @example
 * ```tsx
 * import { ImageSlider } from '@monorepo/shared-ui';
 * import { allCollections } from '@monorepo/shared-assets';
 * 
 * <ImageSlider 
 *   slides={allCollections}
 *   autoPlay={true}
 *   height="600px"
 * />
 * ```
 */
export function ImageSlider({
  slides,
  autoPlay = true,
  autoPlayInterval = 5000,
  showControls = true,
  showIndicators = true,
  height = '600px',
  width,
  onSlideChange,
  onSlideClick,
  className = '',
}: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    // Infinite loop: wraps to 0 when reaching the end
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isTransitioning, slides.length]);

  // Auto-play functionality - infinite loop, always running when autoPlay is true
  useEffect(() => {
    if (!autoPlay || slides.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, slides.length, autoPlayInterval, handleNext]);

  // Notify parent of slide change
  useEffect(() => {
    onSlideChange?.(currentIndex);
  }, [currentIndex, onSlideChange]);

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isTransitioning, slides.length]);

  const handleIndicatorClick = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Touch/swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  // Removed pause on hover functionality - slider always plays

  const handleSlideClick = () => {
    onSlideClick?.(slides[currentIndex], currentIndex);
  };

  if (slides.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ 
          height,
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p>No slides available</p>
      </div>
    );
  }

  return (
    <div
      ref={sliderRef}
      className={`relative overflow-hidden group ${className}`}
      style={{ height, width: width || '100%', margin: 0, padding: 0, display: 'block', lineHeight: 0 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Container */}
      <div className="relative w-full h-full" style={{ margin: 0, padding: 0, lineHeight: 0 }}>
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            onClick={handleSlideClick}
            style={{ cursor: onSlideClick ? 'pointer' : 'default', margin: 0, padding: 0, lineHeight: 0 }}
          >
            {/* Image */}
            <picture className="absolute inset-0 w-full h-full" style={{ margin: 0, padding: 0, lineHeight: 0, display: 'block' }}>
              {slide.webp && <source srcSet={slide.webp} type="image/webp" />}
              <img
                src={slide.path}
                alt={slide.alt}
                className="w-full h-full object-cover block"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  margin: 0,
                  padding: 0,
                  display: 'block',
                  verticalAlign: 'top'
                }}
                loading={index === 0 ? 'eager' : 'lazy'}
                onError={(e) => {
                  console.error(`Failed to load image: ${slide.path}`, e);
                  // Fallback to a placeholder or hide broken images
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </picture>

          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      {showControls && slides.length > 1 && (
        <>
          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous slide"
            disabled={isTransitioning}
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next slide"
            disabled={isTransitioning}
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2 md:gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                handleIndicatorClick(index);
              }}
              className={`transition-all rounded-full ${
                index === currentIndex
                  ? 'w-8 md:w-10 h-2 md:h-2.5 bg-white'
                  : 'w-2 md:w-2.5 h-2 md:h-2.5 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              disabled={isTransitioning}
            />
          ))}
        </div>
      )}

    </div>
  );
}


