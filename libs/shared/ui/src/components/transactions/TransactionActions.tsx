import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ComponentProps } from '../../types.js';
import { TransactionVerticalNav } from './TransactionVerticalNav.js';
import { FileText, Tag, Boxes, Zap, Package, ShoppingCart } from 'lucide-react';
import type { Product } from '../products/ProductList.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';
import { parsePriceValue } from '../../utils/price.js';

export interface ActionButton {
  id: string;
  icon?: React.ReactNode;
  label: string;
  color?: string;
  onClick?: () => void;
  disabled?: boolean;
  tall?: boolean;
  fullWidth?: boolean;
  square?: boolean;
  rowSpan?: number;
  rectangular?: boolean;
  split?: {
    left: { icon: React.ReactNode; onClick?: () => void; disabled?: boolean };
    right: { icon: React.ReactNode; onClick?: () => void; disabled?: boolean };
  };
  section?: 'actions' | 'orders' | 'discounts' | 'products';
}

export interface TransactionActionsProps extends ComponentProps {
  actions: ActionButton[];
  activeSection?: string;
  onSectionClick?: (section: string) => void;
  products?: Product[];
  onProductClick?: (product: Product) => void;
  onAddProduct?: (product: Product) => void;
}

/**
 * TransactionActions Component
 * 
 * Right panel displaying action buttons grid
 * for the transactions page.
 */
interface ProductGridCardProps {
  product: Product;
  onProductClick?: (product: Product) => void;
  onAddProduct?: (product: Product) => void;
}

function ProductGridCard({ product, onProductClick, onAddProduct }: ProductGridCardProps) {
  const hasImage = !!product.image;
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });

  useEffect(() => {
    if (hasImage && imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
        setImageLoaded(true);
        setImageError(false);
      } else if (imgRef.current.complete && imgRef.current.naturalHeight === 0) {
        setImageError(true);
        setImageLoaded(false);
      }
    }
  }, [hasImage]);

  const showImage = hasImage && !imageError && imageLoaded;
  const textColor = showImage ? 'var(--color-text-light)' : 'var(--color-text-primary)';
  const formattedPrice = useMemo(() => {
    const numeric = parsePriceValue(product.price ?? null);
    if (numeric === null) return null;
    return `Rs ${formatAmount(numeric, { showSymbol: false })}`;
  }, [product.price, formatAmount]);

  return (
    <div
      onClick={() => onProductClick?.(product)}
      className="relative flex flex-col rounded border overflow-hidden cursor-pointer transition-all hover:shadow-md"
      style={{
        width: '149px',
        backgroundColor: showImage ? 'transparent' : 'var(--color-bg-card)',
        borderColor: 'var(--color-border-light)',
        maxWidth: '100%',
        backgroundImage: showImage ? `url(${product.image})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '140px',
      }}
    >
      {/* Dark overlay for better text readability on images */}
      {showImage && <div className="absolute inset-0 bg-black/30 z-0" />}

      {/* Product Image - Hidden, used for loading detection */}
      {hasImage && (
        <img
          ref={imgRef}
          src={product.image}
          alt=""
          loading="lazy"
          className="absolute opacity-0 pointer-events-none"
          style={{ width: '1px', height: '1px' }}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
        />
      )}

      {/* Placeholder icon when no image */}
      {!showImage && (
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <Package size={20} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
        </div>
      )}

      {/* Product Info */}
      <div className="relative flex flex-col h-full p-2 z-[1]">
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-medium line-clamp-1" style={{ color: textColor }}>
            {product.productNumber}
          </p>
          <p className="text-[10px] font-semibold line-clamp-2 leading-tight" style={{ color: textColor }}>
            {product.name}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddProduct?.(product);
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: showImage ? 'rgba(255,255,255,0.2)' : 'var(--color-primary-500)',
              color: 'var(--color-text-light)',
              border: showImage ? '1px solid rgba(255,255,255,0.25)' : 'none',
            }}
            title="Add to cart"
            aria-label="Add to cart"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
          {formattedPrice && (
            <span className="text-[11px] font-semibold" style={{ color: textColor }}>
              {formattedPrice}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TransactionActions({
  actions,
  activeSection,
  onSectionClick,
  className = '',
  products = [],
  onProductClick,
  onAddProduct,
}: TransactionActionsProps) {
  // Detect fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => {
      // Check if browser is in fullscreen mode (F11)
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };
      const isFS = !!(document.fullscreenElement || 
                      doc.webkitFullscreenElement || 
                      doc.mozFullScreenElement || 
                      doc.msFullscreenElement);
      setIsFullscreen(isFS);
    };

    // Check on mount
    checkFullscreen();

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);

    // Also check on resize (for F11 fullscreen which might not trigger fullscreen events)
    const handleResize = () => {
      // Check if viewport height is close to screen height (indicates fullscreen)
      const isLikelyFullscreen = window.innerHeight >= screen.height * 0.95;
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };
      setIsFullscreen(isLikelyFullscreen || !!(document.fullscreenElement || 
                      doc.webkitFullscreenElement || 
                      doc.mozFullScreenElement || 
                      doc.msFullscreenElement));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
      document.removeEventListener('MSFullscreenChange', checkFullscreen);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const actionsBySection = {
    actions: actions.filter(a => (a.section ?? 'actions') === 'actions'),
    discounts: actions.filter(a => a.section === 'discounts'),
  };

  // Separate actions by color group for the main Actions tab
  const orangeActions = actionsBySection.actions.filter(a => a.color?.includes('orange'));
  const grayActions = actionsBySection.actions.filter(a => a.color?.includes('gray'));
  const greenActions = actionsBySection.actions.filter(a => a.color?.includes('green'));

  // Empty state component for tabs
  const renderEmptyState = (icon: React.ReactNode, title: string) => {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {icon}
        </div>
        <p 
          className="text-sm font-medium text-center"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </p>
        <p 
          className="text-xs mt-1 text-center"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Not found
        </p>
      </div>
    );
  };

  const renderButton = (action: ActionButton) => {
    const baseClasses = `${action.color || 'bg-orange-600'} px-4 relative transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50`;
    const isDisabled = !!action.disabled;

    // Split button (two compact squares within one grid cell)
    if (action.split) {
      const color = action.color || 'bg-orange-600';
      const split = action.split; // action.split is defined in this block
      const leftDisabled = !!split.left.disabled;
      const rightDisabled = !!split.right.disabled;
      return (
        <div
          key={action.id}
          className="grid grid-cols-2 gap-1 h-full"
          style={{ height: 'var(--row-height, 60px)' }}
        >
          <button
            onClick={() => {
              if (leftDisabled) return;
              split.left.onClick?.();
            }}
            className={`${color} w-full h-full flex items-center justify-center hover:opacity-90 ${leftDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ color: 'var(--color-text-light)', borderRadius: 0 }}
            aria-label="left-action"
            title="left-action"
            aria-disabled={leftDisabled}
          >
            {split.left.icon}
          </button>
          <button
            onClick={() => {
              if (rightDisabled) return;
              split.right.onClick?.();
            }}
            className={`${color} w-full h-full flex items-center justify-center hover:opacity-90 ${rightDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ color: 'var(--color-text-light)', borderRadius: 0 }}
            aria-label="right-action"
            title="right-action"
            aria-disabled={rightDisabled}
          >
            {split.right.icon}
          </button>
        </div>
      );
    }
    
    // Green square buttons (icon only, with circular background)
    if (action.square && !action.label) {
      return (
        <button
          key={action.id}
          onClick={() => {
            if (isDisabled) return;
            action.onClick?.();
          }}
          className={`${baseClasses} aspect-square p-3`}
          style={{ 
            color: 'var(--color-text-light)',
            borderRadius: 0,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
              {action.icon}
            </div>
          </div>
        </button>
      );
    }
    
    if (action.fullWidth) {
      const isDisabled = !!action.disabled;
      return (
        <button
          key={action.id}
          onClick={() => {
            if (isDisabled) return;
            action.onClick?.();
          }}
          className={`${baseClasses} col-span-2 py-4 flex flex-row items-center gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ 
            color: 'var(--color-text-light)',
            borderRadius: 0,
          }}
          aria-disabled={isDisabled}
        >
          {action.icon}
          <span className="text-sm font-medium">{action.label}</span>
        </button>
      );
    }

    // Square button with label (like Return product) - can span rows
    // Rectangular buttons should be taller rectangles
    if (action.square && action.label) {
      const isRectangular = action.rectangular;
      // Responsive height for rectangular buttons
      // Normal laptop browser: 102px, Fullscreen (F11): 106px
      const getRectangularHeight = () => {
        if (!isRectangular || action.rowSpan) return undefined;
        return isFullscreen ? '116px' : '102px';
      };
      
      const isDisabled = !!action.disabled;
      return (
        <button
          key={action.id}
          onClick={action.onClick}
          className={`${baseClasses} p-3 relative ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ 
            color: 'var(--color-text-light)',
            borderRadius: 0,
            gridRow: action.rowSpan ? `span ${action.rowSpan}` : undefined,
            height: action.rowSpan ? `calc(2 * var(--row-height, 60px) + var(--gap, 4px))` : undefined,
            minHeight: action.rowSpan ? undefined : isRectangular ? getRectangularHeight() : '60px',
            aspectRatio: action.rowSpan ? undefined : isRectangular ? undefined : '1 / 1',
          }}
          aria-disabled={isDisabled}
        >
          {/* Icon centered */}
          {action.icon && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              {action.icon}
            </div>
          )}
          {/* Text at left bottom */}
          <span className="absolute bottom-3 left-3 text-xs font-medium leading-tight text-left">
            {action.label}
          </span>
        </button>
      );
    }

    return (
      <button
        key={action.id}
        onClick={() => {
          if (isDisabled) return;
          action.onClick?.();
        }}
        className={`${baseClasses} ${action.tall ? 'py-6' : 'py-3'} relative ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ 
          color: 'var(--color-text-light)',
          borderRadius: 0,
        }}
        aria-disabled={isDisabled}
      >
        {/* Icon centered */}
        {action.icon && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {action.icon}
          </div>
        )}
        {/* Text at left bottom */}
        <span className="absolute bottom-3 left-3 text-xs font-medium leading-tight text-left">
          {action.label}
        </span>
      </button>
    );
  };

  // Render content based on active section
  const limitedProducts = products.slice(0, 12);

  const renderTabContent = () => {
    switch (activeSection) {
      case 'actions':
        return (
          <div className="space-y-1 overflow-hidden">
            {/* Orange/Reddish-Brown Section */}
            {orangeActions.length > 0 && (
              <div 
                className="grid grid-cols-2 gap-1 overflow-hidden" 
                style={{ 
                  gridAutoRows: 'minmax(60px, auto)',
                  '--row-height': '60px',
                  '--gap': '4px',
                } as React.CSSProperties}
              >
                {orangeActions.map(renderButton)}
              </div>
            )}

            {/* Dark Gray Section */}
            {grayActions.length > 0 && (
              <div className="grid grid-cols-2 gap-1 overflow-hidden">
                {grayActions.map(renderButton)}
              </div>
            )}
          </div>
        );
      case 'orders':
        return renderEmptyState(<FileText className="w-8 h-8" />, 'Orders');
      case 'discounts':
        const discountActions = actionsBySection.discounts;
        if (discountActions.length === 0) {
          return renderEmptyState(<Tag className="w-8 h-8" />, 'Discounts');
        }
        return (
          <div className="grid grid-cols-2 gap-1 overflow-hidden" style={{ gridAutoRows: 'minmax(80px, auto)' }}>
            {discountActions.map(renderButton)}
          </div>
        );
      case 'products':
        if (limitedProducts.length === 0) {
          return renderEmptyState(<Boxes className="w-8 h-8" />, 'Products');
        }
        return (
        <div className="grid grid-cols-2 gap-1 overflow-hidden">
          {limitedProducts.map((product) => (
            <ProductGridCard
              key={product.id}
              product={product}
              onProductClick={onProductClick}
              onAddProduct={onAddProduct}
            />
          ))}
        </div>
        );
      default:
        return renderEmptyState(<Zap className="w-8 h-8" />, 'Not found');
    }
  };

  return (
    <div
      className={`flex gap-1 h-full w-full md:w-auto ${className}`}
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {/* Main Action Buttons Panel */}
      <div className="flex-1 flex flex-col p-2 overflow-hidden min-w-0 md:min-w-[280px] lg:min-w-[320px]">
        {/* Tab-specific content */}
        <div 
          className="overflow-y-auto overflow-x-hidden min-h-0 mb-2 transaction-actions-scroll-container"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--color-border-light) var(--color-bg-secondary)',
          }}
        >
          <style>{`
            .transaction-actions-scroll-container::-webkit-scrollbar {
              width: 10px;
              height: 10px;
            }
            .transaction-actions-scroll-container::-webkit-scrollbar-track {
              background: var(--color-bg-secondary);
              border-radius: 10px;
            }
            .transaction-actions-scroll-container::-webkit-scrollbar-thumb {
              background-color: var(--color-border-light);
              border-radius: 10px;
              border: 2px solid var(--color-bg-secondary);
              transition: background-color 0.2s ease;
            }
            .transaction-actions-scroll-container::-webkit-scrollbar-thumb:hover {
              background-color: var(--color-border-medium);
            }
          `}</style>
          {renderTabContent()}
        </div>

        {/* Green Section - Always visible at bottom */}
        {greenActions.length > 0 && (
          <div className="flex-shrink-0 overflow-hidden gap-1 flex flex-col pt-2 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
            {/* Small square buttons (icon only) */}
            <div className="grid grid-cols-4 gap-1">
              {greenActions.filter(a => a.square && !a.label).map(renderButton)}
            </div>
            {/* Payment buttons (square with labels) */}
            <div className="grid grid-cols-2 gap-1">
              {greenActions.filter(a => a.square && a.label).map(renderButton)}
            </div>
          </div>
        )}
      </div>

      {/* Vertical Navigation Panel */}
      <TransactionVerticalNav
        activeSection={activeSection}
        onSectionClick={onSectionClick}
      />
    </div>
  );
}
