import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { PackageX } from 'lucide-react';
import {
  ProductInfo,
  ProductImages,
  ProductSpecifications,
  RelatedProducts,
  Product,
  Loading,
  useToast,
} from '@monorepo/shared-ui';
import { useCart } from '@monorepo/shared-ui';
import { parsePriceValue } from '../utils/price.js';

export interface ProductDetailRepository {
  getProductById(productId: string): Promise<{
    id: string;
    sku: string;
    productCode?: string;
    name: string;
    description?: string;
    basePrice: number;
    imageUrl?: string;
    variants?: Array<{
      id: string;
      sku: string;
      name?: string;
      price: number;
      imageUrl?: string;
    }>;
    inventory?: Array<{
      id: string;
      productVariantId: string;
      locationId: string;
      quantityAvailable: number;
      quantityOnHand: number;
    }>;
  } | null>;
  getAllProductsForDetail(): Promise<Product[]>;
}

export interface ProductDetailProps {
  repository: ProductDetailRepository;
}

// Cache configuration
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

// In-memory cache for product details
const productCache = new Map<string, {
  data: any;
  timestamp: number;
}>();

// In-memory cache for related products
const relatedProductsCache = new Map<string, {
  data: Product[];
  timestamp: number;
}>();

export function ProductDetail({ repository }: ProductDetailProps) {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { show } = useToast();
  const [productData, setProductData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);

  // Fetch product details with cache management
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = productCache.get(productId);
        if (cached) {
          const cacheAge = Date.now() - cached.timestamp;
          if (cacheAge < CACHE_TIMEOUT) {
            console.log('[ProductDetail] Using cached product data (age:', Math.round(cacheAge / 1000), 'seconds)');
            setProductData(cached.data);
            setLoading(false);
            setError(null);
            return;
          } else {
            console.log('[ProductDetail] Cache expired (age:', Math.round(cacheAge / 1000), 'seconds), fetching fresh data');
            productCache.delete(productId); // Remove expired cache
          }
        }
      } else {
        console.log('[ProductDetail] Force refresh requested, bypassing cache');
        productCache.delete(productId); // Clear cache on force refresh
        setForceRefresh(false);
      }

      try {
        setLoading(true);
        setError(null);
        console.log('[ProductDetail] Fetching product from API/DB:', productId);
        const data = await repository.getProductById(productId);
        
        if (data) {
          console.log('[ProductDetail] Product loaded:', {
            id: data.id,
            name: data.name,
            variantCount: data.variants?.length || 0,
            inventoryCount: data.inventory?.length || 0,
          });
          
          // Update cache
          productCache.set(productId, {
            data,
            timestamp: Date.now(),
          });
          
          setProductData(data);
        } else {
          setError('Product not found');
          // Remove from cache if product not found
          productCache.delete(productId);
        }
      } catch (err) {
        console.error('[ProductDetail] Failed to fetch product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
        
        // Try to use stale cache if available (even if expired)
        const cached = productCache.get(productId);
        if (cached) {
          console.log('[ProductDetail] API/DB fetch failed, using stale cache as fallback');
          setProductData(cached.data);
          setError(null); // Clear error since we have stale data
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, repository, forceRefresh]);

  // Map fetched product data to UI Product format
  const product = useMemo<Product | null>(() => {
    if (!productData) return null;
    
    // Safely handle basePrice - it might be undefined, null, or a string
    const basePrice = productData.basePrice ?? productData.price ?? 0;
    const numericPrice = typeof basePrice === 'string' 
      ? parseFloat(basePrice.replace(/[^0-9.]/g, '')) || 0
      : (typeof basePrice === 'number' ? basePrice : 0);
    
    return {
      id: productData.id,
      productNumber: productData.productCode || productData.sku || productData.id,
      name: productData.name,
      price: `$${numericPrice.toFixed(2)}`,
      image: productData.imageUrl || productData.images?.[0],
      description: productData.description,
    };
  }, [productData]);

  // Helper function to shuffle array (Fisher-Yates algorithm)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Related products (excluding current product)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  
  useEffect(() => {
    const fetchRelated = async () => {
      if (!productId) {
        setLoadingRelated(false);
        return;
      }

      // Check cache for related products
      const cached = relatedProductsCache.get('all');
      if (cached) {
        const cacheAge = Date.now() - cached.timestamp;
        if (cacheAge < CACHE_TIMEOUT) {
          console.log('[ProductDetail] Using cached related products (age:', Math.round(cacheAge / 1000), 'seconds)');
          const filtered = cached.data.filter(p => p.id !== productId);
          const shuffled = shuffleArray(filtered);
          const related = shuffled.slice(0, 4).map(p => ({
            id: p.id,
            productNumber: p.productNumber,
            name: p.name,
            price: p.price,
            image: p.image,
            rating: p.rating,
            reviewCount: p.reviewCount,
          }));
          setRelatedProducts(related);
          setLoadingRelated(false);
          return;
        }
      }

      try {
        setLoadingRelated(true);
        const allProducts = await repository.getAllProductsForDetail();
        const filtered = allProducts.filter(p => p.id !== productId);
        const shuffled = shuffleArray(filtered);
        const related = shuffled.slice(0, 4).map(p => ({
          id: p.id,
          productNumber: p.productNumber,
          name: p.name,
          price: p.price,
          image: p.image,
          rating: p.rating,
          reviewCount: p.reviewCount,
        }));
        
        // Update cache
        relatedProductsCache.set('all', {
          data: allProducts,
          timestamp: Date.now(),
        });
        
        setRelatedProducts(related);
      } catch (err) {
        console.warn('[ProductDetail] Failed to fetch related products:', err);
        
        // Try to use stale cache if available
        const cached = relatedProductsCache.get('all');
        if (cached) {
          console.log('[ProductDetail] Using stale related products cache as fallback');
          const filtered = cached.data.filter(p => p.id !== productId);
          const shuffled = shuffleArray(filtered);
          const related = shuffled.slice(0, 4).map(p => ({
            id: p.id,
            productNumber: p.productNumber,
            name: p.name,
            price: p.price,
            image: p.image,
            rating: p.rating,
            reviewCount: p.reviewCount,
          }));
          setRelatedProducts(related);
        } else {
          setRelatedProducts([]);
        }
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelated();
  }, [productId, repository]);

  // Product variants from fetched data
  const productVariants = useMemo(() => {
    if (!productData?.variants) return [];
    
    return productData.variants.map((v: any) => ({
      id: v.id,
      name: v.name || v.sku,
      productNumber: v.sku || productData.productCode || productData.id,
      image: v.imageUrl || productData.imageUrl,
    }));
  }, [productData]);

  // Calculate total inventory quantity from quantityOnHand (in-hand count)
  // Ensure it's not less than 0
  const totalQuantity = useMemo(() => {
    if (!productData?.inventory) return 0;
    const total = productData.inventory.reduce((sum: number, inv: any) => sum + (inv.quantityOnHand || 0), 0);
    return Math.max(0, total); // Ensure not less than 0
  }, [productData]);

  const productImages = useMemo(() => {
    const images: string[] = [];
    if (productData?.imageUrl) images.push(productData.imageUrl);
    if (productData?.images && Array.isArray(productData.images)) {
      images.push(...productData.images);
    }
    return images.length > 0 ? images : (product?.image ? [product.image] : []);
  }, [productData, product]);

  // Build specifications from product data
  const specifications = useMemo(() => {
    const specs: Array<{ label: string; value: string }> = [];
    if (productData?.categoryId) {
      specs.push({ label: 'Category', value: productData.categoryId });
    }
    if (productData?.brandId) {
      specs.push({ label: 'Brand', value: productData.brandId });
    }
    if (productData?.sku) {
      specs.push({ label: 'SKU', value: productData.sku });
    }
    if (productData?.barcode) {
      specs.push({ label: 'Barcode', value: productData.barcode });
    }
    return specs.length > 0 ? specs : [
      { label: 'Material', value: 'N/A' },
      { label: 'Color', value: 'N/A' },
      { label: 'Style', value: 'N/A' },
    ];
  }, [productData]);

  const description = productData?.description || "Product description not available.";

  // Get cache age for display
  const cacheAge = useMemo(() => {
    if (!productId) return null;
    const cached = productCache.get(productId);
    if (!cached) return null;
    return Math.round((Date.now() - cached.timestamp) / 1000);
  }, [productId, productData]);

  // Handle manual refresh
  const handleRefresh = () => {
    setForceRefresh(true);
  };

  if (loading) {
    return (
      <div 
        className="w-full flex items-center justify-center overflow-hidden" 
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          height: 'calc(100vh - 80px)',
        }}
      >
        <Loading message="Loading product details..." size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div 
        className="w-full flex items-center justify-center overflow-hidden" 
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          height: 'calc(100vh - 80px)',
        }}
      >
        <div className="text-center flex flex-col items-center justify-center gap-4">
          <PackageX size={80} style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }} />
          <div className="flex flex-col items-center justify-center gap-2">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {error ? 'Error Loading Product' : 'Product Not Found'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {error || 'The product you\'re looking for doesn\'t exist.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column - Product Information */}
            <div className="col-span-3">
              <ProductInfo
                productName={product.name}
                productNumber={product.productNumber}
                price={product.price || ''}
                currentQuantity={totalQuantity}
                unit="Each"
                onAddItem={() => {
                  if (totalQuantity <= 0) {
                    return;
                  }
                  const numericPrice = parsePriceValue(product.price ?? null) ?? 0;
                  // Get first variant ID if available, otherwise use product ID
                  const variantId = productData?.variants?.[0]?.id || productData?.id;
                  addItem({ 
                    name: product.name, 
                    price: numericPrice, 
                    quantity: 1,
                    productId: productData?.id,
                    productVariantId: variantId,
                    availableQuantity: totalQuantity,
                  }, show);
                  navigate('/transactions');
                }}
                onOtherStoresInventory={() => {
                  // Show inventory across all locations
                  if (productData?.inventory && productData.inventory.length > 0) {
                    console.log('[ProductDetail] Inventory by location:', productData.inventory);
                    // TODO: Open inventory modal or navigate to inventory page
                  }
                }}
              />
            </div>

            {/* Middle Column - Images and Specifications Side by Side, Description Below */}
            <div className="col-span-6 flex flex-col gap-8">
              {/* Images and Specifications Side by Side - Equal Space */}
              <div className="grid grid-cols-2 gap-8">
                {/* Images Section - Equal Space */}
                <div className="flex flex-col">
                  <ProductImages
                    images={productImages}
                    productName={product.name}
                    variants={productVariants}
                    onVariantClick={(variant) => {
                      // Navigate to the variant product page
                      const variantId = variant.productNumber || variant.id.split('-')[0];
                      navigate(`/products/${variantId}`);
                    }}
                  />
                </div>

                {/* Specifications Section - Equal Space */}
                <div className="flex flex-col gap-8">
                  <ProductSpecifications
                    specifications={specifications}
                  />

                  {/* Description - Under Specifications */}
              <div className="flex flex-col gap-4 w-full">
                <h2 className="text-sm font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                  Description
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                  {description}
                </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Related Products */}
            <div className="col-span-3">
              {loadingRelated ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 mb-4" style={{ borderColor: 'var(--color-accent-blue)' }}></div>
                  </div>
                </div>
              ) : (
              <RelatedProducts
                products={relatedProducts}
                onProductClick={(product) => navigate(`/products/${product.id}`)}
              />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;

