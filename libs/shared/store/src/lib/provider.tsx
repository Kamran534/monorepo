/**
 * Redux Provider Component
 *
 * Wraps the app with Redux store context
 */

import React from 'react';
import { Provider } from 'react-redux';
import { createStore, AppStore } from './store';

interface StoreProviderProps {
  children: React.ReactNode;
  store?: AppStore;
}

/**
 * Redux Store Provider
 *
 * Usage:
 * ```tsx
 * <StoreProvider>
 *   <App />
 * </StoreProvider>
 * ```
 */
export const StoreProvider: React.FC<StoreProviderProps> = ({ children, store }) => {
  // Create store instance or use provided store
  const storeInstance = React.useMemo(() => store || createStore(), [store]);

  return <Provider store={storeInstance}>{children}</Provider>;
};
