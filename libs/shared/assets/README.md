# Shared Assets Library

This library contains shared assets (images, icons, logos, etc.) used across all applications in the monorepo.

## Structure

```
libs/shared/assets/
  └── src/
      └── images/
          ├── logo.png          # Main PayFlow logo
          └── [other images]
```

## Usage

### In Web App (Vite)
Copy assets during build or reference directly:

```typescript
// In vite.config.ts, assets are copied via nxCopyAssetsPlugin
// Reference in code:
import logo from '@monorepo/shared-assets/images/logo.png';
```

### In Desktop App (Electron)
Reference in renderer process:

```typescript
import logo from '../../../libs/shared/assets/src/images/logo.png';
```

### In Mobile App (React Native)
```typescript
import { Image } from 'react-native';

<Image source={require('../../../libs/shared/assets/src/images/logo.png')} />
```

## Adding New Assets

1. Place assets in the appropriate subdirectory under `src/`
2. Assets are automatically available to all apps in the monorepo
3. No build step required - assets are referenced directly

## Benefits

- **Single Source of Truth**: One logo, one location
- **Consistency**: All apps use the same branding assets
- **Easy Updates**: Update once, reflected everywhere
- **Version Control**: Track asset changes in one place

