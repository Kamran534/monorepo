// Type definitions for Electron APIs exposed to renderer

interface ElectronAPI {
  print: (options: {
    silent?: boolean;
    printBackground?: boolean;
    deviceName?: string;
    htmlContent?: string;
  }) => Promise<{ success: boolean }>;
}

interface Window {
  electronAPI: ElectronAPI;
  electron: {
    ipcRenderer: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  };
}

