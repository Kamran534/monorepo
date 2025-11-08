/**
 * Shared types for data access layer
 * Used across desktop, web, and mobile applications
 */

export enum ConnectionStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  CHECKING = 'checking',
  UNKNOWN = 'unknown',
}

export enum DataSource {
  SERVER = 'server',
  LOCAL = 'local',
}

export interface ConnectivityConfig {
  serverUrl: string;
  checkInterval?: number; // milliseconds
  timeout?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
}

export interface ConnectionState {
  status: ConnectionStatus;
  dataSource: DataSource;
  lastChecked: Date | null;
  serverUrl: string;
  error?: string;
}

export interface ConnectivityCheckResult {
  isOnline: boolean;
  latency?: number; // milliseconds
  error?: string;
  timestamp: Date;
}

export interface DataSourceManager {
  getConnectionState(): ConnectionState;
  checkConnectivity(): Promise<ConnectivityCheckResult>;
  switchDataSource(source: DataSource): void;
  onConnectionChange(callback: (state: ConnectionState) => void): () => void;
}

export interface BaseDataClient {
  isAvailable(): Promise<boolean>;
  initialize(): Promise<void>;
  close(): Promise<void>;
}

export interface LocalDbClient extends BaseDataClient {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  transaction<T>(callback: () => Promise<T>): Promise<T>;
}

export interface RemoteApiClient extends BaseDataClient {
  get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

export type ConnectionChangeCallback = (state: ConnectionState) => void;
