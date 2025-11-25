import React, { useState } from 'react';
import { Package, ArrowRight } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import type { ReturnableProduct } from './ReturnableProductsTable.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';

export interface ReturnDetailsPanelProps extends ComponentProps {
  selectedProduct?: ReturnableProduct | null;
  returningQuantity: number;
  onReturningQuantityChange?: (quantity: number) => void;
  onAddToCart?: () => void;
}

export function ReturnDetailsPanel({
  selectedProduct,
  returningQuantity,
  onReturningQuantityChange,
  onAddToCart,
  className = '',
}: ReturnDetailsPanelProps) {
  const [imageError, setImageError] = useState(false);
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = React.useCallback(
    (amount: number) => formatAmount(amount, { minimumFractionDigits: 2 }),
    [formatAmount],
  );

  const formatNumber = (num: number): string => {
    return num.toFixed(1);
  };

  // Reset image error when product changes
  React.useEffect(() => {
    setImageError(false);
  }, [selectedProduct?.id]);

  return (
    <div
      className={`flex flex-col h-full w-full min-h-0 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex-shrink-0"
        style={{
          borderColor: 'var(--color-border-light)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Details
        </h2>
      </div>

      {/* Content */}
      {!selectedProduct ? (
        <div className="flex flex-col items-center justify-center h-full flex-1">
          <Package className="w-12 h-12" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
          <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            No product selected
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Select a product from the returnable products list
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Image and Specifications in Flex View */}
            <div className="flex gap-4">
              {/* Image Section */}
              <div className="flex-shrink-0">
                <div
                  className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border-light)',
                  }}
                >
                  {selectedProduct.imageUrl && !imageError ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.productName}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <Package className="w-12 h-12" style={{ color: 'var(--color-text-secondary)' }} />
                  )}
                </div>
              </div>

              {/* Specifications Section */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-col gap-1.5">
                  {selectedProduct.sku && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        SKU:
                      </span>
                      <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {selectedProduct.sku}
                      </span>
                    </div>
                  )}
                  {selectedProduct.barcode && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        Barcode:
                      </span>
                      <span className="text-xs font-mono flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {selectedProduct.barcode}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                      UOM:
                    </span>
                    <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)' }}>
                      {selectedProduct.uom}
                    </span>
                  </div>
                  {selectedProduct.variant && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        Variant:
                      </span>
                      <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {selectedProduct.variant}
                      </span>
                    </div>
                  )}
                  {selectedProduct.color && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        Color:
                      </span>
                      <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {selectedProduct.color}
                      </span>
                    </div>
                  )}
                  {selectedProduct.size && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        Size:
                      </span>
                      <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {selectedProduct.size}
                      </span>
                    </div>
                  )}
                  {selectedProduct.salesPersonName && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        Sales Person:
                      </span>
                      <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {selectedProduct.salesPersonName}
                      </span>
                    </div>
                  )}
                  {selectedProduct.originalPrice && selectedProduct.originalPrice !== selectedProduct.unitPrice && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        Original Price:
                      </span>
                      <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(selectedProduct.originalPrice)}
                      </span>
                    </div>
                  )}
                  {(selectedProduct.lineDiscount !== undefined && selectedProduct.lineDiscount > 0) && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        Line Discount:
                      </span>
                      <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(selectedProduct.lineDiscount)}
                        {selectedProduct.lineDiscountPercent && ` (${selectedProduct.lineDiscountPercent.toFixed(1)}%)`}
                      </span>
                    </div>
                  )}
                  {(selectedProduct.lineTax !== undefined && selectedProduct.lineTax > 0) && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        Line Tax:
                      </span>
                      <span className="text-xs flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(selectedProduct.lineTax)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Returning Quantity Section */}
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Returning now
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 text-3xl font-bold text-center py-[2px] px-4 rounded"
                  style={{
                    backgroundColor: '#1A2B3C',
                    color: '#FFFFFF',
                  }}
                >
                  {formatNumber(returningQuantity)}
                </div>
                <button
                  type="button"
                  className="w-12 h-12 flex items-center justify-center rounded hover:opacity-90 transition-opacity bg-orange-600"
                  style={{
                    color: '#FFFFFF',
                  }}
                  onClick={() => {
                    if (onAddToCart) {
                      // Add to cart with negative billing
                      onAddToCart();
                    } else {
                      // Fallback: Increment quantity
                      const newQty = Math.min(returningQuantity + 1, selectedProduct.available);
                      onReturningQuantityChange?.(newQty);
                    }
                  }}
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Fixed Bottom Section - Unit Price and Total */}
          <div
            className="flex-shrink-0 p-4 border-t space-y-2"
            style={{
              borderColor: 'var(--color-border-light)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-text-secondary)' }}>UNIT PRICE:</span>
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {formatCurrency(selectedProduct.unitPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-text-secondary)' }}>TOTAL:</span>
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {formatCurrency(selectedProduct.unitPrice * returningQuantity)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

