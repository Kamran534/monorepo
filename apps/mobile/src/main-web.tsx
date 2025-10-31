import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import './styles.css';

import App from './app/App';

function MobileWebApp() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <App />
      </div>
      
      {/* Tailwind Verification Section */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-600 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">
            <span role="img" aria-label="sparkles">✨</span> Tailwind CSS is Working! (Mobile Web App)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">
                <span role="img" aria-label="art palette">🎨</span>
              </div>
              <h3 className="font-semibold mb-1">Colors</h3>
              <p className="text-sm opacity-90">Gradient backgrounds working</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">
                <span role="img" aria-label="mobile phone">📱</span>
              </div>
              <h3 className="font-semibold mb-1">Responsive</h3>
              <p className="text-sm opacity-90">Grid layout adapts</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">
                <span role="img" aria-label="lightning">⚡</span>
              </div>
              <h3 className="font-semibold mb-1">Utilities</h3>
              <p className="text-sm opacity-90">All classes active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <MobileWebApp />
  </StrictMode>
);
