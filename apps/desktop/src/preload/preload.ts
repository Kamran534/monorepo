import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  },
});

// Expose print API for silent printing
contextBridge.exposeInMainWorld('electronAPI', {
  print: (options: any) => ipcRenderer.invoke('print-content', options),
});

export {};
