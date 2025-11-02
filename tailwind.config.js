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
        // Primary Blue Scale (from CSS variables)
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
        },
        // Secondary Blue Scale (from CSS variables)
        secondary: {
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
        },
        // Accent Colors (from CSS variables)
        accent: {
          blue: 'var(--color-accent-blue)',
          blueLight: 'var(--color-accent-blue-light)',
          blueDark: 'var(--color-accent-blue-dark)',
        },
        // Background Colors (from CSS variables)
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          header: 'var(--color-bg-header)',
          headerAlt: 'var(--color-bg-header-alt)',
          dark: 'var(--color-bg-dark)',
          nav: 'var(--color-bg-nav)',
          search: 'var(--color-bg-search)',
          card: 'var(--color-bg-card)',
          tile: 'var(--color-bg-tile)',
          tileAlt: 'var(--color-bg-tile-alt)',
          tileDark: 'var(--color-bg-tile-dark)',
          settingsDark: 'var(--color-bg-settings-dark)',
          settingsMedium: 'var(--color-bg-settings-medium)',
          settingsGrey: 'var(--color-bg-settings-grey)',
          settingsLight: 'var(--color-bg-settings-light)',
        },
        // Text Colors (from CSS variables)
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          dark: 'var(--color-text-dark)',
          light: 'var(--color-text-light)',
          link: 'var(--color-text-link)',
          linkHover: 'var(--color-text-link-hover)',
          onDark: 'var(--color-text-on-dark)',
        },
        // Semantic Colors (from CSS variables)
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
          dark: 'var(--color-success-dark)',
          bg: 'var(--color-success-bg)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          light: 'var(--color-error-light)',
          dark: 'var(--color-error-dark)',
          bg: 'var(--color-error-bg)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)',
          dark: 'var(--color-warning-dark)',
          bg: 'var(--color-warning-bg)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          light: 'var(--color-info-light)',
          dark: 'var(--color-info-dark)',
          bg: 'var(--color-info-bg)',
        },
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
        '4xl': 'var(--spacing-4xl)',
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
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        base: 'var(--font-size-base)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)',
        '5xl': 'var(--font-size-5xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      zIndex: {
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        fixed: 'var(--z-fixed)',
        modalBackdrop: 'var(--z-modal-backdrop)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        tooltip: 'var(--z-tooltip)',
      },
    },
  },
  plugins: [],
};

