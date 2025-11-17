/**
 * Product Repository
 * Handles product and variant data access
 */

import { BaseRepository } from './base-repository';

export interface Product {
  id: string;
  sku: string;
  productCode?: string;
  barcode?: string;
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
        // Fetch from server with variants and inventory
        console.log('[ProductRepository] Fetching product from API:', productId);
        const response = await this.getApi().get<{ success: boolean; data?: any }>(
          `/api/products/${productId}?includeVariants=true&includeInventory=true`
        );
        
        if (response.success && response.data) {
          const apiProduct = response.data;
          
          // Map API product to ProductWithVariants format
          const product: ProductWithVariants = {
            id: apiProduct.id,
            sku: apiProduct.productCode || apiProduct.sku || apiProduct.id,
            productCode: apiProduct.productCode,
            barcode: apiProduct.barcode,
            name: apiProduct.name,
            description: apiProduct.description,
            categoryId: apiProduct.categoryId,
            brandId: apiProduct.brandId,
            supplierId: apiProduct.supplierId,
            basePrice: parseFloat(apiProduct.basePrice || apiProduct.retailPrice || 0),
            costPrice: parseFloat(apiProduct.costPrice || apiProduct.cost || 0),
            taxCategoryId: apiProduct.taxCategoryId,
            productType: apiProduct.hasVariants ? 'Variable' : 'Simple',
            isActive: apiProduct.isActive ? 1 : 0,
            imageUrl: apiProduct.images?.[0] || apiProduct.image,
            tags: Array.isArray(apiProduct.tags) ? apiProduct.tags.join(',') : apiProduct.tags,
            createdAt: apiProduct.createdAt || new Date().toISOString(),
            updatedAt: apiProduct.updatedAt || new Date().toISOString(),
            variants: apiProduct.variants?.map((v: any) => ({
              id: v.id,
              productId: v.productId || productId,
              sku: v.sku || v.variantSku,
              name: v.variantName || v.name,
              attributes: v.options ? JSON.stringify(v.options) : undefined,
              price: parseFloat(v.retailPrice || v.price || 0),
              compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : undefined,
              costPrice: parseFloat(v.cost || v.costPrice || 0),
              isActive: v.isActive ? 1 : 0,
              imageUrl: v.image,
              createdAt: v.createdAt || new Date().toISOString(),
              updatedAt: v.updatedAt || new Date().toISOString(),
            })) || [],
            inventory: apiProduct.variants?.flatMap((v: any) => 
              (v.inventoryItems || []).map((inv: any) => ({
                id: inv.id,
                productVariantId: inv.productVariantId || v.id,
                locationId: inv.locationId || inv.location?.id,
                quantityAvailable: inv.quantityAvailable || 0,
                quantityOnHand: inv.quantityOnHand || 0,
                quantityReserved: inv.quantityCommitted || inv.quantityReserved || 0,
                reorderPoint: inv.reorderPoint || 0,
                reorderQuantity: inv.reorderQuantity || 0,
                createdAt: inv.createdAt || new Date().toISOString(),
                updatedAt: inv.updatedAt || new Date().toISOString(),
              }))
            ) || [],
          };
          
          // Save to local DB for offline access
          await this.saveProductToLocal(product).catch(err => {
            console.warn('[ProductRepository] Failed to save product to local DB:', err);
          });
          
          return product;
        }
        
        return null;
      } else {
        // Fetch from local DB (offline mode)
        console.log('[ProductRepository] Fetching product from local DB:', productId);
        const db = this.getDb();
        
        // Check if using IndexedDB (web) or SQLite (desktop)
        const isIndexedDB = db.constructor.name === 'WebIndexedDbClient';
        
        // Get product
        let products: Product[];
        if (isIndexedDB) {
          // IndexedDB: Use SQL-like query
          products = await db.query<Product>('SELECT * FROM Product WHERE id = ?', [productId]);
        } else {
          // SQLite: Use SQL query
          products = await db.query<Product>('SELECT * FROM Product WHERE id = ?', [productId]);
        }
        
        if (products.length === 0) {
          console.log('[ProductRepository] Product not found in local DB');
          return null;
        }

        const product = products[0] as ProductWithVariants;

        // Get variants
        let variants: ProductVariant[];
        if (isIndexedDB) {
          variants = await db.query<ProductVariant>('SELECT * FROM ProductVariant WHERE productId = ?', [productId]);
        } else {
          variants = await db.query<ProductVariant>('SELECT * FROM ProductVariant WHERE productId = ?', [productId]);
        }
        product.variants = variants;

        // Get inventory for each variant
        if (variants.length > 0) {
          const inventoryPromises = variants.map(v => {
            if (isIndexedDB) {
              return db.query<InventoryItem>('SELECT * FROM InventoryItem WHERE productVariantId = ?', [v.id]);
            } else {
              // Note: SQLite schema uses variantId, not productVariantId
              return db.query<InventoryItem>('SELECT * FROM InventoryItem WHERE variantId = ?', [v.id]);
            }
          });
          const inventoryResults = await Promise.all(inventoryPromises);
          product.inventory = inventoryResults.flat();
        }

        console.log('[ProductRepository] Loaded product from local DB:', {
          productId: product.id,
          variantCount: product.variants?.length || 0,
          inventoryCount: product.inventory?.length || 0,
        });

        return product;
      }
    } catch (error) {
      console.error('[ProductRepository] Get product failed:', error);
      // Try fallback to local DB if online fetch fails
      if (this.isOnline()) {
        console.log('[ProductRepository] Online fetch failed, trying local DB fallback');
        try {
          // Temporarily force offline mode by directly querying local DB
          const db = this.getDb();
          const isIndexedDB = db.constructor.name === 'WebIndexedDbClient';
          
          const products = await db.query<Product>('SELECT * FROM Product WHERE id = ?', [productId]);
          if (products.length === 0) return null;
          
          const product = products[0] as ProductWithVariants;
          const variants = await db.query<ProductVariant>('SELECT * FROM ProductVariant WHERE productId = ?', [productId]);
          product.variants = variants;
          
          if (variants.length > 0) {
            const inventoryPromises = variants.map(async v => {
              let inventoryItems: any[];
              if (isIndexedDB) {
                inventoryItems = await db.query<any>('SELECT * FROM InventoryItem WHERE productVariantId = ?', [v.id]);
              } else {
                inventoryItems = await db.query<any>('SELECT * FROM InventoryItem WHERE variantId = ?', [v.id]);
              }
              // Map to InventoryItem interface format
              return inventoryItems.map((inv: any) => ({
                id: inv.id,
                productVariantId: inv.productVariantId || inv.variantId || v.id,
                locationId: inv.locationId,
                quantityAvailable: inv.quantityAvailable || 0,
                quantityOnHand: inv.quantityOnHand || 0,
                quantityReserved: inv.quantityReserved || inv.quantityCommitted || 0,
                reorderPoint: inv.reorderPoint || 0,
                reorderQuantity: inv.reorderQuantity || 0,
                createdAt: inv.createdAt || new Date().toISOString(),
                updatedAt: inv.updatedAt || new Date().toISOString(),
              }));
            });
            const inventoryResults = await Promise.all(inventoryPromises);
            product.inventory = inventoryResults.flat();
          }
          
          return product;
        } catch (fallbackError) {
          console.error('[ProductRepository] Fallback to local DB also failed:', fallbackError);
        }
      }
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
