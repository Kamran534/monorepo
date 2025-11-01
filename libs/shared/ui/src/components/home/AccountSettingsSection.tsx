import React from 'react';
import { ComponentProps } from '../../types.js';

export interface AccountSettingsTile {
  id: string;
  title?: string;
  icon?: React.ReactNode;
  colSpan: number;
  rowSpan: number;
  backgroundColor?: string;
  onClick?: () => void;
}

export interface AccountSettingsSectionProps extends ComponentProps {
  tiles: AccountSettingsTile[];
  title?: string;
}

/**
 * Account Settings Section Component
 * Grid layout for account and system settings with blue navbar colors
 */
export function AccountSettingsSection({
  tiles,
  title = 'Account Settings',
  className = '',
}: AccountSettingsSectionProps) {
  return (
    <div className={`p-6 pr-0 pt-0 pb-0 ${className}`} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
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
                backgroundColor: tile.backgroundColor || '#0d1f35',
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

