/**
 * Shared Global Variables
 * TypeScript constants for colors, spacing, and design tokens
 * Used across Web, Desktop, and Mobile apps
 */

export const COLORS = {
  // Primary Blue Scale
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  // Secondary Blue Scale
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  // Accent Colors
  accent: {
    blue: '#0078d4',
    blueLight: '#40a9ff',
    blueDark: '#005a9e',
  },
  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8f8f8',
    tertiary: '#f3f4f6',
    header: '#1a202c',
    headerAlt: '#212529',
    dark: '#202020',
    nav: '#212b36',
    search: '#343a40',
    input: '#ffffff',
    inputDisabled: '#f3f4f6',
    card: '#ffffff',
    tile: '#6c757d',
    tileAlt: '#8b453a',
    tileDark: '#5c4033',
    selected: '#3b82f6',
    hover: '#f3f4f6',
  },
  // Text Colors
  text: {
    primary: '#333333',
    secondary: '#666666',
    tertiary: '#999999',
    dark: '#212b36',
    light: '#ffffff',
    link: '#3b82f6',
    linkHover: '#2563eb',
    onDark: '#ffffff',
  },
  // Semantic Colors
  semantic: {
    success: '#22c55e',
    successLight: '#86efac',
    successDark: '#16a34a',
    successBg: '#dcfce7',
    error: '#ef4444',
    errorLight: '#fca5a5',
    errorDark: '#dc2626',
    errorBg: '#fee2e2',
    warning: '#f59e0b',
    warningLight: '#fcd34d',
    warningDark: '#d97706',
    warningBg: '#fef3c7',
    info: '#3b82f6',
    infoLight: '#93c5fd',
    infoDark: '#2563eb',
    infoBg: '#dbeafe',
  },
  // Border Colors
  border: {
    light: '#e0e0e0',
    medium: '#cccccc',
    dark: '#999999',
    focus: '#3b82f6',
    error: '#ef4444',
  },
} as const;

export const SPACING = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
  '4xl': '6rem',  // 96px
} as const;

export const FONT_SIZES = {
  xs: '0.75rem',      // 12px
  sm: '0.875rem',     // 14px
  base: '1rem',       // 16px
  lg: '1.125rem',     // 18px
  xl: '1.25rem',      // 20px
  '2xl': '1.5rem',    // 24px
  '3xl': '1.875rem',  // 30px
  '4xl': '2.25rem',   // 36px
  '5xl': '3rem',      // 48px
} as const;

export const FONT_WEIGHTS = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const LINE_HEIGHTS = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const BREAKPOINTS = {
  xs: '320px',
  sm: '480px',
  md: '640px',
  lg: '768px',
  xl: '1024px',
  '2xl': '1280px',
  '3xl': '1536px',
  '4xl': '1920px',
} as const;

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

export const TRANSITIONS = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
} as const;

export const RADIUS = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

