import React, { useState } from 'react';
import { ComponentProps } from '../types.js';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
}

export interface SidebarProps extends ComponentProps {
  items: SidebarItem[];
  footerItems?: SidebarItem[];
  activeItemId?: string;
  onItemClick?: (item: SidebarItem) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  logo?: React.ReactNode;
  appName?: string;
  isExpanded?: boolean;
  onClose?: () => void;
}

/**
 * Shared Sidebar Component - Minimal Icon-Only Design
 * Compact sidebar matching Store Commerce theme
 * Used in both Web and Desktop apps
 */
export function Sidebar({
  items,
  footerItems = [],
  activeItemId,
  onItemClick,
  className = '',
  isExpanded = false,
  onClose,
}: Omit<SidebarProps, 'collapsed' | 'onToggleCollapse' | 'appName' | 'logo'>) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const renderItem = (item: SidebarItem) => {
    const isActive = item.id === activeItemId;
    const isHovered = item.id === hoveredItem;

    return (
      <li key={item.id}>
        <button
          onClick={() => {
            onItemClick?.(item);
            if (isExpanded) {
              onClose?.();
            }
          }}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          className={`w-full flex items-center py-2 transition-all duration-200 relative ${
            isExpanded ? 'px-4 gap-3' : 'justify-center'
          }`}
          style={{
            backgroundColor: isActive
              ? 'var(--color-bg-hover)'
              : isHovered
              ? 'var(--color-bg-tertiary)'
              : 'transparent',
            borderLeft: isActive ? '2px solid var(--color-primary-500)' : '2px solid transparent',
          }}
          title={!isExpanded ? item.label : undefined}
          aria-label={item.label}
        >
          {/* Icon */}
          <div
            className="w-4 h-4 flex items-center justify-center flex-shrink-0"
            style={{
              color: isActive ? 'var(--color-primary-500)' : 'var(--color-text-secondary)',
            }}
          >
            {item.icon}
          </div>

          {/* Label - only show when expanded */}
          {isExpanded && (
            <span
              className="text-sm font-medium flex-1 text-left"
              style={{
                color: isActive ? 'var(--color-primary-500)' : 'var(--color-text-primary)',
              }}
            >
              {item.label}
            </span>
          )}

          {/* Badge */}
          {item.badge && (
            <>
              {isExpanded ? (
                <span
                  className="px-2 py-0.5 text-xs font-semibold rounded-full"
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                  }}
                >
                  {item.badge}
                </span>
              ) : (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: '#ef4444',
                  }}
                />
              )}
            </>
          )}
        </button>
      </li>
    );
  };

  return (
    <aside
      className={`flex flex-col transition-all duration-300 ease-in-out ${className}`}
      style={{
        width: isExpanded ? '240px' : '40px',
        backgroundColor: 'var(--color-bg-secondary)',
        height: '100%',
        borderRight: '1px solid var(--color-border-light)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto pt-8 pb-1">
        <ul className="space-y-2">
          {items.map((item) => renderItem(item))}
        </ul>
      </nav>

      {/* Footer Items (Settings at bottom) */}
      {footerItems.length > 0 && (
        <div className="pt-2 pb-2" style={{ borderTop: '1px solid var(--color-border-light)' }}>
          <ul className="space-y-2">
            {footerItems.map((item) => renderItem(item))}
          </ul>
        </div>
      )}
    </aside>
  );
}

