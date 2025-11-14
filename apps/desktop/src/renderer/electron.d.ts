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

interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  parentCategory?: {
    id: string;
    name: string;
  } | null;
  childCategories?: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;
  _count?: {
    products: number;
  };
}

interface GetCategoriesResult {
  success: boolean;
  categories?: Category[];
  error?: string;
  isOffline?: boolean;
}

interface GetCategoryResult {
  success: boolean;
  category?: Category;
  error?: string;
}

interface Product {
  id: string;
  productNumber: string;
  name: string;
  description?: string;
  categoryId?: string;
  price: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

interface GetProductsResult {
  success: boolean;
  products?: Product[];
  error?: string;
  isOffline?: boolean;
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
  category: {
    getAll: (includeInactive?: boolean) => Promise<GetCategoriesResult>;
    getById: (categoryId: string) => Promise<GetCategoryResult>;
  };
  product: {
    getAll: () => Promise<GetProductsResult>;
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

