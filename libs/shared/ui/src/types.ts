/**
 * Shared TypeScript Types
 * Type definitions for design tokens and UI components
 */

export type ColorScale = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type LineHeight = 'tight' | 'normal' | 'relaxed';
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type RadiusSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ResponsiveProps {
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
}

