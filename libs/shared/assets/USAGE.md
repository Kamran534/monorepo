# Shared Assets Usage Guide

This guide explains how to use shared assets (logos, images, icons) across all applications in the monorepo.

## 📁 Structure

```
libs/shared/assets/
  └── src/
      └── images/
          └── logo.png    # PayFlow logo - source of truth
```

## 🎯 Usage by App

### Web App (React + Vite)

The web app uses the logo for PWA icons. Icons are generated and stored in `apps/web/public/`:

```typescript
// In component
import logo from '/logo.png';

function Header() {
  return <img src={logo} alt="PayFlow" />;
}
```

### Desktop App (Electron)

The desktop app uses the logo as the application icon (shown in taskbar, title bar, installer).

**Icon location**: `apps/desktop/resources/icon.png`

**Configuration**: Set in `apps/desktop/package.json`:
```json
"build": {
  "win": { "icon": "resources/icon.png" },
  "mac": { "icon": "resources/icon.png" },
  "linux": { "icon": "resources/icon.png" }
}
```

In renderer process (React):
```typescript
// Import from shared location
const logo = '../../../libs/shared/assets/src/images/logo.png';
```

### Mobile App (React Native)

The mobile app uses the logo in the app UI.

**Icon location**: `apps/mobile/src/assets/logo.png`

```typescript
import { Image } from 'react-native';

<Image 
  source={require('../assets/logo.png')} 
  style={{ width: 200, height: 200 }}
/>
```

## 🔄 Updating Icons

When you update the shared logo, regenerate all app icons:

### Quick Update (Recommended)
```bash
npm run update-icons
```

This script automatically:
- Generates all PWA icon sizes for web app
- Copies icon to desktop app resources
- Copies icon to mobile app assets

### Manual Update

#### Update Shared Logo
1. Replace `libs/shared/assets/src/images/logo.png` with new logo

#### Regenerate Web PWA Icons
```bash
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/logo.png resize 1000 1000
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/pwa-192x192.png resize 192 192
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/pwa-512x512.png resize 512 512
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/apple-touch-icon.png resize 180 180
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/favicon-32x32.png resize 32 32
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/favicon-16x16.png resize 16 16
```

#### Copy to Desktop
```bash
Copy-Item libs/shared/assets/src/images/logo.png -Destination apps/desktop/resources/icon.png
```

#### Copy to Mobile
```bash
Copy-Item libs/shared/assets/src/images/logo.png -Destination apps/mobile/src/assets/logo.png
```

## ✨ Benefits of Shared Assets

1. **Single Source of Truth**: One logo file for the entire monorepo
2. **Consistency**: All apps use the same branding
3. **Easy Maintenance**: Update once, propagate everywhere
4. **Version Control**: Track asset changes in one place
5. **Reduced Duplication**: No multiple copies of the same asset

## 📝 Adding New Shared Assets

To add new shared assets:

1. Add the asset to `libs/shared/assets/src/images/` (or create new subdirectories)
2. Update this documentation
3. Add to the update script if needed
4. Commit to version control

## 🎨 Asset Requirements

### Logo Requirements
- **Format**: PNG with transparency
- **Recommended Size**: At least 1024x1024px
- **Aspect Ratio**: Square (1:1)
- **Color Mode**: RGBA
- **Purpose**: Used for all app icons and branding

### General Guidelines
- Use web-friendly formats (PNG, SVG, WEBP)
- Optimize images before adding to repository
- Use descriptive filenames
- Include proper attribution in README if using third-party assets

## 🔗 Related Documentation

- [Web PWA Setup](../../apps/web/PWA_README.md)
- [Shared Assets README](./README.md)
- [Update Icons Script](../../scripts/update-icons.js)

