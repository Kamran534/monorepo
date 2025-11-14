import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

// Import shared UI styles first
import '@monorepo/shared-ui/styles/globals.css';
import '@monorepo/shared-ui/styles/components.css';

import App from './app/app';
import { registerSW } from 'virtual:pwa-register';
import { dataAccessService } from './services/data-access.service';
import { StoreProvider } from '@monorepo/shared-store';

// Initialize data access service
dataAccessService.initialize().catch((error) => {
  console.error('[App] Failed to initialize data access service:', error);
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    // Auto-reload when new content is available
    // This is a common pattern for PWA updates to ensure users have the latest version
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});
