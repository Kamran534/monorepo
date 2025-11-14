/**
 * Web Product Repository
 * 
 * Wraps the existing ProductRepository to match the ProductRepository interface
 * from the Redux store for state management
 */

import type { ProductRepository as StoreProductRepository, GetProductsResult, Product } from '@monorepo/shared-store';
import { ProductRepository, type Product as LocalProduct } from './product-repository';
import { dataAccessService } from '../data-access.service';

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
   * Get all products with online/offline support
   * Returns result in the format expected by Redux store
   */
  async getAllProducts(): Promise<GetProductsResult> {
    try {
      // Check connection state
      const connectionState = dataAccessService.getConnectionState();
      const useServer = connectionState.dataSource === 'server';

      if (useServer) {
        // Fetch from API
        try {
          const response = await fetch(`${SERVER_URL}/api/products?includeVariants=false&includeInventory=false`, {
            headers: {
              'Content-Type': 'application/json',
              ...(localStorage.getItem('authToken') && {
                Authorization: `Bearer ${localStorage.getItem('authToken')}`,
              }),
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          const products: ApiProduct[] = (data.data || data || []) as ApiProduct[];

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

          return {
            success: true,
            products: transformedProducts,
            isOffline: false,
          };
        } catch (apiError) {
          console.warn('[WebProductRepository] API fetch failed, falling back to local:', apiError);
          // Fall through to offline mode
        }
      }

      // Offline mode - use existing ProductRepository which handles IndexedDB
      try {
        const localProducts = await this.productRepo.getAllProducts();
        
        // Transform local products to match Product interface
        const transformedProducts: Product[] = localProducts.map((p: LocalProduct) => {
          // Handle image URL - prepend server URL if relative
          let imageUrl: string | undefined = p.imageUrl || undefined;
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${SERVER_URL}/${imageUrl}`;
          }

          return {
            id: p.id,
            productNumber: p.sku || 'N/A',
            name: p.name,
            description: p.description,
            categoryId: p.categoryId,
            price: `$${(p.basePrice || 0).toFixed(2)}`,
            image: imageUrl,
            rating: undefined,
            reviewCount: undefined,
          };
        });

        return {
          success: true,
          products: transformedProducts,
          isOffline: true,
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

