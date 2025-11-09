/**
 * Connection & Switching Integration Module
 * 
 * Provides connectivity checking and data source switching functionality
 * for seamless online/offline operation.
 */

export * from './connectivity-checker';
export * from './data-source-manager';

export {
  ConnectivityChecker,
  getConnectivityChecker,
  resetConnectivityChecker,
} from './connectivity-checker';

export {
  DataSourceManager,
  getDataSourceManager,
  resetDataSourceManager,
} from './data-source-manager';

