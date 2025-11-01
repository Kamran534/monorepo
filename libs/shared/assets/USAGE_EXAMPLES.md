# Collection Images - Usage Examples

## 📦 Import

```typescript
import { 
  CollectionImages, 
  allCollections,
  getCollectionImagePath,
  getCollectionImageSrcSet,
  type CollectionImage
} from '@monorepo/shared-assets';
```

## 🖼️ Basic Image Usage

### Simple Image

```tsx
function JacketsHero() {
  return (
    <div className="hero-banner">
      <img 
        src={CollectionImages.jackets.path} 
        alt={CollectionImages.jackets.alt}
        className="w-full h-auto"
      />
      <div className="overlay">
        <h1>{CollectionImages.jackets.title}</h1>
        <p>{CollectionImages.jackets.subtitle}</p>
      </div>
    </div>
  );
}
```

### With WebP Support (Picture Element)

```tsx
function WinterHero() {
  return (
    <picture>
      <source 
        srcSet={CollectionImages.winter.webp} 
        type="image/webp" 
      />
      <img 
        src={CollectionImages.winter.path} 
        alt={CollectionImages.winter.alt}
        className="w-full h-auto object-cover"
      />
    </picture>
  );
}
```

### Using Helper Function

```tsx
function GlassesPromo() {
  const imagePath = getCollectionImagePath(CollectionImages.glasses, true); // true = prefer WebP
  
  return (
    <div 
      className="promo-card"
      style={{ backgroundImage: `url(${imagePath})` }}
    >
      <h2>{CollectionImages.glasses.title}</h2>
      <p>{CollectionImages.glasses.subtitle}</p>
    </div>
  );
}
```

## 🎠 Carousel/Slider Example

```tsx
import { allCollections } from '@monorepo/shared-assets';
import { useState } from 'react';

function CollectionCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = allCollections[currentIndex];

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % allCollections.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + allCollections.length) % allCollections.length);
  };

  return (
    <div className="carousel">
      <picture>
        <source srcSet={current.webp} type="image/webp" />
        <img 
          src={current.path} 
          alt={current.alt}
          className="carousel-image"
        />
      </picture>
      
      <div className="carousel-content">
        <h1>{current.title}</h1>
        <p>{current.subtitle}</p>
      </div>

      <button onClick={prev}>Previous</button>
      <button onClick={next}>Next</button>

      {/* Indicators */}
      <div className="indicators">
        {allCollections.map((_, idx) => (
          <button
            key={idx}
            className={idx === currentIndex ? 'active' : ''}
            onClick={() => setCurrentIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
}
```

## 🎨 Grid Gallery Example

```tsx
import { allCollections } from '@monorepo/shared-assets';

function CollectionGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {allCollections.map((collection, index) => (
        <div 
          key={index} 
          className="relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-shadow cursor-pointer"
        >
          <picture>
            <source srcSet={collection.webp} type="image/webp" />
            <img 
              src={collection.path} 
              alt={collection.alt}
              className="w-full h-96 object-cover"
            />
          </picture>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6 text-white">
            <h2 className="text-3xl font-bold mb-2">{collection.title}</h2>
            <p className="text-sm opacity-90">{collection.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## 🎭 Hero Banner with Overlay

```tsx
function HeroSection() {
  const featured = CollectionImages.summer;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <picture>
        <source srcSet={featured.webp} type="image/webp" />
        <img 
          src={featured.path} 
          alt={featured.alt}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </picture>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full text-white text-center px-4">
        <div className="max-w-4xl">
          <h1 className="text-6xl font-bold mb-4 uppercase tracking-wider">
            {featured.title}
          </h1>
          <p className="text-2xl mb-8">{featured.subtitle}</p>
          <button className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors">
            Shop Now
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 🔄 Lazy Loading Example

```tsx
import { CollectionImages } from '@monorepo/shared-assets';
import { useState, useEffect, useRef } from 'react';

function LazyImage({ collection }: { collection: CollectionImage }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="relative bg-gray-200 min-h-[400px]">
      {isInView && (
        <picture>
          <source srcSet={collection.webp} type="image/webp" />
          <img 
            src={collection.path} 
            alt={collection.alt}
            onLoad={() => setIsLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </picture>
      )}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      )}
    </div>
  );
}
```

## 🎯 TypeScript Type Safety

```tsx
import type { CollectionImage } from '@monorepo/shared-assets';

interface CollectionCardProps {
  collection: CollectionImage;
  onShopClick?: () => void;
}

function CollectionCard({ collection, onShopClick }: CollectionCardProps) {
  return (
    <div className="card">
      <picture>
        <source srcSet={collection.webp} type="image/webp" />
        <img src={collection.path} alt={collection.alt} />
      </picture>
      <h3>{collection.title}</h3>
      <p>{collection.subtitle}</p>
      <button onClick={onShopClick}>Shop Collection</button>
    </div>
  );
}
```

## 📱 Responsive Image Sizes

```tsx
function ResponsiveHero() {
  return (
    <picture>
      <source 
        media="(min-width: 1280px)" 
        srcSet={CollectionImages.jackets.webp} 
        type="image/webp" 
      />
      <source 
        media="(min-width: 768px)" 
        srcSet={CollectionImages.jackets.webp} 
        type="image/webp" 
      />
      <img 
        src={CollectionImages.jackets.path} 
        alt={CollectionImages.jackets.alt}
        className="w-full h-auto"
        loading="lazy"
      />
    </picture>
  );
}
```

