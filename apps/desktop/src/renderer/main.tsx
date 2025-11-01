import { createRoot } from 'react-dom/client';
import './styles.css';
import { NxWelcome } from './nx-welcome.tsx';
import { BarcodeScanner } from '@monorepo/shared-hooks-scanner';
import { useEffect, useState } from 'react';
import { getDatabase, DatabaseError } from '@monorepo/db';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1">
        <NxWelcome title="desktop" />
      </div>
      
      {/* Tailwind Verification Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">
            <span role="img" aria-label="sparkles">✨</span> Tailwind CSS is Working! (Desktop App)
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

      {/* Barcode Scanner Section */}
      <BarcodeScanner compact={true} />

      {/* SQLite (Electron) status & counter */}
      <DbStatus />
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

function DbStatus() {
  const db = getDatabase();
  const [connected, setConnected] = useState(false);
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeDatabase = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await db.connect();
        
        if (!isMounted) return;
        
        const counter = await db.getCounter();
        setConnected(true);
        setCount(counter);
      } catch (err) {
        if (!isMounted) return;
        
        const errorMessage = err instanceof DatabaseError 
          ? err.message 
          : err instanceof Error 
          ? err.message 
          : 'Failed to connect to database';
        
        setError(errorMessage);
        setConnected(false);
        console.error('[DbStatus] Connection error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleIncrement = async () => {
    if (isLoading || !connected) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const newCount = await db.increment();
      setCount(newCount);
    } catch (err) {
      const errorMessage = err instanceof DatabaseError 
        ? err.message 
        : err instanceof Error 
        ? err.message 
        : 'Failed to increment counter';
      
      setError(errorMessage);
      console.error('[DbStatus] Increment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecrement = async () => {
    if (isLoading || !connected) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const newCount = await db.decrement();
      setCount(newCount);
    } catch (err) {
      const errorMessage = err instanceof DatabaseError 
        ? err.message 
        : err instanceof Error 
        ? err.message 
        : 'Failed to decrement counter';
      
      setError(errorMessage);
      console.error('[DbStatus] Decrement error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t p-4 mt-6 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm text-gray-600">Database</div>
            <div className="font-semibold">
              {isLoading && !connected ? 'Connecting…' : 
               error ? 'Connection failed' : 
               connected ? 'SQLite connected successfully' : 
               'Not connected'}
            </div>
            {error && (
              <div className="text-sm text-red-600 mt-1" role="alert">
                {error}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors" 
              onClick={handleDecrement}
              disabled={isLoading || !connected}
              aria-label="Decrement counter"
            >
              -
            </button>
            <div className="min-w-10 text-center font-mono">{count}</div>
            <button 
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors" 
              onClick={handleIncrement}
              disabled={isLoading || !connected}
              aria-label="Increment counter"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
