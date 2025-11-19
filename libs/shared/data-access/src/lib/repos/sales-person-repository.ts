/**
 * Sales Person Repository
 *
 * Provides online/offline access to sales representative records.
 */

import { LocalDbClient } from '../local-db-client';
import { RemoteApiClient } from '../types';

export interface SalesPerson {
  id: string;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  commission?: number | null;
  isActive?: boolean;
}

export interface GetSalesPersonsOptions {
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  useServer?: boolean;
}

export interface GetSalesPersonsResult {
  success: boolean;
  salesPersons?: SalesPerson[];
  total?: number;
  hasMore?: boolean;
  error?: string;
  isOffline?: boolean;
}

export class SalesPersonRepository {
  constructor(
    private localDb: LocalDbClient,
    private apiClient: RemoteApiClient
  ) {}

  /**
   * Fetch sales persons with online-first strategy.
   */
  async getSalesPersons(options: GetSalesPersonsOptions = {}): Promise<GetSalesPersonsResult> {
    const {
      search,
      isActive = true,
      limit = 100,
      offset = 0,
      useServer = true,
    } = options;

    if (useServer) {
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (typeof isActive === 'boolean') params.append('isActive', String(isActive));
        if (limit !== undefined) params.append('limit', String(limit));
        if (offset !== undefined) params.append('offset', String(offset));

        const endpoint = params.toString()
          ? `/api/sales-persons?${params.toString()}`
          : '/api/sales-persons';

        const response = await this.apiClient.get(endpoint);

        if (response.success && response.data) {
          const people = Array.isArray(response.data)
            ? response.data
            : response.data.data || [];

          return {
            success: true,
            salesPersons: people.map(this.mapApiSalesPerson),
            total: response.meta?.total ?? people.length,
            hasMore: response.meta?.hasMore ?? false,
            isOffline: false,
          };
        }
      } catch (error) {
        console.warn('[SalesPersonRepository] Server fetch failed, falling back to local DB:', error);
      }
    }

    try {
      const whereClauses: string[] = [];
      const params: any[] = [];

      if (typeof isActive === 'boolean') {
        whereClauses.push('isActive = ?');
        params.push(isActive ? 1 : 0);
      }

      if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        whereClauses.push(
          '(LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(COALESCE(email, "")) LIKE ? OR LOWER(COALESCE(phone, "")) LIKE ?)'
        );
        params.push(term, term, term, term);
      }

      const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const query = `
        SELECT id, code, name, email, phone, commission, isActive
        FROM SalesPerson
        ${whereClause}
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const rows = await this.localDb.query<any>(query, params);

      return {
        success: true,
        salesPersons: rows.map(this.mapDbSalesPerson),
        total: rows.length + offset,
        hasMore: rows.length === limit,
        isOffline: true,
      };
    } catch (error: any) {
      console.error('[SalesPersonRepository] Error fetching from local DB:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch sales persons',
        isOffline: true,
      };
    }
  }

  private mapApiSalesPerson = (person: any): SalesPerson => ({
    id: person.id,
    code: person.code,
    name: person.name,
    email: person.email,
    phone: person.phone,
    commission: person.commission !== undefined && person.commission !== null
      ? Number(person.commission)
      : undefined,
    isActive: typeof person.isActive === 'boolean' ? person.isActive : true,
  });

  private mapDbSalesPerson = (row: any): SalesPerson => ({
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    commission: row.commission !== undefined && row.commission !== null
      ? Number(row.commission)
      : undefined,
    isActive: typeof row.isActive === 'number' ? row.isActive === 1 : !!row.isActive,
  });
}


