import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ComponentProps } from '../types.js';

export interface SidePanelProps extends ComponentProps {
  /**
   * Whether the panel is open
   */
  isOpen: boolean;
  /**
   * Callback when panel should close
   */
  onClose: () => void;
  /**
   * Panel title
   */
  title?: string;
  /**
   * Panel width
   * @default '400px'
   */
  width?: string;
  /**
   * Whether to show backdrop overlay
   * @default true
   */
  showBackdrop?: boolean;
  /**
   * Custom header content
   */
  header?: React.ReactNode;
  /**
   * Custom footer content
   */
  footer?: React.ReactNode;
}

/**
 * SidePanel Component
 * 
 * A reusable side panel that slides in from the right side of the screen.
 * Can be used for different purposes across different pages.
 * 
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * <SidePanel 
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Change quantity"
 * >
 *   <div>Panel content here</div>
 * </SidePanel>
 * ```
 */
export function SidePanel({
  isOpen,
  onClose,
  title,
  width = '400px',
  showBackdrop = true,
  header,
  footer,
  children,
  className = '',
}: SidePanelProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  }, [onClose]);

  // Handle closing animation
  useEffect(() => {
    if (!isOpen && isClosing) {
      const timer = setTimeout(() => {
        setIsClosing(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, isClosing]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen || isClosing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isClosing]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Backdrop with fade effect - covers full screen including navbar */}
      {showBackdrop && (isOpen || isClosing) && (
        <div
          className={`fixed inset-0 bg-black/30 z-[60] ${
            isClosing ? 'animate-fadeOut' : 'animate-fadeIn'
          }`}
          style={{
            pointerEvents: isClosing ? 'none' : 'auto',
          }}
          onClick={handleClose}
        />
      )}

      {/* Panel - Slides in/out from right - covers full screen including navbar */}
      {(isOpen || isClosing) && (
        <div
          className={`fixed top-0 right-0 bottom-0 z-[70] shadow-2xl flex flex-col ${
            isClosing ? 'animate-slideOutToRight' : 'animate-slideInFromRight'
          } ${className}`}
          style={{
            width: width,
            backgroundColor: 'var(--color-bg-secondary)',
            borderLeft: '1px solid var(--color-border-light)',
            pointerEvents: isClosing ? 'none' : 'auto',
          }}
        >
          {/* Header */}
          {(title || header) && (
            <div
              className="flex items-center justify-between py-1.5 px-3 border-b flex-shrink-0"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              {header || (
                <>
                  <h2
                    className="text-sm font-medium"
                    style={{ 
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                    }}
                  >
                    {title}
                  </h2>
                  <button
                    onClick={handleClose}
                    className="p-1 rounded hover:bg-white/10 transition-colors flex items-center justify-center"
                    style={{
                      color: 'var(--color-text-secondary)',
                      backgroundColor: 'transparent',
                    }}
                    aria-label="Close panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto px-3 py-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              className="py-1.5 px-3 border-t flex-shrink-0"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              {footer}
            </div>
          )}
        </div>
      )}
    </>
  );
}

