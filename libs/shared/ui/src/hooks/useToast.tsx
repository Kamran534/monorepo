import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
};

type ToastContextValue = {
  show: (message: string, type?: Toast['type']) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Viewport */}
      <div
        className="pointer-events-none fixed top-3 right-3 z-[9999] flex flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto min-w-[240px] max-w-[360px] px-3 py-2.5 rounded-none shadow-xl text-sm animate-slideInFromRight"
            style={{
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
            }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">{toast.message}</div>
            </div>
            {/* Progress underline */}
            <div className="mt-2 h-0.5 w-full" style={{ backgroundColor: 'var(--color-border-light)' }}>
              <div
                className="h-full"
                style={{
                  backgroundColor: 'var(--color-accent-blue)',
                  animation: 'toastProgress 2.2s linear forwards'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}


