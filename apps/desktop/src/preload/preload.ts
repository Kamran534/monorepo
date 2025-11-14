import { contextBridge, ipcRenderer } from 'electron';

// Log that preload script is running
console.log('[Preload] Script starting...');

try {
  // Expose basic electron API
  contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
      invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
    },
  });
  console.log('[Preload] Exposed electron API');

  // Expose electronAPI with all features
  contextBridge.exposeInMainWorld('electronAPI', {
    print: (options: any) => {
      console.log('[Preload] Print called with options:', options);
      return ipcRenderer.invoke('print-content', options);
    },
    // Connection management API
    connection: {
      getState: () => {
        console.log('[Preload] getState called');
        return ipcRenderer.invoke('connection:get-state');
      },
      setManual: (source: 'server' | 'local' | null) => {
        console.log('[Preload] setManual called with source:', source);
        return ipcRenderer.invoke('connection:set-manual', source);
      },
      getManualOverride: () => {
        console.log('[Preload] getManualOverride called');
        return ipcRenderer.invoke('connection:get-manual-override');
      },
      check: () => {
        console.log('[Preload] check called');
        return ipcRenderer.invoke('connection:check');
      },
      onStateChange: (callback: (state: any) => void) => {
        console.log('[Preload] onStateChange called');
        const handler = (_event: any, state: any) => {
          console.log('[Preload] Received state change event:', state);
          callback(state);
        };
        ipcRenderer.on('connection:state-changed', handler);
        // Return cleanup function
        return () => {
          console.log('[Preload] Removing state change listener');
          ipcRenderer.removeListener('connection:state-changed', handler);
        };
      },
    },
    // Auth API
    auth: {
      login: (username: string, password: string) => {
        console.log('[Preload] auth.login called');
        return ipcRenderer.invoke('auth:login', username, password);
      },
      logout: () => {
        console.log('[Preload] auth.logout called');
        return ipcRenderer.invoke('auth:logout');
      },
    },
    // Sync API
    sync: {
      triggerManual: () => {
        console.log('[Preload] sync.triggerManual called');
        return ipcRenderer.invoke('sync:trigger-manual');
      },
      getStatus: () => {
        console.log('[Preload] sync.getStatus called');
        return ipcRenderer.invoke('sync:get-status');
      },
    },
    // Category API
    category: {
      getAll: (includeInactive: boolean = false) => {
        console.log('[Preload] category.getAll called');
        return ipcRenderer.invoke('category:get-all', includeInactive);
      },
      getById: (categoryId: string) => {
        console.log('[Preload] category.getById called');
        return ipcRenderer.invoke('category:get-by-id', categoryId);
      },
    },
    // Product API
    product: {
      getAll: () => {
        console.log('[Preload] product.getAll called');
        return ipcRenderer.invoke('product:get-all');
      },
    },
  });
  console.log('[Preload] Exposed electronAPI with connection, auth, sync, category, and product API');
  console.log('[Preload] Connection methods exposed: getState, setManual, getManualOverride, check, onStateChange');
  console.log('[Preload] Auth methods exposed: login, logout');
  console.log('[Preload] Sync methods exposed: triggerManual, getStatus');
  console.log('[Preload] Category methods exposed: getAll, getById');
  console.log('[Preload] Product methods exposed: getAll');
} catch (error) {
  console.error('[Preload] Failed to expose APIs:', error);
}

// Verify APIs are exposed (this won't work due to context isolation, but good for debugging)
console.log('[Preload] Script completed successfully');

export {};
