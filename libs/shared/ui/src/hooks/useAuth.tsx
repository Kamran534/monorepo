import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  userPassword: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'auth.session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPassword, setUserPassword] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { email: string; password?: string };
        setIsAuthenticated(true);
        setUserEmail(parsed.email);
        setUserPassword(parsed.password ?? null);
        setIsReady(true);
        return;
      }
      // fallback to localStorage for remembered sessions
      const rawLocal = localStorage.getItem(STORAGE_KEY);
      if (rawLocal) {
        const parsedLocal = JSON.parse(rawLocal) as { email: string; password?: string };
        setIsAuthenticated(true);
        setUserEmail(parsedLocal.email);
        setUserPassword(parsedLocal.password ?? null);
        setIsReady(true);
        return;
      }
    } catch {
      // ignore
    }
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    // Hardcoded credentials for now
    const ok = email === 'admin@gmail.com' && password === 'admin';
    if (ok) {
      setIsAuthenticated(true);
      setUserEmail(email);
      setUserPassword(password);
      try {
        const payload = JSON.stringify({ email, password });
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
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUserEmail(null);
    setUserPassword(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isReady, isAuthenticated, userEmail, userPassword, login, logout }),
    [isReady, isAuthenticated, userEmail, userPassword, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
