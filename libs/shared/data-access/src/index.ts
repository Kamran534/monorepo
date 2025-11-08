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

// Connectivity Checker
export {
  ConnectivityChecker,
  getConnectivityChecker,
  resetConnectivityChecker,
} from './lib/connectivity-checker';

// Data Source Manager
export {
  DataSourceManager,
  getDataSourceManager,
  resetDataSourceManager,
} from './lib/data-source-manager';

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
