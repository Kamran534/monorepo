import React from 'react';
import {
  Zap,
  FileText,
  Tag,
  Boxes,
} from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface TransactionVerticalNavProps extends ComponentProps {
  activeSection?: string;
  onSectionClick?: (section: string) => void;
}

/**
 * TransactionVerticalNav Component
 * 
 * Vertical navigation bar on the far right
 * with icons and labels for different sections.
 */
export function TransactionVerticalNav({
  activeSection,
  onSectionClick,
  className = '',
}: TransactionVerticalNavProps) {
  const navItems = [
    {
      id: 'actions',
      label: 'ACTIONS',
      icon: <Zap className="w-6 h-6" />,
    },
    {
      id: 'orders',
      label: 'ORDERS',
      icon: <FileText className="w-6 h-6" />,
    },
    {
      id: 'discounts',
      label: 'DISCOUNTS',
      icon: <Tag className="w-6 h-6" />,
    },
    {
      id: 'products',
      label: 'PRODUCTS',
      icon: <Boxes className="w-6 h-6" />,
    },
  ];

  return (
    <div
      className={`flex flex-col  items-center gap-4 py-2 ${className}`}
      style={{
        width: '60px',
        // backgroundColor: 'var(--color-bg-card)',
        flexShrink: 0,
      }}
    >
      {navItems.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSectionClick?.(item.id)}
            className="w-full flex flex-col items-center gap-1 py-2 transition-all duration-200 relative"
            style={{
              backgroundColor: isActive
                ? 'var(--color-bg-hover)'
                : 'transparent',
              borderLeft: isActive ? '2px solid var(--color-primary-500)' : '2px solid transparent',
            }}
          >
            {/* Icon */}
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                color: isActive ? 'var(--color-primary-500)' : 'var(--color-text-secondary)',
              }}
            >
              {item.icon}
            </div>

            {/* Label */}
            <span
              className="text-[10px] font-medium leading-tight text-center"
              style={{
                color: isActive ? 'var(--color-primary-500)' : 'var(--color-text-primary)',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

