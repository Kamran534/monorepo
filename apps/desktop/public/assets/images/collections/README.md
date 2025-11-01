# Collection Images for Desktop App

## 📥 Required Images

Place the following images in this directory:

1. `jackets-collection.jpg` (and `.webp`)
2. `winter-collection.jpg` (and `.webp`)
3. `summer-escape.jpg` (and `.webp`)
4. `glasses-collection.jpg` (and `.webp`)

## 📋 Source

Copy images from: `libs/shared/assets/images/collections/`

## 🔧 Quick Setup (Windows PowerShell)

```powershell
# From project root
Copy-Item libs/shared/assets/images/collections/*.jpg apps/desktop/public/assets/images/collections/
Copy-Item libs/shared/assets/images/collections/*.webp apps/desktop/public/assets/images/collections/
```

## 🔧 Quick Setup (Linux/Mac)

```bash
# From project root
cp libs/shared/assets/images/collections/*.jpg apps/desktop/public/assets/images/collections/
cp libs/shared/assets/images/collections/*.webp apps/desktop/public/assets/images/collections/
```

## 📚 Usage

Import in your React components:

```typescript
import { CollectionImages } from '@monorepo/shared-assets';

<img src={CollectionImages.winter.path} alt={CollectionImages.winter.alt} />
```

The paths are relative to the public directory: `/assets/images/collections/`

## 🔄 Build Process

These images will be bundled with the Electron app during the build process.

