/**
 * Category Repository for Web App
 * Handles category data with online/offline support
 * Implements the CategoryRepository interface expected by Redux store
 */

import {
  CategoryRepository as SharedCategoryRepository,
  type Category,
  type GetCategoriesOptions,
  type GetCategoriesResult,
} from '@monorepo/shared-data-access';
import { BaseRepository } from './base-repository';
import { dataAccessService } from '../data-access.service';

export type { Category, GetCategoriesOptions, GetCategoriesResult } from '@monorepo/shared-data-access';

export class WebCategoryRepository extends BaseRepository implements SharedCategoryRepository {
  private sharedCategoryRepo: SharedCategoryRepository | null = null;

  /**
   * Get or create the shared category repository
   * Lazy initialization ensures dataAccessService is ready
   */
  private async getSharedCategoryRepo(): Promise<SharedCategoryRepository> {
    if (!this.sharedCategoryRepo) {
      // Wait for data access service to be initialized
      let retries = 0;
      const maxRetries = 50; // Wait up to 5 seconds (50 * 100ms)
      
      while (retries < maxRetries) {
        try {
          // Try to access the service - if it throws, it's not ready
          dataAccessService.getLocalDb();
          dataAccessService.getApiClient();
          break; // Service is ready
        } catch {
          // Service not ready yet, wait a bit
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
      }

      if (retries >= maxRetries) {
        throw new Error('Data access service not initialized. Please wait for app initialization.');
      }

      try {
        this.sharedCategoryRepo = new SharedCategoryRepository(
          dataAccessService.getLocalDb(),
          dataAccessService.getApiClient()
        );
      } catch (error) {
        console.error('[WebCategoryRepository] Failed to initialize shared repository:', error);
        throw new Error('Data access service not initialized. Please wait for app initialization.');
      }
    }
    return this.sharedCategoryRepo;
  }

  /**
   * Get all categories with online/offline support
   * Returns GetCategoriesResult to match Redux store interface
   */
  async getCategories(options?: GetCategoriesOptions): Promise<GetCategoriesResult> {
    try {
      const sharedRepo = await this.getSharedCategoryRepo();
      const isOnline = this.isOnline();

      // Use the shared repository which returns GetCategoriesResult
      const result = await sharedRepo.getCategories({
        includeInactive: options?.includeInactive || false,
        useServer: isOnline ? true : false,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch categories';
      console.error('[WebCategoryRepository] Get categories error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        isOffline: true,
      };
    }
  }

  /**
   * Get category by ID with online/offline support
   */
  async getCategoryById(categoryId: string): Promise<Category | null> {
    try {
      const sharedRepo = await this.getSharedCategoryRepo();
      const isOnline = this.isOnline();

      const category = await sharedRepo.getCategoryById(categoryId, {
        useServer: isOnline ? true : false,
      });

      return category;
    } catch (error) {
      console.error('[WebCategoryRepository] Get category by ID error:', error);
      return null;
    }
  }

  /**
   * Get parent categories (categories with no parent)
   */
  async getParentCategories(options?: GetCategoriesOptions): Promise<Category[]> {
    const result = await this.getCategories(options);
    if (result.success && result.categories) {
      return result.categories.filter(cat => cat.parentCategoryId === null);
    }
    return [];
  }

  /**
   * Get child categories for a parent category
   */
  async getChildCategories(parentCategoryId: string, options?: GetCategoriesOptions): Promise<Category[]> {
    const result = await this.getCategories(options);
    if (result.success && result.categories) {
      return result.categories.filter(cat => cat.parentCategoryId === parentCategoryId);
    }
    return [];
  }
}


