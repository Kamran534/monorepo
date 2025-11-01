const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Web app
    join(__dirname, 'apps/web/{src,pages,components,app}/**/*.{ts,tsx,js,jsx}'),
    // Desktop app
    join(__dirname, 'apps/desktop/src/**/*.{ts,tsx,js,jsx,html}'),
    // Mobile app (web version)
    join(__dirname, 'apps/mobile/src/**/*.{ts,tsx,js,jsx}'),
    // All libraries
    join(__dirname, 'libs/**/*.{ts,tsx,js,jsx}'),
  ],
  theme: {
    extend: {
      colors: {
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
        bg: {
          primary: '#ffffff',
          secondary: '#f8f8f8',
          tertiary: '#f3f4f6',
          header: '#1a202c',
          headerAlt: '#212529',
          dark: '#202020',
          nav: '#212b36',
          search: '#343a40',
          card: '#ffffff',
          tile: '#6c757d',
          tileAlt: '#8b453a',
          tileDark: '#5c4033',
        },
        // Text Colors
        text: {
          primary: '#333333',
          secondary: '#666666',
          tertiary: '#999999',
          dark: '#212b36',
          light: '#ffffff',
        },
        // Semantic Colors
        success: {
          DEFAULT: '#22c55e',
          light: '#86efac',
          dark: '#16a34a',
          bg: '#dcfce7',
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#fca5a5',
          dark: '#dc2626',
          bg: '#fee2e2',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fcd34d',
          dark: '#d97706',
          bg: '#fef3c7',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#93c5fd',
          dark: '#2563eb',
          bg: '#dbeafe',
        },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
        '4xl': '6rem',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
        ],
        mono: ['"Courier New"', 'Courier', 'monospace'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modalBackdrop: '1040',
        modal: '1050',
        popover: '1060',
        tooltip: '1070',
      },
    },
  },
  plugins: [],
};

