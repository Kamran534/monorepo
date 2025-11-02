import React, { useState, useEffect, useRef } from 'react';
import { ComponentProps } from '../../types.js';
import { Package, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ProductVariant {
  id: string;
  name: string;
  image?: string;
  productNumber?: string;
}

export interface ProductImagesProps extends ComponentProps {
  images?: string[];
  productName?: string;
  variants?: ProductVariant[];
  onVariantClick?: (variant: ProductVariant) => void;
}

/**
 * ProductImages Component
 * 
 * Displays product images in a grid layout
 * 
 * @example
 * ```tsx
 * <ProductImages
 *   images={['image1.jpg', 'image2.jpg']}
 *   productName="Product Name"
 * />
 * ```
 */
export function ProductImages({
  images = [],
  productName,
  className = '',
  variants = [],
  onVariantClick,
}: ProductImagesProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [variantImageErrors, setVariantImageErrors] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [modalImagePosition, setModalImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalImageRef = useRef<HTMLImageElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  // Show placeholder if no images or all images failed
  const showPlaceholder = images.length === 0 || imageErrors.size === images.length;

  // Combined images: main images + variant images
  const allModalImages = React.useMemo(() => {
    const mainImages = images.map((img, idx) => ({ 
      url: img, 
      type: 'main' as const, 
      index: idx 
    }));
    const variantImages = variants
      .filter((v): v is ProductVariant & { image: string } => !!v.image)
      .map((v) => ({ 
        url: v.image, 
        type: 'variant' as const, 
        variant: v 
      }));
    return [...mainImages, ...variantImages];
  }, [images, variants]);

  // Open modal when clicking zoom icon
  const handleOpenModal = (imageIndex: number) => {
    setModalImageIndex(imageIndex);
    setZoomLevel(1);
    setModalImagePosition({ x: 0, y: 0 });
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setZoomLevel(1);
    setModalImagePosition({ x: 0, y: 0 });
  };

  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  // Handle variant click in modal - change preview image
  const handleModalVariantClick = (variant: ProductVariant) => {
    if (variant.image) {
      const variantIndex = allModalImages.findIndex(img => 
        img.type === 'variant' && img.variant?.id === variant.id
      );
      if (variantIndex !== -1) {
        setModalImageIndex(variantIndex);
        setZoomLevel(1);
        setModalImagePosition({ x: 0, y: 0 });
      }
    }
    // Also trigger the original variant click handler if provided
    onVariantClick?.(variant);
  };

  // Handle image drag in modal
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - modalImagePosition.x, y: e.clientY - modalImagePosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setModalImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle previous/next image navigation
  const handlePreviousImage = () => {
    setModalImageIndex(prev => (prev > 0 ? prev - 1 : allModalImages.length - 1));
    setZoomLevel(1);
    setModalImagePosition({ x: 0, y: 0 });
  };

  const handleNextImage = () => {
    setModalImageIndex(prev => (prev < allModalImages.length - 1 ? prev + 1 : 0));
    setZoomLevel(1);
    setModalImagePosition({ x: 0, y: 0 });
  };

  // Handle keyboard navigation in modal
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setZoomLevel(1);
        setModalImagePosition({ x: 0, y: 0 });
      } else if (e.key === 'ArrowLeft') {
        setModalImageIndex(prev => (prev > 0 ? prev - 1 : allModalImages.length - 1));
        setZoomLevel(1);
        setModalImagePosition({ x: 0, y: 0 });
      } else if (e.key === 'ArrowRight') {
        setModalImageIndex(prev => (prev < allModalImages.length - 1 ? prev + 1 : 0));
        setZoomLevel(1);
        setModalImagePosition({ x: 0, y: 0 });
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel(prev => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, allModalImages.length]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <h2 className="text-sm font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
        Images
      </h2>

      {/* Main Preview Images */}
      <div className="flex flex-col gap-4">
        {showPlaceholder ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((index) => (
              <div
                key={index}
                className="aspect-square rounded border flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                <Package size={48} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {images.map((image, index) => {
              const hasError = imageErrors.has(index);
              const isSelected = index === selectedImageIndex;

              return (
                <div
                  key={index}
                  className={`relative aspect-square rounded border overflow-hidden cursor-pointer transition-all ${
                    isSelected ? 'ring-2' : ''
                  }`}
                  style={{
                    borderColor: isSelected ? 'var(--color-primary-500)' : 'var(--color-border-light)',
                    ...(isSelected && {
                      boxShadow: `0 0 0 2px var(--color-primary-500)`,
                    }),
                  }}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  {hasError ? (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                      <Package size={48} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
                    </div>
                  ) : (
                    <>
                      <img
                        src={image}
                        alt={productName ? `${productName} - Image ${index + 1}` : `Product image ${index + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(index)}
                      />
                      <div 
                        className="absolute bottom-2 right-2 bg-black/50 rounded p-1 cursor-pointer hover:bg-black/70 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(index);
                        }}
                      >
                        <ZoomIn size={16} style={{ color: 'white' }} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Variants Section - Below Preview Images */}
        {variants.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
              Variants
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {variants.map((variant) => {
                const hasError = variantImageErrors.has(variant.id);
                const handleVariantError = () => {
                  setVariantImageErrors(prev => new Set(prev).add(variant.id));
                };

                return (
                  <div
                    key={variant.id}
                    className="flex flex-col gap-2 cursor-pointer group"
                    onClick={() => onVariantClick?.(variant)}
                  >
                    <div className="relative aspect-square rounded border overflow-hidden transition-all"
                      style={{
                        borderColor: 'var(--color-border-light)',
                      }}
                    >
                      {hasError || !variant.image ? (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                          <Package size={32} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
                        </div>
                      ) : (
                        <img
                          src={variant.image}
                          alt={variant.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                          onError={handleVariantError}
                        />
                      )}
                    </div>
                    {variant.productNumber && (
                      <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
                        {variant.productNumber}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {isModalOpen && allModalImages.length > 0 && (
        <div
          className="fixed inset-0 z-[1050] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
              style={{ color: 'white' }}
            >
              <X size={24} />
            </button>

            {/* Zoom Controls */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: 'white' }}
              >
                <ZoomOut size={20} />
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: 'white' }}
              >
                <ZoomIn size={20} />
              </button>
              <div className="bg-black/50 rounded px-3 py-2 flex items-center" style={{ color: 'white' }}>
                <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
              </div>
            </div>

            {/* Navigation Arrows */}
            {allModalImages.length > 1 && (
              <>
                <button
                  onClick={handlePreviousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
                  style={{ color: 'white' }}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
                  style={{ color: 'white' }}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Main Preview Image */}
            <div
              ref={modalContainerRef}
              className="flex-1 flex items-center justify-center overflow-hidden p-8"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                className="relative"
                style={{
                  width: '80vh',
                  height: '80vh',
                  transform: `scale(${zoomLevel}) translate(${modalImagePosition.x / zoomLevel}px, ${modalImagePosition.y / zoomLevel}px)`,
                  cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                }}
              >
                <img
                  ref={modalImageRef}
                  src={allModalImages[modalImageIndex]?.url}
                  alt={productName ? `${productName} - Preview` : 'Product preview'}
                  className="w-full h-full object-contain"
                  onMouseDown={handleMouseDown}
                  draggable={false}
                />
              </div>
            </div>

            {/* Variants Section in Modal */}
            {variants.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
                {/* <h3 className="text-sm font-semibold uppercase mb-3 text-center" style={{ color: 'white' }}>
                  Variants
                </h3> */}
                <div className="flex justify-center gap-4 overflow-x-auto pb-2">
                  {variants.map((variant) => {
                    const hasError = variantImageErrors.has(variant.id);
                    const isActive = allModalImages[modalImageIndex]?.type === 'variant' &&
                      allModalImages[modalImageIndex]?.variant?.id === variant.id;
                    const handleVariantError = () => {
                      setVariantImageErrors(prev => new Set(prev).add(variant.id));
                    };

                    return (
                      <div
                        key={variant.id}
                        className="flex flex-col gap-2 cursor-pointer group flex-shrink-0"
                        onClick={() => handleModalVariantClick(variant)}
                      >
                        <div
                          className="relative aspect-square rounded border overflow-hidden transition-all"
                          style={{
                            borderColor: isActive ? 'var(--color-primary-500)' : 'var(--color-border-light)',
                            width: '80px',
                            height: '80px',
                          }}
                        >
                          {hasError || !variant.image ? (
                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                              <Package size={24} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
                            </div>
                          ) : (
                            <img
                              src={variant.image}
                              alt={variant.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                              onError={handleVariantError}
                            />
                          )}
                        </div>
                        {variant.productNumber && (
                          <p className="text-xs text-center" style={{ color: 'white' }}>
                            {variant.productNumber}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

