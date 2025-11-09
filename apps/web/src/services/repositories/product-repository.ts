/**
 * Product Repository
 * Handles product and variant data access
 */

import { BaseRepository } from './base-repository';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  supplierId?: string;
  basePrice: number;
  costPrice: number;
  taxCategoryId?: string;
  productType: 'Simple' | 'Variable' | 'Bundle';
  isActive: number;
  imageUrl?: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name?: string;
  attributes?: string; // JSON
  price: number;
  compareAtPrice?: number;
  costPrice: number;
  isActive: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productVariantId: string;
  locationId: string;
  quantityAvailable: number;
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint: number;
  reorderQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithVariants extends Product {
  variants?: ProductVariant[];
  inventory?: InventoryItem[];
}

export class ProductRepository extends BaseRepository {
  /**
   * Get all products
   */
  async getAllProducts(): Promise<Product[]> {
    try {
      if (this.isOnline()) {
        // Fetch from server
        const products = await this.getApi().get<Product[]>('/api/products');
        // Save to local DB for offline access
        await this.saveProductsToLocal(products);
        return products;
      } else {
        // Fetch from local DB
        return await this.getDb().query<Product>('Product');
      }
    } catch (error) {
      console.error('[ProductRepository] Get all products failed:', error);
      // Fallback to local DB
      try {
        return await this.getDb().query<Product>('Product');
      } catch {
        return [];
      }
    }
  }

  /**
   * Get product by ID with variants and inventory
   */
  async getProductById(productId: string): Promise<ProductWithVariants | null> {
    try {
      if (this.isOnline()) {
        // Fetch from server
        const product = await this.getApi().get<ProductWithVariants>(`/api/products/${productId}`);
        // Save to local DB
        if (product) {
          await this.saveProductToLocal(product);
        }
        return product;
      } else {
        // Fetch from local DB
        const products = await this.getDb().query<Product>('Product', [{ id: productId }]);
        if (products.length === 0) return null;

        const product = products[0] as ProductWithVariants;

        // Get variants
        const variants = await this.getDb().query<ProductVariant>('ProductVariant', [
          { productId },
        ]);
        product.variants = variants;

        // Get inventory for each variant
        if (variants.length > 0) {
          const inventoryPromises = variants.map(v =>
            this.getDb().query<InventoryItem>('InventoryItem', [{ productVariantId: v.id }])
          );
          const inventoryResults = await Promise.all(inventoryPromises);
          product.inventory = inventoryResults.flat();
        }

        return product;
      }
    } catch (error) {
      console.error('[ProductRepository] Get product failed:', error);
      return null;
    }
  }

  /**
   * Search products by name or SKU
   */
  async searchProducts(query: string): Promise<Product[]> {
    try {
      if (this.isOnline()) {
        const products = await this.getApi().get<Product[]>('/api/products/search', {
          params: { q: query },
        });
        await this.saveProductsToLocal(products);
        return products;
      } else {
        // Simple local search (case-insensitive)
        const allProducts = await this.getDb().query<Product>('Product');
        const lowerQuery = query.toLowerCase();
        return allProducts.filter(
          p =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.sku.toLowerCase().includes(lowerQuery)
        );
      }
    } catch (error) {
      console.error('[ProductRepository] Search products failed:', error);
      return [];
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      if (this.isOnline()) {
        const products = await this.getApi().get<Product[]>(
          `/api/products/category/${categoryId}`
        );
        await this.saveProductsToLocal(products);
        return products;
      } else {
        return await this.getDb().query<Product>('Product', [{ categoryId }]);
      }
    } catch (error) {
      console.error('[ProductRepository] Get products by category failed:', error);
      // Fallback to local
      try {
        return await this.getDb().query<Product>('Product', [{ categoryId }]);
      } catch {
        return [];
      }
    }
  }

  /**
   * Get product variant by ID
   */
  async getVariantById(variantId: string): Promise<ProductVariant | null> {
    try {
      if (this.isOnline()) {
        const variant = await this.getApi().get<ProductVariant>(`/api/variants/${variantId}`);
        if (variant) {
          await this.saveVariantToLocal(variant);
        }
        return variant;
      } else {
        const variants = await this.getDb().query<ProductVariant>('ProductVariant', [
          { id: variantId },
        ]);
        return variants.length > 0 ? variants[0] : null;
      }
    } catch (error) {
      console.error('[ProductRepository] Get variant failed:', error);
      return null;
    }
  }

  /**
   * Get inventory for a variant at a location
   */
  async getInventory(variantId: string, locationId: string): Promise<InventoryItem | null> {
    try {
      if (this.isOnline()) {
        const inventory = await this.getApi().get<InventoryItem>(
          `/api/inventory/${variantId}/${locationId}`
        );
        return inventory;
      } else {
        const items = await this.getDb().query<InventoryItem>('InventoryItem', [
          { productVariantId: variantId, locationId },
        ]);
        return items.length > 0 ? items[0] : null;
      }
    } catch (error) {
      console.error('[ProductRepository] Get inventory failed:', error);
      return null;
    }
  }

  // Private helper methods

  private async saveProductsToLocal(products: Product[]): Promise<void> {
    try {
      const db = this.getDb();
      for (const product of products) {
        await db.execute('INSERT INTO Product VALUES (?)', [this.sanitizeForDb(product)]);
      }
    } catch (error) {
      console.warn('[ProductRepository] Failed to save products to local:', error);
    }
  }

  private async saveProductToLocal(product: ProductWithVariants): Promise<void> {
    try {
      const db = this.getDb();

      // Save product
      await db.execute('INSERT INTO Product VALUES (?)', [this.sanitizeForDb(product)]);

      // Save variants
      if (product.variants) {
        for (const variant of product.variants) {
          await this.saveVariantToLocal(variant);
        }
      }

      // Save inventory
      if (product.inventory) {
        for (const inv of product.inventory) {
          await db.execute('INSERT INTO InventoryItem VALUES (?)', [this.sanitizeForDb(inv)]);
        }
      }
    } catch (error) {
      console.warn('[ProductRepository] Failed to save product to local:', error);
    }
  }

  private async saveVariantToLocal(variant: ProductVariant): Promise<void> {
    try {
      await this.getDb().execute('INSERT INTO ProductVariant VALUES (?)', [
        this.sanitizeForDb(variant),
      ]);
    } catch (error) {
      console.warn('[ProductRepository] Failed to save variant to local:', error);
    }
  }
}
