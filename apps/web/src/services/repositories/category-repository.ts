/**
 * Category Repository
 * Handles category data access
 */

import { BaseRepository } from './base-repository';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithProducts extends Category {
  productCount?: number;
}

export class CategoryRepository extends BaseRepository {
  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      if (this.isOnline()) {
        // Fetch from server
        const categories = await this.getApi().get<Category[]>('/api/categories');
        // Save to local DB
        await this.saveCategoriesToLocal(categories);
        return categories;
      } else {
        // Fetch from local DB
        return await this.getDb().query<Category>('Category');
      }
    } catch (error) {
      console.error('[CategoryRepository] Get all categories failed:', error);
      // Fallback to local DB
      try {
        return await this.getDb().query<Category>('Category');
      } catch {
        return [];
      }
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string): Promise<Category | null> {
    try {
      if (this.isOnline()) {
        const category = await this.getApi().get<Category>(`/api/categories/${categoryId}`);
        if (category) {
          await this.saveCategoryToLocal(category);
        }
        return category;
      } else {
        const categories = await this.getDb().query<Category>('Category', [{ id: categoryId }]);
        return categories.length > 0 ? categories[0] : null;
      }
    } catch (error) {
      console.error('[CategoryRepository] Get category failed:', error);
      return null;
    }
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      if (this.isOnline()) {
        const category = await this.getApi().get<Category>(`/api/categories/slug/${slug}`);
        if (category) {
          await this.saveCategoryToLocal(category);
        }
        return category;
      } else {
        const categories = await this.getDb().query<Category>('Category', [{ slug }]);
        return categories.length > 0 ? categories[0] : null;
      }
    } catch (error) {
      console.error('[CategoryRepository] Get category by slug failed:', error);
      // Try local DB as fallback
      try {
        const categories = await this.getDb().query<Category>('Category', [{ slug }]);
        return categories.length > 0 ? categories[0] : null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Get root categories (no parent)
   */
  async getRootCategories(): Promise<Category[]> {
    try {
      if (this.isOnline()) {
        const categories = await this.getApi().get<Category[]>('/api/categories/root');
        await this.saveCategoriesToLocal(categories);
        return categories;
      } else {
        const allCategories = await this.getDb().query<Category>('Category');
        return allCategories.filter(c => !c.parentId);
      }
    } catch (error) {
      console.error('[CategoryRepository] Get root categories failed:', error);
      return [];
    }
  }

  /**
   * Get subcategories of a parent category
   */
  async getSubcategories(parentId: string): Promise<Category[]> {
    try {
      if (this.isOnline()) {
        const categories = await this.getApi().get<Category[]>(
          `/api/categories/${parentId}/children`
        );
        await this.saveCategoriesToLocal(categories);
        return categories;
      } else {
        return await this.getDb().query<Category>('Category', [{ parentId }]);
      }
    } catch (error) {
      console.error('[CategoryRepository] Get subcategories failed:', error);
      // Fallback to local
      try {
        return await this.getDb().query<Category>('Category', [{ parentId }]);
      } catch {
        return [];
      }
    }
  }

  // Private helper methods

  private async saveCategoriesToLocal(categories: Category[]): Promise<void> {
    try {
      const db = this.getDb();
      for (const category of categories) {
        await db.execute('INSERT INTO Category VALUES (?)', [this.sanitizeForDb(category)]);
      }
    } catch (error) {
      console.warn('[CategoryRepository] Failed to save categories to local:', error);
    }
  }

  private async saveCategoryToLocal(category: Category): Promise<void> {
    try {
      await this.getDb().execute('INSERT INTO Category VALUES (?)', [
        this.sanitizeForDb(category),
      ]);
    } catch (error) {
      console.warn('[CategoryRepository] Failed to save category to local:', error);
    }
  }
}
