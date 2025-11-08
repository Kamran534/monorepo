import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

// Import shared UI styles first
import '@monorepo/shared-ui/styles/globals.css';
import '@monorepo/shared-ui/styles/components.css';

import App from './app/app';
import { registerSW } from 'virtual:pwa-register';
import { dataAccessService } from './services/data-access.service';

// Initialize data access service
dataAccessService.initialize().catch((error) => {
  console.error('[App] Failed to initialize data access service:', error);
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});
