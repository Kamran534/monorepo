# Collection Images for Web App

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
Copy-Item libs/shared/assets/images/collections/*.jpg apps/web/public/assets/images/collections/
Copy-Item libs/shared/assets/images/collections/*.webp apps/web/public/assets/images/collections/
```

## 🔧 Quick Setup (Linux/Mac)

```bash
# From project root
cp libs/shared/assets/images/collections/*.jpg apps/web/public/assets/images/collections/
cp libs/shared/assets/images/collections/*.webp apps/web/public/assets/images/collections/
```

## 📚 Usage

Import in your React components:

```typescript
import { CollectionImages } from '@monorepo/shared-assets';

<img src={CollectionImages.jackets.path} alt={CollectionImages.jackets.alt} />
```

The paths are relative to the public directory: `/assets/images/collections/`

