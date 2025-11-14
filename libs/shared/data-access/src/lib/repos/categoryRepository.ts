/**
 * Category Repository
 * 
 * Handles category data access
 * Supports both online (API) and offline (local database) data fetching
 */

import { LocalDbClient } from '../types';
import { HttpApiClient } from '../remote-api-client';

export interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  parentCategory?: {
    id: string;
    name: string;
  } | null;
  childCategories?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    image: string | null;
  }>;
  _count?: {
    products: number;
  };
}

export interface GetCategoriesOptions {
  /**
   * Whether to include inactive categories
   * Default: false
   */
  includeInactive?: boolean;
  
  /**
   * Whether to use server for fetching categories
   * If false, will use local database directly
   * If undefined, will check server availability automatically
   */
  useServer?: boolean;
}

export interface GetCategoriesResult {
  success: boolean;
  categories?: Category[];
  error?: string;
  isOffline?: boolean;
}

export class CategoryRepository {
  private localDb: LocalDbClient;
  private apiClient: HttpApiClient;

  constructor(localDb: LocalDbClient, apiClient: HttpApiClient) {
    this.localDb = localDb;
    this.apiClient = apiClient;
  }

  /**
   * Get all categories
   * 
   * Behavior:
   * - If useServer is false, directly uses offline mode
   * - If useServer is true, tries online first, falls back to offline on failure
   * - If useServer is undefined, checks server availability automatically
   */
  async getCategories(options?: GetCategoriesOptions): Promise<GetCategoriesResult> {
    const { includeInactive = false, useServer } = options || {};

    // If explicitly disabled, use offline mode directly
    if (useServer === false) {
      console.log('[CategoryRepository] Server disabled, using offline mode');
      return await this.getCategoriesOffline(includeInactive);
    }

    // Check if server should be used
    let shouldUseServer = useServer === true;
    
    if (useServer === undefined) {
      // Auto-detect: Try server first, then fallback to offline
      console.log('[CategoryRepository] Auto-mode: Will try server first, then fallback to offline');
      shouldUseServer = true; // Always try server first in auto mode
    } else {
      console.log('[CategoryRepository] Server usage explicitly set:', useServer);
      shouldUseServer = useServer;
    }

    // Try online mode if server should be used
    if (shouldUseServer) {
      console.log('[CategoryRepository] Attempting online mode...');
      try {
        const result = await this.getCategoriesOnline(includeInactive);
        if (result.success && result.categories) {
          console.log('[CategoryRepository] Online mode successful, syncing to local DB...');
          
          // Sync categories to local database for offline access
          try {
            await this.syncCategoriesToLocal(result.categories);
            console.log('[CategoryRepository] ✓ Categories synced to local DB');
          } catch (syncError) {
            const errorMsg = syncError instanceof Error ? syncError.message : String(syncError);
            console.warn('[CategoryRepository] ⚠️ Failed to sync categories to local DB (non-fatal):', errorMsg);
            // Don't fail the request if sync fails
          }
          
          return result;
        } else {
          console.warn('[CategoryRepository] Online mode returned unsuccessful result');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn('[CategoryRepository] Online mode failed, trying offline:', errorMsg);
        // Continue to offline mode below
      }
    } else {
      console.log('[CategoryRepository] Skipping online mode (server explicitly disabled)');
    }

    // Fall back to offline mode
    return await this.getCategoriesOffline(includeInactive);
  }

  /**
   * Get categories from server API
   */
  private async getCategoriesOnline(includeInactive: boolean): Promise<GetCategoriesResult> {
    try {
      console.log('[CategoryRepository] Calling /api/categories');
      const response = await this.apiClient.get<{
        success: boolean;
        data: Category[];
        count: number;
      }>(`/api/categories?includeInactive=${includeInactive}`);
      
      console.log('[CategoryRepository] API response:', {
        success: response.success,
        hasData: !!response.data,
        count: response.count || 0,
      });

      if (response.success && response.data) {
        return {
          success: true,
          categories: response.data,
          isOffline: false,
        };
      }

      console.warn('[CategoryRepository] Invalid response structure:', response);
      return {
        success: false,
        error: 'Invalid response from server',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[CategoryRepository] Online fetch exception:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get categories from local database
   */
  private async getCategoriesOffline(includeInactive: boolean): Promise<GetCategoriesResult> {
    try {
      console.log('[CategoryRepository] ========== OFFLINE MODE ==========');
      console.log('[CategoryRepository] Include inactive:', includeInactive);
      console.log('[CategoryRepository] Database type:', this.localDb.constructor.name);
      
      // Query categories from local database
      // For IndexedDB, we need to get all and filter in-memory
      // SQLite can handle WHERE clauses natively
      const isIndexedDB = this.localDb.constructor.name === 'WebIndexedDbClient';
      
      let categories: Category[];
      
      if (isIndexedDB) {
        // For IndexedDB: Get all categories and filter in JavaScript
        console.log('[CategoryRepository] Using IndexedDB - fetching all categories');
        categories = await this.localDb.query<Category>('SELECT * FROM Category');
        
        console.log('[CategoryRepository] Fetched from IndexedDB:', categories.length);
        
        // Filter by isActive if needed
        if (!includeInactive) {
          categories = categories.filter(cat => cat.isActive === true || cat.isActive === 1);
          console.log('[CategoryRepository] After filtering active:', categories.length);
        }
        
        // Sort manually
        categories.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return a.name.localeCompare(b.name);
        });
      } else {
        // For SQLite: Use WHERE clause
        const whereClause = includeInactive ? '' : 'WHERE isActive = 1';
        categories = await this.localDb.query<Category>(
          `SELECT * FROM Category ${whereClause} ORDER BY sortOrder ASC, name ASC`
        );
      }

      console.log('[CategoryRepository] Final query result:', {
        categoryCount: categories.length,
        firstCategory: categories[0]?.name,
      });

      // Build hierarchy: parent-child relationships
      const categoriesWithHierarchy = await this.buildCategoryHierarchy(categories);

      return {
        success: true,
        categories: categoriesWithHierarchy,
        isOffline: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[CategoryRepository] ✗ Offline fetch failed:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        isOffline: true,
      };
    }
  }

  /**
   * Build category hierarchy from flat list
   * Adds parentCategory and childCategories relationships
   */
  private async buildCategoryHierarchy(categories: Category[]): Promise<Category[]> {
    try {
      // Create a map for quick lookup
      const categoryMap = new Map<string, Category>();
      categories.forEach(cat => categoryMap.set(cat.id, { ...cat, childCategories: [] }));

      // Build hierarchy
      const result: Category[] = [];
      
      for (const category of categoryMap.values()) {
        // Get parent category if exists
        if (category.parentCategoryId) {
          const parentCat = categoryMap.get(category.parentCategoryId);
          if (parentCat) {
            category.parentCategory = {
              id: parentCat.id,
              name: parentCat.name,
            };
            // Add this category to parent's children
            if (!parentCat.childCategories) {
              parentCat.childCategories = [];
            }
            parentCat.childCategories.push({
              id: category.id,
              name: category.name,
              isActive: category.isActive,
              image: category.image,
            });
          }
        }

        // Get product count for this category
        try {
          const countResult = await this.localDb.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM products WHERE category_id = ?`,
            [category.id]
          );
          category._count = {
            products: countResult.length > 0 ? countResult[0].count : 0,
          };
        } catch (countError) {
          console.warn('[CategoryRepository] Failed to get product count for category:', category.id);
          category._count = { products: 0 };
        }

        result.push(category);
      }

      return result;
    } catch (error) {
      console.error('[CategoryRepository] Error building hierarchy:', error);
      // Return flat list if hierarchy building fails
      return categories;
    }
  }

  /**
   * Sync categories from server to local database
   */
  private async syncCategoriesToLocal(categories: Category[]): Promise<void> {
    try {
      console.log('[CategoryRepository] Syncing', categories.length, 'categories to local DB');
      
      // Check if we're using IndexedDB (web app)
      const isIndexedDB = this.localDb.constructor.name === 'WebIndexedDbClient';
      
      for (const category of categories) {
        await this.saveCategoryToLocal(category, isIndexedDB);
      }
      
      console.log('[CategoryRepository] ✓ Synced', categories.length, 'categories successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[CategoryRepository] ✗ Failed to sync categories:', errorMsg);
      throw error;
    }
  }

  /**
   * Save a single category to local database
   */
  private async saveCategoryToLocal(category: Category, isIndexedDB: boolean): Promise<void> {
    try {
      // Convert Date objects to ISO strings
      const formatDate = (date: string | Date | undefined): string => {
        if (!date) return new Date().toISOString();
        if (date instanceof Date) return date.toISOString();
        return date;
      };

      const createdAt = formatDate(category.createdAt);
      const updatedAt = formatDate(category.updatedAt);

      if (isIndexedDB) {
        // For IndexedDB, use object format
        const categoryObject = {
          id: category.id,
          name: category.name,
          parentCategoryId: category.parentCategoryId || null,
          description: category.description || null,
          image: category.image || null,
          sortOrder: category.sortOrder,
          isActive: category.isActive ? 1 : 0,
          createdAt: createdAt,
          updatedAt: updatedAt,
        };
        
        // Use upsert (put) for IndexedDB
        await this.localDb.execute('Category:put', [categoryObject]);
      } else {
        // SQLite format - check if exists first
        const existing = await this.localDb.query<{ id: string }>(
          `SELECT id FROM Category WHERE id = ? LIMIT 1`,
          [category.id]
        );

        if (existing.length > 0) {
          // Update existing
          await this.localDb.execute(
            `UPDATE Category SET 
              name = ?, 
              parentCategoryId = ?, 
              description = ?, 
              image = ?, 
              sortOrder = ?,
              isActive = ?,
              updatedAt = ?
            WHERE id = ?`,
            [
              category.name,
              category.parentCategoryId || null,
              category.description || null,
              category.image || null,
              category.sortOrder,
              category.isActive ? 1 : 0,
              updatedAt,
              category.id,
            ]
          );
        } else {
          // Insert new
          await this.localDb.execute(
            `INSERT INTO Category (
              id, name, parentCategoryId, description, image, sortOrder, 
              isActive, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              category.id,
              category.name,
              category.parentCategoryId || null,
              category.description || null,
              category.image || null,
              category.sortOrder,
              category.isActive ? 1 : 0,
              createdAt,
              updatedAt,
            ]
          );
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[CategoryRepository] ✗ Failed to save category:', category.id, errorMsg);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string, options?: GetCategoriesOptions): Promise<Category | null> {
    const { useServer } = options || {};

    // Try online first if server is available
    if (useServer !== false) {
      try {
        const response = await this.apiClient.get<{
          success: boolean;
          data: Category;
        }>(`/api/categories/${categoryId}`);

        if (response.success && response.data) {
          // Sync to local DB
          try {
            const isIndexedDB = this.localDb.constructor.name === 'WebIndexedDbClient';
            await this.saveCategoryToLocal(response.data, isIndexedDB);
          } catch (syncError) {
            console.warn('[CategoryRepository] Failed to sync category to local DB:', syncError);
          }
          return response.data;
        }
      } catch (error) {
        console.warn('[CategoryRepository] Failed to fetch category from server, trying local:', error);
      }
    }

    // Fall back to local database
    try {
      const categories = await this.localDb.query<Category>(
        `SELECT * FROM Category WHERE id = ? LIMIT 1`,
        [categoryId]
      );

      if (categories.length === 0) {
        return null;
      }

      const category = categories[0];

      // Get parent category if exists
      if (category.parentCategoryId) {
        const parents = await this.localDb.query<{ id: string; name: string }>(
          `SELECT id, name FROM Category WHERE id = ? LIMIT 1`,
          [category.parentCategoryId]
        );
        if (parents.length > 0) {
          category.parentCategory = parents[0];
        }
      }

      // Get child categories
      const children = await this.localDb.query<{ id: string; name: string; isActive: boolean }>(
        `SELECT id, name, isActive FROM Category WHERE parentCategoryId = ?`,
        [category.id]
      );
      category.childCategories = children;

      // Get product count
      try {
        const countResult = await this.localDb.query<{ count: number }>(
          `SELECT COUNT(*) as count FROM products WHERE category_id = ?`,
          [category.id]
        );
        category._count = {
          products: countResult.length > 0 ? countResult[0].count : 0,
        };
      } catch (countError) {
        category._count = { products: 0 };
      }

      return category;
    } catch (error) {
      console.error('[CategoryRepository] Failed to get category from local DB:', error);
      return null;
    }
  }
}

