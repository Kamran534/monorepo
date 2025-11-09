/**
 * Shared Data Access Library
 *
 * Provides offline-first data access layer for desktop, web, and mobile apps.
 * Automatically switches between server and local database based on connectivity.
 */

// Types
export * from './lib/types';
export {
  ConnectionStatus,
  DataSource,
  type ConnectionState,
  type ConnectivityConfig,
  type ConnectivityCheckResult,
  type ConnectionChangeCallback,
  type LocalDbClient,
  type RemoteApiClient,
  type DataSourceManager as IDataSourceManager,
} from './lib/types';

// Connection & Switching Integration
// Located in: lib/integration/
// Provides: ConnectivityChecker, DataSourceManager
// Handles: Server connectivity checking and automatic switching between server/local
export * from './lib/integration';
export {
  ConnectivityChecker,
  getConnectivityChecker,
  resetConnectivityChecker,
} from './lib/integration/connectivity-checker';

export {
  DataSourceManager,
  getDataSourceManager,
  resetDataSourceManager,
} from './lib/integration/data-source-manager';

// Local Database Clients
export {
  DesktopSqliteClient,
  WebIndexedDbClient,
  MobileSqliteClient,
  createLocalDbClient,
  type IndexedDBSchema,
} from './lib/local-db-client';

// IndexedDB Schema
export {
  CPOS_INDEXEDDB_SCHEMA,
  CPOS_DB_VERSION,
  CPOS_DB_NAME,
} from './lib/indexeddb-schema';

// Remote API Client
export {
  HttpApiClient,
  getApiClient,
  resetApiClient,
  type ApiClientConfig,
} from './lib/remote-api-client';

// Sync Module
export * from './lib/sync';

// Repositories
export * from './lib/repos';