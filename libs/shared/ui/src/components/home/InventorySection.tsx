import React from 'react';
import { ComponentProps } from '../../types.js';

export interface InventoryTile {
  id: string;
  title?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  colSpan?: number;
  rowSpan?: number;
  backgroundColor?: string;
}

export interface InventorySectionProps extends ComponentProps {
  tiles: InventoryTile[];
  title?: string;
}

/**
 * InventorySection Component
 * 
 * A grid of inventory management tiles for quick access to inventory features
 * 
 * @example
 * ```tsx
 * import { InventorySection } from '@monorepo/shared-ui';
 * 
 * const tiles = [
 *   { id: '1', title: 'Inventory lookup', icon: <Search /> },
 *   { id: '2', title: 'Price check', icon: <DollarSign /> },
 * ];
 * 
 * <InventorySection tiles={tiles} title="Inventory" />
 * ```
 */
export function InventorySection({
  tiles,
  title = 'Inventory',
  className = '',
}: InventorySectionProps) {
  return (
    <div className={`p-6 pt-0 pr-0 ${className}`} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Title */}
      <h2 
        className="text-xl font-bold mb-2 uppercase"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>

      {/* Grid of Tiles */}
      <div className="grid gap-1" style={{ 
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridAutoRows: 'minmax(130px, auto)'
      }}>
        {tiles.map((tile) => {
          const colSpan = tile.colSpan || 1;
          const rowSpan = tile.rowSpan || 1;
          const isLarge = colSpan > 1 || rowSpan > 1;

          return (
            <button
              key={tile.id}
              onClick={tile.onClick}
              className={`
                flex flex-col items-center justify-center
                p-4
                transition-all
                hover:opacity-90
                hover:scale-[1.02]
                active:scale-[0.98]
                focus:outline-none
                focus:ring-2
                focus:ring-white
                focus:ring-opacity-50
                shadow-sm
              `}
              style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
                backgroundColor: tile.backgroundColor || 'var(--color-tile-brown-1)',
                color: 'var(--color-text-light)',
                borderRadius: 0,
              }}
            >
              {tile.icon && (
                <div className="mb-2 flex items-center justify-center" style={{ fontSize: isLarge ? 36 : 28 }}>
                  {tile.icon}
                </div>
              )}
              {tile.title && (
                <span className="text-xs text-center font-medium leading-tight" style={{ fontSize: isLarge ? '0.75rem' : '0.65rem' }}>
                  {tile.title}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

