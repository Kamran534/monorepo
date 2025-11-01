import React from 'react';
import { ComponentProps } from '../../types.js';

export interface NavigationTile {
  id: string;
  title?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  colSpan?: number;
  rowSpan?: number;
  backgroundColor?: string;
}

export interface StartSectionProps extends ComponentProps {
  tiles: NavigationTile[];
  title?: string;
}

/**
 * StartSection Component
 * 
 * A navigation dashboard with grid of tiles for quick access to features
 * 
 * @example
 * ```tsx
 * import { StartSection } from '@monorepo/shared-ui';
 * import { ShoppingBag, Package } from 'lucide-react';
 * 
 * const tiles = [
 *   { id: '1', title: 'Current transaction', icon: <ShoppingBag />, size: 'large' },
 *   { id: '2', title: 'Return transaction', icon: <Package />, size: 'medium' },
 * ];
 * 
 * <StartSection tiles={tiles} title="Start" />
 * ```
 */
export function StartSection({
  tiles,
  title = 'Start',
  className = '',
}: StartSectionProps) {
  return (
    <div className={`p-6 pt-0 pr-0 pb-0 ${className}`} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Title */}
      <h2 
        className="text-xl  font-bold mb-2 uppercase"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>

      {/* Grid of Tiles */}
      <div className="grid gap-1" style={{
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridAutoRows: 'minmax(100px, auto)'
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
                p-3
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

