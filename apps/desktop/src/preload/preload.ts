import { contextBridge, ipcRenderer } from 'electron';

// Log that preload script is running
// console.log('[Preload] Script starting...');

try {
  // Expose basic electron API
  contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
      invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
    },
  });
  // console.log('[Preload] Exposed electron API');

  // Expose electronAPI with all features
  contextBridge.exposeInMainWorld('electronAPI', {
    print: (options: any) => {
      // console.log('[Preload] Print called with options:', options);
      return ipcRenderer.invoke('print-content', options);
    },
    // Connection management API
    connection: {
      getState: () => {
        // console.log('[Preload] getState called');
        return ipcRenderer.invoke('connection:get-state');
      },
      setManual: (source: 'server' | 'local' | null) => {
        // console.log('[Preload] setManual called with source:', source);
        return ipcRenderer.invoke('connection:set-manual', source);
      },
      getManualOverride: () => {
        // console.log('[Preload] getManualOverride called');
        return ipcRenderer.invoke('connection:get-manual-override');
      },
      check: () => {
        // console.log('[Preload] check called');
        return ipcRenderer.invoke('connection:check');
      },
      onStateChange: (callback: (state: any) => void) => {
        // console.log('[Preload] onStateChange called');
        const handler = (_event: any, state: any) => {
          // console.log('[Preload] Received state change event:', state);
          callback(state);
        };
        ipcRenderer.on('connection:state-changed', handler);
        // Return cleanup function
        return () => {
          // console.log('[Preload] Removing state change listener');
          ipcRenderer.removeListener('connection:state-changed', handler);
        };
      },
    },
    // Auth API
    auth: {
      login: (username: string, password: string) => {
        // console.log('[Preload] auth.login called');
        return ipcRenderer.invoke('auth:login', username, password);
      },
      logout: () => {
        // console.log('[Preload] auth.logout called');
        return ipcRenderer.invoke('auth:logout');
      },
    },
    // Sync API
    sync: {
      triggerManual: () => {
        // console.log('[Preload] sync.triggerManual called');
        return ipcRenderer.invoke('sync:trigger-manual');
      },
      getStatus: () => {
        // console.log('[Preload] sync.getStatus called');
        return ipcRenderer.invoke('sync:get-status');
      },
    },
    // Category API
    category: {
      getAll: (includeInactive: boolean = false) => {
        // console.log('[Preload] category.getAll called');
        return ipcRenderer.invoke('category:get-all', includeInactive);
      },
      getById: (categoryId: string) => {
        // console.log('[Preload] category.getById called');
        return ipcRenderer.invoke('category:get-by-id', categoryId);
      },
    },
    // Product API
    product: {
      getAll: (options?: { page?: number; limit?: number }) => {
        // console.log('[Preload] product.getAll called with options:', options);
        return ipcRenderer.invoke('product:get-all', options);
      },
      getById: (productId: string) => {
        // console.log('[Preload] product.getById called with productId:', productId);
        return ipcRenderer.invoke('product:get-by-id', productId);
      },
      lookupByBarcode: (barcode: string) => {
        // console.log('[Preload] product.lookupByBarcode called with barcode:', barcode);
        // console.log('[Preload] Call stack:', new Error().stack);
        const result = ipcRenderer.invoke('product:lookup-barcode', barcode);
        // console.log('[Preload] ipcRenderer.invoke returned, result is Promise:', result instanceof Promise);
        return result;
      },
    },
    // Customer API
    customer: {
      getAll: () => {
        // console.log('[Preload] customer.getAll called');
        return ipcRenderer.invoke('customer:get-all');
      },
      create: (data: { name: string; email?: string; phone?: string; address?: string }) => {
        // console.log('[Preload] customer.create called');
        return ipcRenderer.invoke('customer:create', data);
      },
      update: (id: string, data: { name: string; email?: string; phone?: string; address?: string }) => {
        // console.log('[Preload] customer.update called');
        return ipcRenderer.invoke('customer:update', id, data);
      },
      delete: (id: string) => {
        // console.log('[Preload] customer.delete called');
        return ipcRenderer.invoke('customer:delete', id);
      },
    },
    // Order API
    order: {
      create: (orderData: any) => {
        // console.log('[Preload] order.create called');
        return ipcRenderer.invoke('order:create', orderData);
      },
      park: (orderData: any) => {
        // console.log('[Preload] order.park called');
        return ipcRenderer.invoke('order:park', orderData);
      },
      searchParked: (searchParams?: any) => {
        // console.log('[Preload] order.searchParked called');
        return ipcRenderer.invoke('order:search-parked', searchParams);
      },
      loadParked: (parkNumber: string) => {
        // console.log('[Preload] order.loadParked called');
        return ipcRenderer.invoke('order:load-parked', parkNumber);
      },
      completeParked: (data: any) => {
        // console.log('[Preload] order.completeParked called');
        return ipcRenderer.invoke('order:complete-parked', data);
      },
    },
    // PaymentMethod API
    paymentMethod: {
      getAll: (params?: { isActive?: boolean }) => {
        // console.log('[Preload] paymentMethod.getAll called');
        return ipcRenderer.invoke('payment-method:get-all', params);
      },
    },
    // Sales Person API
    salesPerson: {
      getAll: (params?: { search?: string; isActive?: boolean; limit?: number; offset?: number }) => {
        // console.log('[Preload] salesPerson.getAll called');
        return ipcRenderer.invoke('sales-person:get-all', params);
      },
    },
  });
  // console.log('[Preload] Exposed electronAPI with connection, auth, sync, category, product, customer, order, paymentMethod, and salesPerson APIs');
  // console.log('[Preload] Connection methods exposed: getState, setManual, getManualOverride, check, onStateChange');
  // console.log('[Preload] Auth methods exposed: login, logout');
  // console.log('[Preload] Sync methods exposed: triggerManual, getStatus');
  // console.log('[Preload] Category methods exposed: getAll, getById');
  // console.log('[Preload] Product methods exposed: getAll, getById');
  // console.log('[Preload] Customer methods exposed: getAll, create, update, delete');
} catch (error) {
  // console.error('[Preload] Failed to expose APIs:', error);
}

// Verify APIs are exposed (this won't work due to context isolation, but good for debugging)
// console.log('[Preload] Script completed successfully');

export {};
