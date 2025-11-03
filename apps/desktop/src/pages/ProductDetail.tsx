import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { PackageX } from 'lucide-react';
import {
  ProductInfo,
  ProductImages,
  ProductSpecifications,
  RelatedProducts,
  Product,
} from '@monorepo/shared-ui';
import { useCart } from '@monorepo/shared-ui';

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  // TODO: Fetch product details from API based on productId
  // Sample product data - replace with API call
  const product = useMemo<Product | null>(() => {
    // Sample products matching the image data
    const allProducts: Product[] = [
      { id: '81328', productNumber: '81328', name: 'Brown Leopardprint Sunglasses', price: '$130.00', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
      { id: '81300', productNumber: '81300', name: 'Brown Leather Travel Bag', price: '$89.99', rating: 3.8, reviewCount: 195, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
      { id: '81302', productNumber: '81302', name: 'Brown Snakeskin Bag', price: '$95.00', rating: 3.8, reviewCount: 192, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop' },
      { id: '81333', productNumber: '81333', name: 'Silver Stunner Sunglasses', price: '$42.00', rating: 3.7, reviewCount: 192, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    ];

    return allProducts.find(p => p.id === productId) || null;
  }, [productId]);

  // Related products (excluding current product)
  const relatedProducts = useMemo<Product[]>(() => {
    const allProducts: Product[] = [
      { id: '81327', productNumber: '81327', name: 'Black Wireframe Sunglasses', price: '$120.00', rating: 3.8, reviewCount: 190, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
      { id: '81329', productNumber: '81329', name: 'Black Thick Rimmed Sunglasses', price: '$48.00', rating: 3.8, reviewCount: 193, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
      { id: '81330', productNumber: '81330', name: 'Brown Aviator Sunglasses', price: '$150.00', rating: 3.9, reviewCount: 195, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
      { id: '81331', productNumber: '81331', name: 'Pink Thick Rimmed Sunglasses', price: '$52.00', rating: 3.7, reviewCount: 188, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    ];
    return allProducts.filter(p => p.id !== productId);
  }, [productId]);

  // Product variants - sample data
  const productVariants = useMemo(() => {
    if (productId === '81328') {
      return [
        { id: '81328-1', name: 'Brown Leopardprint', productNumber: '81328', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop' },
        { id: '81328-2', name: 'Black Leopardprint', productNumber: '81329', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=200&h=200&fit=crop' },
        { id: '81328-3', name: 'Silver Leopardprint', productNumber: '81330', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop' },
        { id: '81328-4', name: 'Pink Leopardprint', productNumber: '81331', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=200&h=200&fit=crop' },
      ];
    }
    return [];
  }, [productId]);

  if (!product) {
    return (
      <div 
        className="w-full flex items-center justify-center overflow-hidden" 
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          height: 'calc(100vh - 80px)', // Subtract navbar height
        }}
      >
        <div className="text-center flex flex-col items-center justify-center gap-4">
          <PackageX size={80} style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }} />
          <div className="flex flex-col items-center justify-center gap-2">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Product Not Found</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>The product you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const productImages = product.image ? [product.image] : [];

  const specifications = [
    { label: 'Material', value: 'Plastic' },
    { label: 'Color', value: 'Brown' },
    { label: 'Style', value: 'Leopardprint' },
  ];

  const description = "Our fashion buyers search the globe to find sunglasses that match any active and fashion conscious needs. From the wireframe to aviator styles, we have you covered.";

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
                currentQuantity={0}
                unit="Each"
                onAddItem={() => {
                  const numericPrice = parseFloat((product.price || '0').replace(/[^0-9.]/g, '')) || 0;
                  addItem({ name: product.name, price: numericPrice, quantity: 1 });
                  navigate('/transactions');
                }}
                onOtherStoresInventory={() => console.log('Other stores inventory clicked')}
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
                <div className="flex flex-col">
                  <ProductSpecifications
                    specifications={specifications}
                  />
                </div>
              </div>

              {/* Description - Full Width */}
              <div className="flex flex-col gap-4 w-full">
                <h2 className="text-sm font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                  Description
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                  {description}
                </p>
              </div>
            </div>

            {/* Right Column - Related Products */}
            <div className="col-span-3">
              <RelatedProducts
                products={relatedProducts}
                onProductClick={(product) => navigate(`/products/${product.id}`)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

