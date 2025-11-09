/**
 * Web Auth Provider
 * Uses WebUserRepository for real authentication with online/offline support
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { WebUserRepository, type User, type LoginResult } from '../services/repositories/user-repository';
import { dataAccessService } from '../services/data-access.service';

export type WebAuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  user: User | null;
  isOffline: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
};

const WebAuthContext = createContext<WebAuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'web_auth.session';

// Singleton repository instance
const userRepository = new WebUserRepository();

export function WebAuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Try sessionStorage first
        let raw = sessionStorage.getItem(STORAGE_KEY);
        let storage: 'session' | 'local' = 'session';

        if (!raw) {
          // Fallback to localStorage for "remember me"
          raw = localStorage.getItem(STORAGE_KEY);
          storage = 'local';
        }

        if (raw) {
          const session = JSON.parse(raw) as {
            user: User;
            token?: string;
            isOffline: boolean;
          };

          setIsAuthenticated(true);
          setUser(session.user);
          setIsOffline(session.isOffline);

          // Restore token if available
          if (session.token) {
            dataAccessService.setAuthToken(session.token);

            // If we were online, try to initialize sync
            if (!session.isOffline) {
              try {
                await dataAccessService.initializeSyncService(session.user.id);
              } catch (error) {
                console.warn('[WebAuthProvider] Failed to initialize sync on restore:', error);
              }
            }
          }

          console.log(`[WebAuthProvider] Session restored from ${storage}Storage`);
        }
      } catch (error) {
        console.warn('[WebAuthProvider] Failed to restore session:', error);
      }

      setIsReady(true);
    };

    restoreSession();
  }, []);

  const login = useCallback(async (username: string, password: string, remember = false) => {
    try {
      const result: LoginResult = await userRepository.login(username, password);

      if (result.success && result.user) {
        setIsAuthenticated(true);
        setUser(result.user);
        setIsOffline(result.isOffline);

        // Save session
        const session = {
          user: result.user,
          token: result.token,
          isOffline: result.isOffline,
        };

        try {
          const payload = JSON.stringify(session);
          if (remember) {
            localStorage.setItem(STORAGE_KEY, payload);
            sessionStorage.removeItem(STORAGE_KEY);
          } else {
            sessionStorage.setItem(STORAGE_KEY, payload);
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (error) {
          console.warn('[WebAuthProvider] Failed to save session:', error);
        }

        // Initialize sync if online
        if (!result.isOffline && result.token) {
          try {
            await dataAccessService.initializeSyncService(result.user.id);
          } catch (error) {
            console.warn('[WebAuthProvider] Failed to initialize sync after login:', error);
          }
        }

        console.log(
          `[WebAuthProvider] Login successful (${result.isOffline ? 'offline' : 'online'})`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('[WebAuthProvider] Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    setUser(null);
    setIsOffline(false);

    try {
      await userRepository.logout();
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[WebAuthProvider] Logout cleanup error:', error);
    }

    console.log('[WebAuthProvider] Logged out');
  }, []);

  const value = useMemo<WebAuthContextValue>(
    () => ({
      isReady,
      isAuthenticated,
      user,
      isOffline,
      login,
      logout,
    }),
    [isReady, isAuthenticated, user, isOffline, login, logout]
  );

  return <WebAuthContext.Provider value={value}>{children}</WebAuthContext.Provider>;
}

export function useWebAuth(): WebAuthContextValue {
  const ctx = useContext(WebAuthContext);
  if (!ctx) throw new Error('useWebAuth must be used within WebAuthProvider');
  return ctx;
}
