import React from 'react';
import { ComponentProps } from '../../types.js';
import { TransactionVerticalNav } from './TransactionVerticalNav.js';

export interface ActionButton {
  id: string;
  icon?: React.ReactNode;
  label: string;
  color?: string;
  onClick?: () => void;
  tall?: boolean;
  fullWidth?: boolean;
  square?: boolean;
  rowSpan?: number;
  rectangular?: boolean;
}

export interface TransactionActionsProps extends ComponentProps {
  actions: ActionButton[];
  activeSection?: string;
  onSectionClick?: (section: string) => void;
}

/**
 * TransactionActions Component
 * 
 * Right panel displaying action buttons grid
 * for the transactions page.
 */
export function TransactionActions({
  actions,
  activeSection,
  onSectionClick,
  className = '',
}: TransactionActionsProps) {
  // Separate actions by color group
  const orangeActions = actions.filter(a => a.color?.includes('orange'));
  const grayActions = actions.filter(a => a.color?.includes('gray'));
  const greenActions = actions.filter(a => a.color?.includes('green'));

  const renderButton = (action: ActionButton) => {
    const baseClasses = `${action.color || 'bg-orange-600'} px-4 relative transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50`;
    
    // Green square buttons (icon only, with circular background)
    if (action.square && !action.label) {
      return (
        <button
          key={action.id}
          onClick={action.onClick}
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
      return (
        <button
          key={action.id}
          onClick={action.onClick}
          className={`${baseClasses} col-span-2 py-4 flex flex-row items-center gap-2`}
          style={{ 
            color: 'var(--color-text-light)',
            borderRadius: 0,
          }}
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
      return (
        <button
          key={action.id}
          onClick={action.onClick}
          className={`${baseClasses} p-3 relative`}
          style={{ 
            color: 'var(--color-text-light)',
            borderRadius: 0,
            gridRow: action.rowSpan ? `span ${action.rowSpan}` : undefined,
            height: action.rowSpan ? `calc(2 * var(--row-height, 60px) + var(--gap, 4px))` : undefined,
            minHeight: action.rowSpan ? undefined : isRectangular ? '106px' : '60px',
            aspectRatio: action.rowSpan ? undefined : isRectangular ? undefined : '1 / 1',
          }}
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
        onClick={action.onClick}
        className={`${baseClasses} ${action.tall ? 'py-6' : 'py-3'} relative`}
        style={{ 
          color: 'var(--color-text-light)',
          borderRadius: 0,
        }}
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

  return (
    <div
      className={`flex gap-1 h-full ${className}`}
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {/* Main Action Buttons Panel */}
      <div className="flex-1 flex flex-col p-2 gap-1 overflow-y-auto" style={{ width: '320px', minWidth: '320px' }}>
        {/* Orange/Reddish-Brown Section */}
        {orangeActions.length > 0 && (
          <div 
            className="grid grid-cols-2 gap-1" 
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
          <div className="grid grid-cols-2 gap-1">
            {grayActions.map(renderButton)}
          </div>
        )}

        {/* Green Section */}
        {greenActions.length > 0 && (
          <div className="space-y-1">
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
