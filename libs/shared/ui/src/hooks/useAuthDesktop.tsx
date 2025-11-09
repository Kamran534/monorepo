/**
 * Desktop Auth Hook
 * 
 * Uses IPC to communicate with main process for authentication
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface DesktopUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName?: string;
  employeeCode?: string;
}

export type DesktopAuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  user: DesktopUser | null;
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  isOffline?: boolean;
};

const DesktopAuthContext = createContext<DesktopAuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'auth.session';

// Type declaration for electronAPI
declare global {
  interface Window {
    electronAPI?: {
      auth: {
        login: (username: string, password: string) => Promise<{
          success: boolean;
          user?: DesktopUser;
          token?: string;
          error?: string;
          isOffline?: boolean;
        }>;
        logout: () => Promise<{ success: boolean }>;
      };
    };
  }
}

export function DesktopAuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<DesktopUser | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check for existing session
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: DesktopUser; isOffline?: boolean };
        setIsAuthenticated(true);
        setUser(parsed.user);
        setIsOffline(parsed.isOffline || false);
        setIsReady(true);
        return;
      }
      // Fallback to localStorage for remembered sessions
      const rawLocal = localStorage.getItem(STORAGE_KEY);
      if (rawLocal) {
        const parsedLocal = JSON.parse(rawLocal) as { user: DesktopUser; isOffline?: boolean };
        setIsAuthenticated(true);
        setUser(parsedLocal.user);
        setIsOffline(parsedLocal.isOffline || false);
        setIsReady(true);
        return;
      }
    } catch {
      // ignore
    }
    setIsReady(true);
  }, []);

  const login = useCallback(async (username: string, password: string, remember = false) => {
    console.log('[DesktopAuth] login called with username:', username);
    
    if (!window.electronAPI?.auth) {
      console.error('[DesktopAuth] electronAPI.auth not available');
      return false;
    }

    console.log('[DesktopAuth] Calling electronAPI.auth.login...');
    try {
      const result = await window.electronAPI.auth.login(username, password);
      console.log('[DesktopAuth] Login result:', {
        success: result.success,
        hasUser: !!result.user,
        hasToken: !!result.token,
        isOffline: result.isOffline,
        error: result.error,
      });
      
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setUser(result.user);
        setIsOffline(result.isOffline || false);
        
        // Save session
        try {
          const payload = JSON.stringify({ user: result.user, isOffline: result.isOffline });
          if (remember) {
            localStorage.setItem(STORAGE_KEY, payload);
            sessionStorage.removeItem(STORAGE_KEY);
          } else {
            sessionStorage.setItem(STORAGE_KEY, payload);
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          // ignore
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[DesktopAuth] Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (window.electronAPI?.auth) {
        await window.electronAPI.auth.logout();
      }
    } catch (error) {
      console.error('[DesktopAuth] Logout error:', error);
    }
    
    setIsAuthenticated(false);
    setUser(null);
    setIsOffline(false);
    
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<DesktopAuthContextValue>(
    () => ({ isReady, isAuthenticated, user, login, logout, isOffline }),
    [isReady, isAuthenticated, user, login, logout, isOffline]
  );

  return <DesktopAuthContext.Provider value={value}>{children}</DesktopAuthContext.Provider>;
}

export function useDesktopAuth(): DesktopAuthContextValue {
  const ctx = useContext(DesktopAuthContext);
  if (!ctx) throw new Error('useDesktopAuth must be used within DesktopAuthProvider');
  return ctx;
}

