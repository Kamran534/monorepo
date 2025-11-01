# Shared Assets Library

Central repository for all static assets (images, fonts, icons) shared across Web, Desktop, and Mobile applications.

## 📁 Directory Structure

```
libs/shared/assets/
├── images/
│   ├── collections/           # Collection banner images
│   │   ├── jackets-collection.jpg
│   │   ├── jackets-collection.webp
│   │   ├── winter-collection.jpg
│   │   ├── winter-collection.webp
│   │   ├── summer-escape.jpg
│   │   ├── summer-escape.webp
│   │   ├── glasses-collection.jpg
│   │   ├── glasses-collection.webp
│   │   └── README.md
│   └── index.ts              # TypeScript image constants
├── README.md                 # This file
├── SETUP.md                  # Setup instructions
└── USAGE_EXAMPLES.md         # Code examples
```

## 🚀 Quick Start

### 1. Import in Your Code

```typescript
import { CollectionImages, allCollections } from '@monorepo/shared-assets';
```

### 2. Use in React Components

```tsx
// Single image
<img 
  src={CollectionImages.jackets.path} 
  alt={CollectionImages.jackets.alt} 
/>

// All collections (carousel, grid)
{allCollections.map((collection) => (
  <img key={collection.title} src={collection.path} alt={collection.alt} />
))}
```

## 📦 Available Collections

### 1. Jackets Collection
- **Path**: `CollectionImages.jackets`
- **Title**: "JACKETS COLLECTION"
- **Style**: Urban, masculine, autumn/winter
- **Subject**: Man in black leather jacket with city bokeh background

### 2. Winter Collection
- **Path**: `CollectionImages.winter`
- **Title**: "WINTER COLLECTION"
- **Style**: Elegant, cozy, winter
- **Subject**: Woman in green coat with white scarf, snowy mountains

### 3. Summer Escape
- **Path**: `CollectionImages.summer`
- **Title**: "SUMMER ESCAPE"
- **Style**: Natural, bohemian, summery
- **Subject**: Woman in olive dress in wheat field

### 4. Glasses Collection
- **Path**: `CollectionImages.glasses`
- **Title**: "GLASSES COLLECTION"
- **Style**: Sophisticated, professional
- **Subject**: Woman with glasses, green coat, white scarf

## 🎨 Image Properties

Each collection image object contains:

```typescript
{
  path: string;        // JPEG file path
  webp: string;        // WebP file path
  alt: string;         // Accessibility text
  title: string;       // Collection title
  subtitle: string;    // Collection subtitle/description
}
```

## 🔧 Setup Instructions

### Step 1: Save Images

1. Save the 4 collection images to `libs/shared/assets/images/collections/`
2. Name them according to the README in that directory
3. Optionally create WebP versions for better performance

### Step 2: Copy to App Public Directories

**Windows PowerShell:**
```powershell
# From project root
Copy-Item libs/shared/assets/images/collections/*.* apps/web/public/assets/images/collections/
Copy-Item libs/shared/assets/images/collections/*.* apps/desktop/public/assets/images/collections/
```

**Linux/Mac:**
```bash
# From project root
cp libs/shared/assets/images/collections/*.* apps/web/public/assets/images/collections/
cp libs/shared/assets/images/collections/*.* apps/desktop/public/assets/images/collections/
```

See **SETUP.md** for detailed instructions.

## 💡 Helper Functions

### `getCollectionImagePath(collection, preferWebP?)`

Get image path with WebP preference:

```typescript
const imagePath = getCollectionImagePath(CollectionImages.winter, true);
// Returns WebP path if available and preferred, otherwise JPEG
```

### `getCollectionImageSrcSet(collection)`

Get srcset string for responsive images:

```typescript
const srcSet = getCollectionImageSrcSet(CollectionImages.summer);
// Returns: "path.jpg 1x, path.webp 1x"
```

### `allCollections`

Array of all collection images (useful for loops):

```typescript
allCollections.forEach((collection) => {
  console.log(collection.title);
});
```

## 📚 Documentation

- **SETUP.md** - Detailed setup and optimization instructions
- **USAGE_EXAMPLES.md** - Comprehensive code examples including:
  - Basic image usage
  - WebP support with Picture element
  - Carousel/slider implementation
  - Grid gallery
  - Hero banners with overlays
  - Lazy loading
  - TypeScript type safety

## 🎯 TypeScript Support

Full TypeScript type definitions included:

```typescript
import type { CollectionImage } from '@monorepo/shared-assets';

interface Props {
  collection: CollectionImage;
}
```

## ⚡ Performance Tips

1. **Use WebP format** - ~30% smaller than JPEG
2. **Lazy load images** - Load images as they enter viewport
3. **Compress before adding** - Target < 200KB per image
4. **Use responsive images** - Different sizes for different screens
5. **Consider CDN** - For production deployments

## 🔗 Path Aliases

The library is available via TypeScript path mapping:

```json
{
  "@monorepo/shared-assets": ["libs/shared/assets/images/index.ts"]
}
```

## 📱 Cross-Platform Usage

### Web App
Images served from `apps/web/public/assets/images/collections/`

### Desktop App (Electron)
Images bundled from `apps/desktop/public/assets/images/collections/`

### Mobile App (React Native)
Use same constants, configure Metro bundler for static assets

## 🤝 Contributing

When adding new images:

1. Add image files to `libs/shared/assets/images/[category]/`
2. Update `libs/shared/assets/images/index.ts` with new constants
3. Copy to app public directories
4. Update this README
5. Add usage examples to USAGE_EXAMPLES.md

## 📄 License

Part of the monorepo project. See root LICENSE file.
