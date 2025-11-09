/**
 * Base Repository
 * Provides common data access patterns for both server and local data sources
 */

import { DataSource, LocalDbClient, HttpApiClient } from '@monorepo/shared-data-access';
import { dataAccessService } from '../data-access.service';

export abstract class BaseRepository {
  protected getDataClient(): { source: DataSource; db?: LocalDbClient; api?: HttpApiClient } {
    return dataAccessService.getCurrentDataClient();
  }

  protected getDb(): LocalDbClient {
    return dataAccessService.getLocalDb();
  }

  protected getApi(): HttpApiClient {
    return dataAccessService.getApiClient();
  }

  protected isOnline(): boolean {
    const { source } = this.getDataClient();
    return source === DataSource.SERVER;
  }

  /**
   * Sanitize data for IndexedDB storage
   * Converts Dates to ISO strings, removes undefined values, etc.
   */
  protected sanitizeForDb<T>(data: T): T {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        continue; // Skip undefined values
      }

      if (value === null) {
        sanitized[key] = null;
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeForDb(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Generate a unique ID (UUID v4)
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Get current timestamp as ISO string
   */
  protected now(): string {
    return new Date().toISOString();
  }

  /**
   * Add sync metadata to a record
   */
  protected addSyncMetadata<T extends Record<string, any>>(data: T): T & {
    sync_status: string;
    last_synced_at: string | null;
    is_deleted: number;
  } {
    return {
      ...data,
      sync_status: 'pending',
      last_synced_at: null,
      is_deleted: 0,
    };
  }
}
