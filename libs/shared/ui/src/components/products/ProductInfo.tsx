import React from 'react';
import { ComponentProps } from '../../types.js';

export interface ProductInfoProps extends ComponentProps {
  productName: string;
  productNumber: string;
  price: string;
  currentQuantity?: number;
  unit?: string;
  onAddItem?: () => void;
  onOtherStoresInventory?: () => void;
}

/**
 * ProductInfo Component
 * 
 * Displays product information including name, number, price, and quantity
 * 
 * @example
 * ```tsx
 * <ProductInfo
 *   productName="Brown Leopardprint Sunglasses"
 *   productNumber="81328"
 *   price="$130.00"
 *   currentQuantity={0}
 *   unit="Each"
 * />
 * ```
 */
export function ProductInfo({
  productName,
  productNumber,
  price,
  currentQuantity = 0,
  unit = 'Each',
  onAddItem,
  onOtherStoresInventory,
  className = '',
}: ProductInfoProps) {
  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Details
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {productName}
            </div>
            <div className="text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>
              {productNumber}
            </div>
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {price}
          </div>
        </div>
      </div>

      {/* Add Item Button */}
      {onAddItem && (
        <button
          onClick={onAddItem}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--color-primary-500)',
            color: 'var(--color-text-light)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Add item
        </button>
      )}

      {/* Quantity and Unit */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Current store quantity
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {currentQuantity}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Unit
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {unit}
          </span>
        </div>
      </div>

      {/* Other Stores Inventory Link */}
      {onOtherStoresInventory && (
        <button
          onClick={onOtherStoresInventory}
          className="text-sm text-left transition-colors"
          style={{
            color: 'var(--color-primary-500)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          Other stores inventory
        </button>
      )}
    </div>
  );
}

