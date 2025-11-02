import { useNavigate } from 'react-router-dom';
import { useMemo, useState, useRef, useEffect } from 'react';
import { Product } from '@monorepo/shared-ui';
import { Package } from 'lucide-react';

interface ProductGridCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
}

function ProductGridCard({ product, onProductClick }: ProductGridCardProps) {
  const hasImage = !!product.image;
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (hasImage && imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
        setImageLoaded(true);
        setImageError(false);
      } else if (imgRef.current.complete && imgRef.current.naturalHeight === 0) {
        setImageError(true);
        setImageLoaded(false);
      }
    }
  }, [hasImage]);

  return (
    <div
      onClick={() => onProductClick(product)}
      className="flex flex-col rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-lg"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-light)',
      }}
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden">
        {hasImage && !imageError && (
          <img
            ref={imgRef}
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
        )}
        {(!hasImage || imageError || !imageLoaded) && (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <Package size={48} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {product.productNumber}
        </p>
        <p className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
          {product.name}
        </p>
        {product.price && (
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {product.price}
          </p>
        )}
        {product.rating && (
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span role="img" aria-label="star rating">⭐</span> {product.rating} ({product.reviewCount} reviews)
          </p>
        )}
      </div>
    </div>
  );
}

export function Products() {
  const navigate = useNavigate();

  const products = useMemo<Product[]>(() => [
    { id: '81328', productNumber: '81328', name: 'Brown Leopardprint Sunglasses', price: '$130.00', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81300', productNumber: '81300', name: 'Brown Leather Travel Bag', price: '$89.99', rating: 3.8, reviewCount: 195, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
    { id: '81302', productNumber: '81302', name: 'Brown Snakeskin Bag', price: '$95.00', rating: 3.8, reviewCount: 192, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop' },
    { id: '81333', productNumber: '81333', name: 'Silver Stunner Sunglasses', price: '$42.00', rating: 3.7, reviewCount: 192, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81327', productNumber: '81327', name: 'Black Wireframe Sunglasses', price: '$120.00', rating: 3.8, reviewCount: 190, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81329', productNumber: '81329', name: 'Black Thick Rimmed Sunglasses', price: '$48.00', rating: 3.8, reviewCount: 193, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81330', productNumber: '81330', name: 'Brown Aviator Sunglasses', price: '$150.00', rating: 3.9, reviewCount: 195, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81331', productNumber: '81331', name: 'Pink Thick Rimmed Sunglasses', price: '$52.00', rating: 3.7, reviewCount: 188, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81319', productNumber: '81319', name: 'Brown Glove & Scarf Set', price: '$35.99', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop' },
    { id: '81323', productNumber: '81323', name: 'Grey Cotton Gloves', price: '$28.50', rating: 3.8, reviewCount: 192, image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop' },
    { id: '81320', productNumber: '81320', name: 'Brown Leather Gloves', price: '$38.00', rating: 3.8, reviewCount: 190, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop' },
    { id: '81321', productNumber: '81321', name: 'Black Cotton Gloves', price: '$32.00', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop' },
  ], []);

  const handleProductClick = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <ProductGridCard
              key={product.id}
              product={product}
              onProductClick={handleProductClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
