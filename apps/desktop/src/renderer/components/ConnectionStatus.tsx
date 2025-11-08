import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Server, Database, Globe } from 'lucide-react';

interface ConnectionState {
  status: 'online' | 'offline' | 'checking' | 'unknown';
  dataSource: 'server' | 'local';
  serverUrl: string;
  lastChecked: Date | null;
  error?: string;
}

interface ManualOverride {
  enabled: boolean;
  dataSource: 'server' | 'local' | null;
}

// Other types (ConnectionState, ElectronAPI) are defined in electron.d.ts

/**
 * Wait for electronAPI to become available
 * @param maxWaitTime Maximum time to wait in milliseconds (default: 5000ms)
 * @returns Promise that resolves when API is available, or rejects if timeout
 */
async function waitForElectronAPI(maxWaitTime: number = 5000): Promise<void> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkAPI = () => {
      if (window.electronAPI && window.electronAPI.connection) {
        console.log('[ConnectionStatus] electronAPI is now available');
        resolve();
        return;
      }
      
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitTime) {
        reject(new Error('electronAPI did not become available within timeout'));
        return;
      }
      
      // Check again after a short delay
      setTimeout(checkAPI, 100);
    };
    
    checkAPI();
  });
}

export function ConnectionStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [manualOverride, setManualOverride] = useState<ManualOverride | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load initial state
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let interval: NodeJS.Timeout | undefined;
    
    // Wait for electronAPI to become available
    const initialize = async () => {
      try {
        console.log('[ConnectionStatus] Waiting for electronAPI...');
        await waitForElectronAPI(5000);
        console.log('[ConnectionStatus] electronAPI is available, loading state...');
        
        // Load initial state
        await loadState();
        
        // Force an initial connectivity check after a short delay
        const initialCheck = async () => {
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log('[ConnectionStatus] Performing initial connectivity check...');
          try {
            if (window.electronAPI && window.electronAPI.connection) {
              await window.electronAPI.connection.check();
              await new Promise(resolve => setTimeout(resolve, 500));
              await loadState();
            }
          } catch (error) {
            console.warn('[ConnectionStatus] Initial connectivity check failed:', error);
          }
        };
        initialCheck();
        
        // Listen for real-time state changes from main process
        if (window.electronAPI && window.electronAPI.connection) {
          const connectionAPI = window.electronAPI.connection as any;
          if (connectionAPI.onStateChange) {
            unsubscribe = connectionAPI.onStateChange((state: any) => {
              console.log('[ConnectionStatus] Received state change event:', state);
              const connectionState: ConnectionState = {
                status: String(state.status).toLowerCase() as 'online' | 'offline' | 'checking' | 'unknown',
                dataSource: String(state.dataSource).toLowerCase() as 'server' | 'local',
                serverUrl: state.serverUrl,
                lastChecked: state.lastChecked ? new Date(state.lastChecked) : null,
                error: state.error,
              };
              setConnectionState(connectionState);
            });
          }
        }
        
        // Use more frequent polling initially to catch state changes quickly
        interval = setInterval(() => {
          if (window.electronAPI && window.electronAPI.connection) {
            loadState();
          }
        }, 2000);
      } catch (error) {
        console.error('[ConnectionStatus] electronAPI not available after timeout:', error);
        // Set a default state instead of error
        setConnectionState({
          status: 'unknown',
          dataSource: 'local',
          serverUrl: 'http://localhost:4000',
          lastChecked: null,
          error: 'Connection API not available. Please restart the application.',
        });
        setIsLoading(false);
      }
    };
    
    initialize();
    
    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadState = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if electronAPI is available
      if (!window.electronAPI || !window.electronAPI.connection) {
        console.warn('[ConnectionStatus] electronAPI.connection not available in loadState');
        return;
      }
      
      const [state, override] = await Promise.all([
        window.electronAPI.connection.getState(),
        window.electronAPI.connection.getManualOverride(),
      ]);
      
      console.log('[ConnectionStatus] Received state from IPC:', state);
      console.log('[ConnectionStatus] State status:', state.status, 'Type:', typeof state.status);
      console.log('[ConnectionStatus] State dataSource:', state.dataSource, 'Type:', typeof state.dataSource);
      
      // Convert lastChecked from ISO string back to Date
      const connectionState: ConnectionState = {
        status: String(state.status).toLowerCase() as 'online' | 'offline' | 'checking' | 'unknown',
        dataSource: String(state.dataSource).toLowerCase() as 'server' | 'local',
        serverUrl: state.serverUrl,
        lastChecked: state.lastChecked ? new Date(state.lastChecked) : null,
        error: state.error,
      };
      
      console.log('[ConnectionStatus] Processed connection state:', connectionState);
      console.log('[ConnectionStatus] Is connected?', connectionState.status === 'online');
      
      setConnectionState(connectionState);
      setManualOverride(override);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('[ConnectionStatus] Failed to load connection state:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load connection state';
      
      // Always set a connection state, even on error - never leave it null
      // This ensures we always show an icon instead of "Error" text
      const fallbackState: ConnectionState = {
        status: 'unknown',
        dataSource: connectionState?.dataSource || 'local',
        serverUrl: connectionState?.serverUrl || 'http://localhost:4000',
        lastChecked: connectionState?.lastChecked || null,
        error: errorMessage,
      };
      
      setConnectionState(fallbackState);
      console.warn('[ConnectionStatus] Using fallback state due to error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSwitch = async (source: 'server' | 'local' | null) => {
    try {
      setIsChecking(true);
      console.log(`[ConnectionStatus] ===== Starting manual switch to: ${source} =====`);
      
      // Wait for electronAPI to become available
      try {
        console.log('[ConnectionStatus] Waiting for electronAPI...');
        await waitForElectronAPI(3000);
        console.log('[ConnectionStatus] electronAPI is available');
      } catch (error) {
        const errorMsg = 'Connection API not available. Please restart the application.';
        console.error('[ConnectionStatus] electronAPI.connection is not available:', error);
        throw new Error(errorMsg);
      }
      
      // Always check connectivity first to get latest status
      console.log('[ConnectionStatus] Step 1: Checking connectivity...');
      try {
        const checkResult = await window.electronAPI.connection.check();
        console.log('[ConnectionStatus] Connectivity check result:', checkResult);
        // Wait for state to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (checkError) {
        console.warn('[ConnectionStatus] Connectivity check failed:', checkError);
        // Continue anyway - the check might have still updated the state
      }
      
      // Reload state after connectivity check
      await loadState();
      
      // Set the manual data source
      console.log(`[ConnectionStatus] Step 2: Setting manual data source to: ${source}`);
      let resultState: any = null;
      try {
        const result = await window.electronAPI.connection.setManual(source) as { success: boolean; state?: any };
        console.log('[ConnectionStatus] setManual result:', result);
        // Use the returned state if available
        if (result && result.state) {
          // Convert the state to match ConnectionState format
          resultState = {
            ...result.state,
            lastChecked: result.state.lastChecked ? new Date(result.state.lastChecked) : null,
          };
          console.log('[ConnectionStatus] Using state from setManual response:', resultState);
        }
      } catch (setError) {
        console.error('[ConnectionStatus] setManual failed:', setError);
        throw setError;
      }
      
      // Wait for state to update after switch
      console.log('[ConnectionStatus] Step 3: Waiting for state update...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use the returned state or fetch fresh state
      let finalState: any;
      if (resultState) {
        finalState = resultState;
        console.log('[ConnectionStatus] Using returned state from setManual');
      } else {
        // Reload state multiple times to ensure it's updated
        console.log('[ConnectionStatus] Step 4: Reloading state...');
        for (let i = 0; i < 2; i++) {
          await loadState();
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Final state check - get fresh state directly
        console.log('[ConnectionStatus] Step 5: Getting final state...');
        if (!window.electronAPI || !window.electronAPI.connection) {
          throw new Error('Connection API not available');
        }
        finalState = await window.electronAPI.connection.getState();
        console.log('[ConnectionStatus] Final state from IPC:', finalState);
      }
      
      const updatedState: ConnectionState = {
        status: String(finalState.status).toLowerCase() as 'online' | 'offline' | 'checking' | 'unknown',
        dataSource: String(finalState.dataSource).toLowerCase() as 'server' | 'local',
        serverUrl: finalState.serverUrl,
        lastChecked: finalState.lastChecked ? new Date(finalState.lastChecked) : null,
        error: finalState.error,
      };
      
      console.log('[ConnectionStatus] Setting final state:', updatedState);
      setConnectionState(updatedState);
      
      // Also reload manual override
      if (window.electronAPI && window.electronAPI.connection) {
        const override = await window.electronAPI.connection.getManualOverride();
        setManualOverride(override);
      }
      
      setShowMenu(false);
      console.log('[ConnectionStatus] ===== Switch complete =====');
    } catch (error) {
      console.error('[ConnectionStatus] Failed to switch connection:', error);
      console.error('[ConnectionStatus] Error details:', error instanceof Error ? error.stack : error);
      
      // Provide helpful error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('Cannot read properties of undefined')) {
          errorMessage = 'Connection API not available. The application may need to be restarted.';
        }
      }
      
      // Still reload state to show current status (if API is available)
      if (window.electronAPI && window.electronAPI.connection) {
        try {
          await loadState();
        } catch (loadError) {
          console.error('[ConnectionStatus] Failed to reload state after error:', loadError);
        }
      }
      
      alert(`Failed to switch connection: ${errorMessage}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsChecking(true);
      
      // Check if electronAPI is available
      if (!window.electronAPI || !window.electronAPI.connection) {
        throw new Error('Connection API not available. Please refresh the application.');
      }
      
      await window.electronAPI.connection.check();
      // Wait a bit for the state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadState();
    } catch (error) {
      console.error('Failed to refresh connection:', error);
      alert(`Failed to refresh connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading state only on initial load
  if (isLoading && !connectionState) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Always show a state - never show "Error" text
  // If we don't have connectionState, create a default one
  const state = connectionState || {
    status: 'unknown' as const,
    dataSource: 'local' as const,
    serverUrl: 'http://localhost:4000',
    lastChecked: null,
    error: 'Initializing...',
  };

  // Normalize status to lowercase for comparison
  const normalizedStatus = String(state.status).toLowerCase();
  const normalizedDataSource = String(state.dataSource).toLowerCase();
  // Treat 'unknown' as offline for display purposes
  const isConnected = normalizedStatus === 'online';
  const isUsingServer = normalizedDataSource === 'server';
  // Color scheme: Green only when server is online and connected, Yellow for local or offline server
  const iconColor = (isUsingServer && isConnected) ? '#10b981' : '#f59e0b'; // green-500 for online server, amber-500 (yellow) for local or offline
  
  console.log('[ConnectionStatus] Rendering with state:', {
    status: state.status,
    isConnected,
    dataSource: state.dataSource,
    isUsingServer,
    iconColor,
  });

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-white/10"
        title={`${isConnected ? 'Connected' : normalizedStatus === 'unknown' ? 'Unknown' : 'Disconnected'} - Using ${(isUsingServer && isConnected) ? 'Server' : 'Local DB'}${state.error ? ` (${state.error})` : ''}`}
        style={{ 
          backgroundColor: showMenu ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
        }}
      >
        {isUsingServer && isConnected ? (
          <Wifi className="w-4 h-4" style={{ color: iconColor }} />
        ) : (
          <Globe className="w-4 h-4" style={{ color: iconColor }} />
        )}
        {/* <span className="text-xs font-medium" style={{ color: iconColor }}>
          {isUsingServer ? 'Server' : 'Local'}
        </span> */}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Connection Status</span>
              <button
                onClick={handleRefresh}
                disabled={isChecking}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                title="Refresh connection"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: iconColor }}
                />
                <span>Status: {state.status}</span>
              </div>
              <div className="flex items-center gap-2">
                {isUsingServer ? (
                  <Server className="w-4 h-4" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>Using: {isUsingServer ? 'Server' : 'Local Database'}</span>
              </div>
              {state.lastChecked && (
                <div className="text-xs text-gray-500">
                  Last checked: {new Date(state.lastChecked).toLocaleTimeString()}
                </div>
              )}
              {manualOverride?.enabled && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Manual override active
                </div>
              )}
            </div>
          </div>

          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1 mb-1">
              Manual Control
            </div>
            <button
              onClick={() => handleManualSwitch('server')}
              disabled={isChecking}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Server className="w-4 h-4" />
              <span>Connect to Server</span>
              {isUsingServer && isConnected && (
                <span className="ml-auto text-xs text-green-600">✓</span>
              )}
            </button>
            <button
              onClick={() => handleManualSwitch('local')}
              disabled={isChecking}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              <span>Use Local Database</span>
              {(!isUsingServer || !isConnected) && (
                <span className="ml-auto text-xs text-green-600">✓</span>
              )}
            </button>
            {manualOverride?.enabled && (
              <button
                onClick={() => handleManualSwitch(null)}
                disabled={isChecking}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-blue-600 dark:text-blue-400 mt-2"
              >
                Enable Auto-Switch
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

