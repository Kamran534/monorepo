import React from 'react';
import { Store, Loader2 } from 'lucide-react';
import { ComponentProps } from '../types.js';

export interface SplashScreenProps extends ComponentProps {
  /**
   * App name to display
   * @default 'PayFlow POS'
   */
  appName?: string;
  /**
   * Whether to show loading spinner
   * @default true
   */
  showSpinner?: boolean;
  /**
   * Custom logo component
   */
  logo?: React.ReactNode;
}

/**
 * SplashScreen Component
 * 
 * A full-screen splash screen shown during app initialization.
 * Displays app logo, name, and optional loading indicator.
 * 
 * @example
 * ```tsx
 * <SplashScreen appName="PayFlow POS" />
 * ```
 */
export function SplashScreen({
  appName = 'PayFlow POS',
  showSpinner = false,
  logo,
  className = '',
}: SplashScreenProps) {
  const defaultLogo = (
    <Store 
      className="w-24 h-24" 
      style={{ 
        color: 'var(--color-primary-500)',
      }} 
    />
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center"
        style={{
          animation: 'fadeIn 0.5s ease-in-out',
        }}
      >
        {logo || defaultLogo}
      </div>

      {/* App Name */}
      <h1
        className="text-4xl font-bold tracking-tight"
        style={{
          color: 'var(--color-text-primary)',
          animation: 'fadeIn 0.5s ease-in-out 0.2s both',
        }}
      >
        {appName}
      </h1>

      {/* Loading Spinner */}
      {showSpinner && (
        <div
          className="flex items-center justify-center mt-4"
          style={{
            animation: 'fadeIn 0.5s ease-in-out 0.4s both',
          }}
        >
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{
              color: 'var(--color-primary-500)',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

