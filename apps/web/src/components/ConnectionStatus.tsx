import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wifi, RefreshCw, Server, Database, Globe } from 'lucide-react';
import { dataAccessService } from '../services/data-access.service';
import { ConnectionStatus as ConnectionStatusEnum, DataSource } from '@monorepo/shared-data-access';
import type { ConnectionState } from '@monorepo/shared-data-access';

interface ManualOverride {
  enabled: boolean;
  dataSource: DataSource | null;
}

export function ConnectionStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [manualOverride, setManualOverride] = useState<ManualOverride | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadState = useCallback(async () => {
    try {
      setIsLoading(true);

      if (!dataAccessService) {
        console.warn('[ConnectionStatus] Data access service not available in loadState');
        return;
      }

      const [state, override] = await Promise.all([
        Promise.resolve(dataAccessService.getConnectionState()),
        Promise.resolve(dataAccessService.getManualOverride()),
      ]);

      console.log('[ConnectionStatus] Received state:', state);
      console.log('[ConnectionStatus] State status:', state.status);
      console.log('[ConnectionStatus] State dataSource:', state.dataSource);

      setConnectionState(state);
      setManualOverride({
        enabled: override.enabled,
        dataSource: override.dataSource,
      });
    } catch (error) {
      console.error('[ConnectionStatus] Failed to load connection state:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load connection state';

      // Always set a connection state, even on error - never leave it null
      const fallbackState: ConnectionState = {
        status: ConnectionStatusEnum.UNKNOWN,
        dataSource: DataSource.LOCAL,
        serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:4000',
        lastChecked: null,
        error: errorMessage,
      };

      setConnectionState(fallbackState);
      console.warn('[ConnectionStatus] Using fallback state due to error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial state
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let interval: NodeJS.Timeout | undefined;

    const initialize = async () => {
      try {
        console.log('[ConnectionStatus] Initializing...');

        // Ensure data access service is initialized
        if (!dataAccessService) {
          throw new Error('Data access service not available');
        }

        // Load initial state
        await loadState();

        // Force an initial connectivity check after a short delay
        const initialCheck = async () => {
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log('[ConnectionStatus] Performing initial connectivity check...');
          try {
            await dataAccessService.checkConnectivity();
            await new Promise(resolve => setTimeout(resolve, 500));
            await loadState();
          } catch (error) {
            console.warn('[ConnectionStatus] Initial connectivity check failed:', error);
          }
        };
        initialCheck();

        // Listen for real-time state changes
        unsubscribe = dataAccessService.onConnectionChange((state: ConnectionState) => {
          console.log('[ConnectionStatus] Received state change event:', state);
          setConnectionState(state);
        });

        // Use more frequent polling initially to catch state changes quickly
        interval = setInterval(() => {
          loadState();
        }, 2000);
      } catch (error) {
        console.error('[ConnectionStatus] Initialization failed:', error);
        // Set a default state instead of error
        setConnectionState({
          status: ConnectionStatusEnum.UNKNOWN,
          dataSource: DataSource.LOCAL,
          serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:4000',
          lastChecked: null,
          error: 'Connection service not available. Please refresh the page.',
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
  }, [loadState]);

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

  const handleManualSwitch = async (source: 'server' | 'local' | null) => {
    try {
      setIsChecking(true);
      console.log(`[ConnectionStatus] ===== Starting manual switch to: ${source} =====`);

      if (!dataAccessService) {
        throw new Error('Data access service not available. Please refresh the page.');
      }

      // Always check connectivity first to get latest status
      console.log('[ConnectionStatus] Step 1: Checking connectivity...');
      try {
        await dataAccessService.checkConnectivity();
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
      const dataSource = source === 'server' ? DataSource.SERVER : source === 'local' ? DataSource.LOCAL : null;
      await dataAccessService.setManualDataSource(dataSource);

      // Wait for state to update after switch
      console.log('[ConnectionStatus] Step 3: Waiting for state update...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload state multiple times to ensure it's updated
      console.log('[ConnectionStatus] Step 4: Reloading state...');
      for (let i = 0; i < 2; i++) {
        await loadState();
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Final state check
      console.log('[ConnectionStatus] Step 5: Getting final state...');
      const finalState = dataAccessService.getConnectionState();
      console.log('[ConnectionStatus] Final state:', finalState);

      setConnectionState(finalState);

      // Also reload manual override
      const override = dataAccessService.getManualOverride();
      setManualOverride({
        enabled: override.enabled,
        dataSource: override.dataSource,
      });

      setShowMenu(false);
      console.log('[ConnectionStatus] ===== Switch complete =====');
    } catch (error) {
      console.error('[ConnectionStatus] Failed to switch connection:', error);
      console.error('[ConnectionStatus] Error details:', error instanceof Error ? error.stack : error);

      // Provide helpful error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Still reload state to show current status
      if (dataAccessService) {
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

      if (!dataAccessService) {
        throw new Error('Data access service not available. Please refresh the page.');
      }

      await dataAccessService.checkConnectivity();
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
    status: ConnectionStatusEnum.UNKNOWN,
    dataSource: DataSource.LOCAL,
    serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:4000',
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
      </button>

      {showMenu && (
        <div 
          className="absolute right-0 top-full mt-3 w-80 rounded-md z-50"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            boxShadow: 'var(--shadow-xl), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <div 
            className="px-3 py-2 border-b"
            style={{ borderColor: 'var(--color-border-light)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span 
                className="text-xs font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Connection Status
              </span>
              <button
                onClick={handleRefresh}
                disabled={isChecking}
                className="p-0.5 rounded transition-colors disabled:opacity-50"
                style={{ 
                  color: 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Refresh connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-primary)' }}>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: iconColor }}
                />
                <span>{state.status}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isUsingServer ? (
                  <Server className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
                ) : (
                  <Database className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
                )}
                <span>{isUsingServer ? 'Server' : 'Local'}</span>
              </div>
              {state.lastChecked && (
                <div className="text-xs ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>
                  {new Date(state.lastChecked).toLocaleTimeString()}
                </div>
              )}
            </div>
            {manualOverride?.enabled && (
              <div className="text-xs mt-1" style={{ color: 'var(--color-warning)' }}>
                Manual override active
              </div>
            )}
          </div>

          <div className="px-2 py-1.5">
            <button
              onClick={() => handleManualSwitch('server')}
              disabled={isChecking}
              className="w-full text-left px-2 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs"
              style={{ color: 'var(--color-text-primary)' }}
              onMouseEnter={(e) => {
                if (!isChecking) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Server className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
              <span>Connect to Server</span>
              {isUsingServer && isConnected && (
                <span className="ml-auto text-xs" style={{ color: 'var(--color-success)' }}>✓</span>
              )}
            </button>
            <button
              onClick={() => handleManualSwitch('local')}
              disabled={isChecking}
              className="w-full text-left px-2 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs"
              style={{ color: 'var(--color-text-primary)' }}
              onMouseEnter={(e) => {
                if (!isChecking) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Database className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
              <span>Use Local Database</span>
              {(!isUsingServer || !isConnected) && (
                <span className="ml-auto text-xs" style={{ color: 'var(--color-success)' }}>✓</span>
              )}
            </button>
            {manualOverride?.enabled && (
              <button
                onClick={() => handleManualSwitch(null)}
                disabled={isChecking}
                className="w-full text-left px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs mt-1"
                style={{ color: 'var(--color-info)' }}
                onMouseEnter={(e) => {
                  if (!isChecking) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
