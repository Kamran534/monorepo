import React from 'react';
import { Package } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { useCurrency } from '@monorepo/shared-hooks-currency';

export interface ReturnableProduct {
  id: string;
  productNumber: string;
  productName: string;
  sold: number;
  uom: string; // Unit of Measure
  previous: number;
  available: number;
  returning: number;
  unitPrice: number;
  total: number;
  variant?: string;
  sku?: string;
  barcode?: string;
  imageUrl?: string;
  // Line-level details
  lineDiscount?: number;
  lineDiscountPercent?: number;
  lineTax?: number;
  color?: string;
  size?: string;
  salesPersonName?: string;
  salesPersonId?: string;
  originalPrice?: number;
}

export interface ReturnableProductsTableProps extends ComponentProps {
  products: ReturnableProduct[];
  selectedProductId?: string;
  onProductSelect?: (productId: string) => void;
  onReturningQuantityChange?: (productId: string, quantity: number) => void;
  searchQuery?: string;
}

export function ReturnableProductsTable({
  products,
  selectedProductId,
  onProductSelect,
  onReturningQuantityChange,
  searchQuery = '',
  className = '',
}: ReturnableProductsTableProps) {
  const { formatAmount } = useCurrency({ defaultCurrency: 'PKR' });
  const formatCurrency = React.useCallback(
    (amount: number) => formatAmount(amount, { minimumFractionDigits: 2 }),
    [formatAmount],
  );

  const formatNumber = (num: number): string => {
    return num.toFixed(1);
  };

  // Filter products based on search query
  const filteredProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.productNumber.toLowerCase().includes(query) ||
        p.productName.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const selectedProduct = selectedProductId
    ? filteredProducts.find((p) => p.id === selectedProductId)
    : null;

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
          Returnable products
        </h2>
      </div>

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full flex-1">
          <Package className="w-8 h-8" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }} />
          <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {searchQuery ? 'No products found' : 'No returnable products'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {searchQuery ? 'Try a different search term' : 'Select a transaction to view returnable items'}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Table Header */}
          <div
            className="grid grid-cols-[auto,2fr,0.8fr,0.8fr,0.8fr,0.8fr,0.8fr] gap-2 px-4 py-2 sticky top-0 z-10 text-xs font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-secondary)',
              borderBottom: '1px solid var(--color-border-light)',
            }}
          >
            <span></span>
            <span>PRODUCT NUMBER</span>
            <span className="text-center">SOLD</span>
            <span className="text-center">UOM</span>
            <span className="text-center">PREVIOUS</span>
            <span className="text-center">AVAILABLE</span>
            <span className="text-center">RETURNING</span>
          </div>

          {/* Product Rows */}
          <div className="space-y-0">
            {filteredProducts.map((product) => {
              const isSelected = product.id === selectedProductId;
              return (
                <div key={product.id}>
                  <div
                    className={`grid grid-cols-[auto,2fr,0.8fr,0.8fr,0.8fr,0.8fr,0.8fr] gap-2 px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? '' : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? '#EA580C'
                        : 'var(--color-bg-secondary)',
                      color: isSelected ? '#FFFFFF' : 'var(--color-text-primary)',
                      borderBottom: '1px solid var(--color-border-light)',
                    }}
                    onClick={() => {
                      // Toggle selection: if already selected, unselect it
                      if (isSelected) {
                        onProductSelect?.('');
                      } else {
                        onProductSelect?.(product.id);
                      }
                    }}
                  >
                  <div className="flex items-start pt-[6px]">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          // Toggle selection: if already selected, unselect it
                          if (isSelected) {
                            onProductSelect?.('');
                          } else {
                            onProductSelect?.(product.id);
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                        style={{
                          accentColor: '#1A2B3C',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.productNumber}</span>
                      <span className="text-xs opacity-80">{product.productName}</span>
                    </div>
                    <span className="text-center">{product.sold}</span>
                    <span className="text-center">{product.uom}</span>
                    <span className="text-center">{formatNumber(product.previous)}</span>
                    <span className="text-center">{formatNumber(product.available)}</span>
                    <span className="text-center font-semibold">{formatNumber(product.returning)}</span>
                  </div>

                  {/* Selected Product Details */}
                  {isSelected && (
                    <div
                      className="px-4 py-3 space-y-1"
                      style={{
                        backgroundColor: '#1A2B3C',
                        borderBottom: '1px solid var(--color-border-light)',
                        color: '#FFFFFF',
                      }}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: '#FFFFFF' }}>UNIT PRICE:</span>
                        <span className="font-semibold" style={{ color: '#FFFFFF' }}>
                          {formatCurrency(product.unitPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: '#FFFFFF' }}>TOTAL:</span>
                        <span className="font-semibold" style={{ color: '#FFFFFF' }}>
                          {formatCurrency(product.total)}
                        </span>
                      </div>
                      {product.variant && (
                        <div className="text-xs" style={{ color: '#FFFFFF' }}>
                          {product.variant}
                        </div>
                      )}
                      {product.sku && (
                        <div className="text-xs" style={{ color: '#FFFFFF' }}>
                          {product.sku}
                        </div>
                      )}
                      {product.barcode && (
                        <div className="text-xs" style={{ color: '#FFFFFF' }}>
                          Bar code: {product.barcode}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

