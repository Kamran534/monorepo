# Shared Assets Setup Guide

## 📁 Directory Structure

```
libs/shared/assets/
├── images/
│   ├── collections/
│   │   ├── jackets-collection.jpg
│   │   ├── jackets-collection.webp
│   │   ├── winter-collection.jpg
│   │   ├── winter-collection.webp
│   │   ├── summer-escape.jpg
│   │   ├── summer-escape.webp
│   │   ├── glasses-collection.jpg
│   │   └── glasses-collection.webp
│   └── index.ts (TypeScript constants)
└── SETUP.md (this file)
```

## 🖼️ Image Setup Instructions

### Step 1: Save the Collection Images

Save the 4 uploaded collection images to `libs/shared/assets/images/collections/` with these names:

1. **Jackets Collection** → `jackets-collection.jpg`
2. **Winter Collection** → `winter-collection.jpg`
3. **Summer Escape** → `summer-escape.jpg`
4. **Glasses Collection** → `glasses-collection.jpg`

### Step 2: Create WebP Versions (Optional but Recommended)

For better performance, create WebP versions of each image:

**Using online tools:**
- https://convertio.co/jpg-webp/
- https://cloudconvert.com/jpg-to-webp

**Using command line (if you have `cwebp` installed):**
```bash
cd libs/shared/assets/images/collections
cwebp -q 85 jackets-collection.jpg -o jackets-collection.webp
cwebp -q 85 winter-collection.jpg -o winter-collection.webp
cwebp -q 85 summer-escape.jpg -o summer-escape.webp
cwebp -q 85 glasses-collection.jpg -o glasses-collection.webp
```

### Step 3: Copy to App Public Directories

**For Web App:**
```bash
# Create directory
mkdir -p apps/web/public/assets/images/collections

# Copy images (Windows PowerShell)
Copy-Item libs/shared/assets/images/collections/*.jpg apps/web/public/assets/images/collections/
Copy-Item libs/shared/assets/images/collections/*.webp apps/web/public/assets/images/collections/

# Copy images (Linux/Mac)
cp libs/shared/assets/images/collections/*.jpg apps/web/public/assets/images/collections/
cp libs/shared/assets/images/collections/*.webp apps/web/public/assets/images/collections/
```

**For Desktop App:**
```bash
# Create directory
mkdir -p apps/desktop/public/assets/images/collections

# Copy images (Windows PowerShell)
Copy-Item libs/shared/assets/images/collections/*.jpg apps/desktop/public/assets/images/collections/
Copy-Item libs/shared/assets/images/collections/*.webp apps/desktop/public/assets/images/collections/

# Copy images (Linux/Mac)
cp libs/shared/assets/images/collections/*.jpg apps/desktop/public/assets/images/collections/
cp libs/shared/assets/images/collections/*.webp apps/desktop/public/assets/images/collections/
```

## 📦 Usage in Code

Import the image constants in your React components:

```typescript
import { CollectionImages, getCollectionImagePath } from '@monorepo/shared-assets';

// Basic usage
<img 
  src={CollectionImages.jackets.path} 
  alt={CollectionImages.jackets.alt}
/>

// With WebP support
<picture>
  <source 
    srcSet={CollectionImages.jackets.webp} 
    type="image/webp" 
  />
  <img 
    src={CollectionImages.jackets.path} 
    alt={CollectionImages.jackets.alt}
  />
</picture>

// Using helper function
<img 
  src={getCollectionImagePath(CollectionImages.winter)} 
  alt={CollectionImages.winter.alt}
/>

// Loop through all collections (e.g., carousel)
import { allCollections } from '@monorepo/shared-assets';

allCollections.map((collection) => (
  <div key={collection.title}>
    <img src={collection.path} alt={collection.alt} />
    <h2>{collection.title}</h2>
    <p>{collection.subtitle}</p>
  </div>
))
```

## 🎨 Recommended Image Specifications

- **Format**: JPEG for photos, WebP for better compression
- **Size**: 1920x1080 (landscape) or 1080x1080 (square)
- **Quality**: 80-85% for JPEG, 85% for WebP
- **File size**: Aim for < 200KB per image
- **Color profile**: sRGB

## ⚡ Optimization Tips

1. **Compress images** before adding them to the project
2. **Use WebP** format for ~30% smaller file sizes
3. **Provide multiple sizes** for responsive images if needed
4. **Lazy load** images below the fold
5. **Use CDN** for production deployment

## 🔄 Build Integration

The images will be automatically copied during the build process if placed in the `public/` directories of web and desktop apps.

For production, consider:
- Using a CDN (Cloudflare, AWS CloudFront)
- Image optimization pipeline
- Responsive image generation

