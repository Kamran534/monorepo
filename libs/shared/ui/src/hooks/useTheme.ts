import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'payflow-theme';

/**
 * Custom hook to manage light/dark theme
 * Persists theme preference to localStorage
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage for saved theme
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    // Use requestAnimationFrame for smooth DOM update
    requestAnimationFrame(() => {
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', theme);
      // Save to localStorage
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    });
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}

