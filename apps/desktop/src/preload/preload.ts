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
  });
  console.log('[Preload] Exposed electronAPI with connection API');
  console.log('[Preload] Connection methods exposed: getState, setManual, getManualOverride, check, onStateChange');
} catch (error) {
  console.error('[Preload] Failed to expose APIs:', error);
}

// Verify APIs are exposed (this won't work due to context isolation, but good for debugging)
console.log('[Preload] Script completed successfully');

export {};
