// Type definitions for Electron APIs exposed to renderer

interface ConnectionState {
  status: 'online' | 'offline' | 'checking' | 'unknown';
  dataSource: 'server' | 'local';
  serverUrl: string;
  lastChecked: string | null; // ISO string from IPC, not Date object
  error?: string;
}

interface ManualOverride {
  enabled: boolean;
  dataSource: 'server' | 'local' | null;
}

interface ElectronAPI {
  print: (options: {
    silent?: boolean;
    printBackground?: boolean;
    deviceName?: string;
    htmlContent?: string;
  }) => Promise<{ success: boolean }>;
  connection: {
    getState: () => Promise<ConnectionState>;
    setManual: (source: 'server' | 'local' | null) => Promise<{ success: boolean; state?: ConnectionState }>;
    getManualOverride: () => Promise<ManualOverride>;
    check: () => Promise<any>;
    onStateChange: (callback: (state: ConnectionState) => void) => () => void;
  };
}

interface Window {
  electronAPI: ElectronAPI;
  electron: {
    ipcRenderer: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  };
}

