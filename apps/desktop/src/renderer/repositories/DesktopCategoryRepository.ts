/**
 * Desktop Category Repository
 *
 * Wraps Electron IPC calls to match the CategoryRepository interface
 * This allows Redux to work seamlessly with the desktop app
 */

import type {
  Category,
  CategoryRepository,
  GetCategoriesOptions,
  GetCategoriesResult,
} from '@monorepo/shared-data-access';

export class DesktopCategoryRepository implements CategoryRepository {
  /**
   * Get all categories via Electron IPC
   */
  async getCategories(options?: GetCategoriesOptions): Promise<GetCategoriesResult> {
    try {
      const { includeInactive = false } = options || {};

      // Check if electronAPI is available
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.category) {
        const errorMsg = 'Electron API not available. Make sure the preload script is loaded.';
        console.error('[DesktopCategoryRepository]', errorMsg);
        console.error('[DesktopCategoryRepository] window:', typeof window);
        console.error('[DesktopCategoryRepository] window.electronAPI:', typeof window?.electronAPI);
        console.error('[DesktopCategoryRepository] window.electronAPI.category:', typeof window?.electronAPI?.category);
        return {
          success: false,
          error: errorMsg,
          isOffline: true,
        };
      }

      console.log('[DesktopCategoryRepository] Calling electronAPI.category.getAll');
      const result = await window.electronAPI.category.getAll(includeInactive);

      console.log('[DesktopCategoryRepository] Result:', {
        success: result.success,
        categoryCount: result.categories?.length || 0,
        isOffline: result.isOffline,
      });

      return {
        success: result.success,
        categories: result.categories || [],
        error: result.error,
        isOffline: result.isOffline,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DesktopCategoryRepository] Error:', errorMsg);
      console.error('[DesktopCategoryRepository] Error stack:', error instanceof Error ? error.stack : 'N/A');
      return {
        success: false,
        error: errorMsg,
        isOffline: true,
      };
    }
  }

  /**
   * Get category by ID via Electron IPC
   */
  async getCategoryById(
    categoryId: string,
    options?: GetCategoriesOptions
  ): Promise<Category | null> {
    try {
      // Check if electronAPI is available
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.category) {
        console.error('[DesktopCategoryRepository] Electron API not available');
        return null;
      }

      console.log('[DesktopCategoryRepository] Calling electronAPI.category.getById:', categoryId);
      const result = await window.electronAPI.category.getById(categoryId);

      if (result.success && result.category) {
        return result.category;
      }

      console.warn('[DesktopCategoryRepository] Category not found:', categoryId);
      return null;
    } catch (error) {
      console.error('[DesktopCategoryRepository] Error fetching category:', error);
      console.error('[DesktopCategoryRepository] Error stack:', error instanceof Error ? error.stack : 'N/A');
      return null;
    }
  }
}

// Singleton instance
let repositoryInstance: DesktopCategoryRepository | null = null;

export function getDesktopCategoryRepository(): DesktopCategoryRepository {
  if (!repositoryInstance) {
    repositoryInstance = new DesktopCategoryRepository();
  }
  return repositoryInstance;
}
