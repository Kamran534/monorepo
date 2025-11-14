/**
 * Desktop Product Repository
 *
 * Wraps Electron IPC calls to fetch products
 * Supports both online (API) and offline (SQLite) modes
 */

import type { ProductRepository, Product, GetProductsResult } from '@monorepo/shared-store';

export type { Product, GetProductsResult };

export class DesktopProductRepository implements ProductRepository {
  /**
   * Get all products via Electron IPC
   */
  async getAllProducts(): Promise<GetProductsResult> {
    try {
      // Check if electronAPI is available
      if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.product) {
        const errorMsg = 'Electron API not available. Make sure the preload script is loaded.';
        console.error('[DesktopProductRepository]', errorMsg);
        console.error('[DesktopProductRepository] window:', typeof window);
        console.error('[DesktopProductRepository] window.electronAPI:', typeof window?.electronAPI);
        console.error('[DesktopProductRepository] window.electronAPI.product:', typeof window?.electronAPI?.product);
        return {
          success: false,
          products: [],
          error: errorMsg,
          isOffline: true,
        };
      }

      console.log('[DesktopProductRepository] Calling electronAPI.product.getAll');
      const result = await window.electronAPI.product.getAll();

      console.log('[DesktopProductRepository] Result:', {
        success: result.success,
        productCount: result.products?.length || 0,
        isOffline: result.isOffline,
      });

      return {
        success: result.success,
        products: result.products || [],
        error: result.error,
        isOffline: result.isOffline,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DesktopProductRepository] Error:', errorMsg);
      console.error('[DesktopProductRepository] Error stack:', error instanceof Error ? error.stack : 'N/A');
      return {
        success: false,
        products: [],
        error: errorMsg,
        isOffline: true,
      };
    }
  }
}

// Singleton instance
let repositoryInstance: DesktopProductRepository | null = null;

export function getDesktopProductRepository(): DesktopProductRepository {
  if (!repositoryInstance) {
    repositoryInstance = new DesktopProductRepository();
  }
  return repositoryInstance;
}

