import React from 'react';
import { ComponentProps } from '../types.js';
import { Loader2 } from 'lucide-react';

export interface LoadingProps extends ComponentProps {
  /**
   * Loading message to display
   */
  message?: string;
  /**
   * Size of the spinner
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Whether to show full screen overlay
   * @default false
   */
  fullScreen?: boolean;
  /**
   * Custom spinner color
   */
  spinnerColor?: string;
}

/**
 * Loading Component
 * 
 * A reusable loading indicator with spinner and optional message.
 * Can be used as inline loader or full-screen overlay.
 * 
 * @example
 * ```tsx
 * // Inline loading
 * <Loading message="Loading data..." />
 * 
 * // Full screen loading
 * <Loading message="Please wait..." fullScreen size="lg" />
 * ```
 */
export function Loading({
  message,
  size = 'md',
  fullScreen = false,
  spinnerColor,
  className = '',
}: LoadingProps) {
  // Size configurations
  const sizeConfig = {
    sm: { spinner: 'w-4 h-4', text: 'text-sm' },
    md: { spinner: 'w-6 h-6', text: 'text-base' },
    lg: { spinner: 'w-8 h-8', text: 'text-lg' },
    xl: { spinner: 'w-12 h-12', text: 'text-xl' },
  };

  const config = sizeConfig[size];

  const spinnerStyle = spinnerColor
    ? { color: spinnerColor }
    : { color: 'var(--color-primary-500)' };

  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      style={{
        color: 'var(--color-text-primary)',
      }}
    >
      <Loader2
        className={`${config.spinner} animate-spin`}
        style={spinnerStyle}
      />
      {message && (
        <p
          className={`${config.text} font-medium text-center`}
          style={{
            color: 'var(--color-text-secondary)',
          }}
        >
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div
          className="flex flex-col items-center justify-center p-8 rounded-lg"
          style={{
            // backgroundColor: 'var(--color-bg-card)',
            // boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
}

