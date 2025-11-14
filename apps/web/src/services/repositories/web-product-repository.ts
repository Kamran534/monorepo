/**
 * Web Product Repository
 * 
 * Wraps the existing ProductRepository to match the ProductRepository interface
 * from the Redux store for state management
 */

import type { ProductRepository as StoreProductRepository, GetProductsResult, Product } from '@monorepo/shared-store';
import { ProductRepository, type Product as LocalProduct } from './product-repository';
import { dataAccessService } from '../data-access.service';
import { DataSource } from '@monorepo/shared-data-access';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

// Type for API response product
interface ApiProduct {
  id: string;
  productCode?: string;
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  basePrice?: number;
  price?: number;
  imageUrl?: string;
  image?: string;
}

export class WebProductRepository implements StoreProductRepository {
  private productRepo: ProductRepository;

  constructor() {
    this.productRepo = new ProductRepository();
  }

  /**
   * Save API products to IndexedDB with barcode/productCode mapping
   */
  private async saveProductsToLocal(apiProducts: ApiProduct[]): Promise<void> {
    try {
      const db = dataAccessService.getLocalDb();
      const now = new Date().toISOString();

      for (const apiProduct of apiProducts) {
        // Transform API product to local Product format
        const localProduct: LocalProduct = {
          id: apiProduct.id,
          sku: apiProduct.sku || apiProduct.productCode || apiProduct.barcode || apiProduct.id,
          productCode: apiProduct.productCode,
          barcode: apiProduct.barcode || apiProduct.productCode,
          name: apiProduct.name,
          description: apiProduct.description,
          categoryId: apiProduct.categoryId,
          basePrice: apiProduct.basePrice || apiProduct.price || 0,
          costPrice: apiProduct.basePrice || apiProduct.price || 0,
          productType: 'Simple',
          isActive: 1,
          imageUrl: apiProduct.imageUrl || apiProduct.image,
          createdAt: now,
          updatedAt: now,
        };

        // Save to IndexedDB using the same pattern as ProductRepository
        await db.execute('Product', [localProduct]);
      }
    } catch (error) {
      console.warn('[WebProductRepository] Failed to save products to local:', error);
    }
  }

  /**
   * Get all products with online/offline support
   * Returns result in the format expected by Redux store
   */
  async getAllProducts(options?: { page?: number; limit?: number }): Promise<GetProductsResult> {
    try {
      // Check connection state - use same pattern as BaseRepository
      const { source } = dataAccessService.getCurrentDataClient();
      const useServer = source === DataSource.SERVER;

      console.log('[WebProductRepository] Data source:', source);
      console.log('[WebProductRepository] Use server:', useServer);
      console.log('[WebProductRepository] Server URL:', SERVER_URL);

      if (useServer) {
        // Fetch from API
        try {
          const pageNum = options?.page || 1;
          const limitNum = options?.limit || 50;
          const apiUrl = `${SERVER_URL}/api/products?includeVariants=false&includeInventory=false&page=${pageNum}&limit=${limitNum}`;
          console.log('[WebProductRepository] Fetching from API:', apiUrl);

          const response = await fetch(apiUrl, {
            headers: {
              'Content-Type': 'application/json',
              ...(localStorage.getItem('authToken') && {
                Authorization: `Bearer ${localStorage.getItem('authToken')}`,
              }),
            },
          });

          console.log('[WebProductRepository] API response status:', response.status);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('[WebProductRepository] API response data structure:', {
            hasData: !!data.data,
            hasProducts: !!data.products,
            isArray: Array.isArray(data),
            keys: Object.keys(data),
            total: data.total,
            meta: data.meta,
            page: data.page,
            limit: data.limit,
          });
          
          let products: ApiProduct[] = (data.data || data.products || (Array.isArray(data) ? data : []) || []) as ApiProduct[];
          const total = data.total || data.meta?.total || data.data?.total || (Array.isArray(data) ? data.length : products.length);
          let responsePage = data.page || data.meta?.page || data.data?.page || pageNum;
          let responseLimit = data.limit || data.meta?.limit || data.data?.limit || limitNum;
          
          // If API returned more products than requested, apply client-side pagination
          if (products.length > limitNum && (!responseLimit || responseLimit !== limitNum)) {
            console.warn('[WebProductRepository] API returned more products than requested, applying client-side pagination');
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            products = products.slice(startIndex, endIndex);
            responseLimit = limitNum;
            responsePage = pageNum;
          }
          
          const totalPages = Math.ceil(total / responseLimit);
          
          console.log('[WebProductRepository] Products fetched from API:', {
            count: products.length,
            expected: limitNum,
            page: responsePage,
            limit: responseLimit,
            total,
            totalPages,
          });

          // Save products to IndexedDB with barcode/productCode (non-blocking)
          // Don't let save errors prevent returning the API response
          this.saveProductsToLocal(products).catch((saveError) => {
            console.warn('[WebProductRepository] Failed to save products to local (non-fatal):', saveError);
          });

          // Transform products to match Product interface
          const transformedProducts: Product[] = products.map((p: ApiProduct) => {
            // Handle image URL - prepend server URL if relative
            let imageUrl: string | undefined = p.imageUrl || p.image || undefined;
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `${SERVER_URL}/${imageUrl}`;
            }

            return {
              id: p.id,
              productNumber: p.barcode || p.productCode || p.sku || 'N/A',
              name: p.name,
              description: p.description,
              categoryId: p.categoryId,
              price: `$${(p.basePrice || p.price || 0).toFixed(2)}`,
              image: imageUrl,
              rating: undefined,
              reviewCount: undefined,
            };
          });

          console.log('[WebProductRepository] Returning transformed products:', transformedProducts.length);
          return {
            success: true,
            products: transformedProducts,
            isOffline: false,
            pagination: {
              page: responsePage,
              limit: responseLimit,
              total,
              totalPages,
            },
          };
        } catch (apiError) {
          const errorMsg = apiError instanceof Error ? apiError.message : String(apiError);
          console.error('[WebProductRepository] API fetch failed:', errorMsg);
          console.error('[WebProductRepository] Error details:', apiError);
          console.error('[WebProductRepository] Error stack:', apiError instanceof Error ? apiError.stack : 'N/A');
          
          // Fall back to offline mode with clear log
          console.warn('[WebProductRepository] Falling back to offline products due to API failure');
        }
      }

      console.log('[WebProductRepository] Using offline mode');

      // Offline mode - use existing ProductRepository which handles IndexedDB
      try {
        const localProducts = await this.productRepo.getAllProducts();
        
        // Transform local products to match Product interface
        const allTransformedProducts: Product[] = localProducts.map((p: LocalProduct) => {
          // Handle image URL - prepend server URL if relative
          let imageUrl: string | undefined = p.imageUrl || undefined;
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${SERVER_URL}/${imageUrl}`;
          }

          return {
            id: p.id,
            productNumber: p.barcode || p.productCode || p.sku || 'N/A',
            name: p.name,
            description: p.description,
            categoryId: p.categoryId,
            price: `$${(p.basePrice || 0).toFixed(2)}`,
            image: imageUrl,
            rating: undefined,
            reviewCount: undefined,
          };
        });

        // Apply pagination for offline mode
        const pageNum = options?.page || 1;
        const limitNum = options?.limit || 50;
        const total = allTransformedProducts.length;
        const totalPages = Math.ceil(total / limitNum);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const transformedProducts = allTransformedProducts.slice(startIndex, endIndex);

        return {
          success: true,
          products: transformedProducts,
          isOffline: true,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
          },
        };
      } catch (localError) {
        console.warn('[WebProductRepository] Local DB fetch failed:', localError);
        return {
          success: true,
          products: [],
          isOffline: true,
          error: 'Failed to fetch products from local storage',
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch products';
      console.error('[WebProductRepository] Error:', errorMsg);
      return {
        success: false,
        products: [],
        error: errorMsg,
        isOffline: true,
      };
    }
  }
}

