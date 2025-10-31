# PWA Setup for PayFlow

This PayFlow web application has been configured as a Progressive Web App (PWA) with offline support and installability.

## Features

✅ **Installable**: Users can install the app on their devices
✅ **Offline Support**: App works offline with cached resources
✅ **Auto-update**: Service worker automatically updates when new content is available
✅ **Optimized Caching**: Smart caching strategies for different resource types
✅ **Cross-platform**: Works on desktop, mobile, and tablets

## Configuration

The PWA is configured using `vite-plugin-pwa` in `vite.config.ts` with the following features:

### Caching Strategies

1. **CacheFirst** for:
   - Google Fonts (1 year cache)
   - Images (30 days cache)

2. **StaleWhileRevalidate** for:
   - JavaScript and CSS files

### Manifest

The app manifest is automatically generated with:
- App name: "PayFlow - Smart POS Solutions"
- Short name: "PayFlow"
- Theme color: #0891b2 (cyan-600)
- Background color: #f0f9ff (sky-50)
- Display mode: standalone
- PWA icons: 192x192 and 512x512

## Assets

PWA icons are located in `apps/web/public/` and are generated from the shared PayFlow logo:
- **Source**: `libs/shared/assets/src/images/logo.png` - Original PayFlow logo (shared across all apps)
- `pwa-192x192.png` - Small icon for Android (192x192)
- `pwa-512x512.png` - Large icon for Android (512x512)
- `apple-touch-icon.png` - iOS home screen icon (180x180)
- `favicon-32x32.png` - Standard favicon (32x32)
- `favicon-16x16.png` - Small favicon (16x16)

All icons are automatically resized from the shared logo to maintain consistent branding across all apps (web, desktop, mobile).

## Development

PWA features are enabled in development mode for testing. Run:

```bash
npm run start:web
# or
nx serve web
```

## Production Build

Build the app with PWA support:

```bash
npm run build:web
# or
nx build web
```

The service worker and manifest will be automatically generated during the build process.

## Testing PWA

1. **Local Development**: PWA features work in development mode at http://localhost:4200

2. **Production Preview**: Test the production build:
```bash
nx preview web
```

3. **Chrome DevTools**: Use Chrome DevTools > Application tab to:
   - Check service worker status
   - Test offline mode
   - Verify manifest
   - Simulate install prompt

## Installing the App

### Desktop (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Click the install icon in the address bar
3. Follow the installation prompts

### Mobile (Android)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Install app" or "Add to Home screen"

### Mobile (iOS)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

## Customization

### Update App Info
Edit the manifest in `apps/web/vite.config.ts`:

```typescript
manifest: {
  name: 'Your App Name',
  short_name: 'App',
  description: 'Your app description',
  theme_color: '#your-color',
  // ... other options
}
```

### Custom Icons
To update the app icons with a new logo:
1. Replace `logo.png` in `libs/shared/assets/src/images/` with your new logo (this updates it for ALL apps)
2. Regenerate all icon sizes by running:

```bash
# Generate all PWA icon sizes from shared logo
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/logo.png resize 1000 1000
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/pwa-192x192.png resize 192 192
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/pwa-512x512.png resize 512 512
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/apple-touch-icon.png resize 180 180
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/favicon-32x32.png resize 32 32
npx sharp-cli -i libs/shared/assets/src/images/logo.png -o apps/web/public/favicon-16x16.png resize 16 16

# Update desktop app icon
Copy-Item libs/shared/assets/src/images/logo.png -Destination apps/desktop/resources/icon.png

# Update mobile app icon
Copy-Item libs/shared/assets/src/images/logo.png -Destination apps/mobile/src/assets/logo.png
```

Or use the npm script (coming soon): `npm run update-icons`

Alternatively, you can use online tools:
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)

### Caching Strategy
Modify the `workbox.runtimeCaching` array in `vite.config.ts` to change caching behavior for different URL patterns.

## Service Worker Updates

The app automatically checks for updates. When a new version is available:
1. The service worker downloads the new version in the background
2. A confirmation dialog appears asking the user to reload
3. Upon confirmation, the new version is activated

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure you're using HTTPS (or localhost)
- Clear browser cache and reload

### Icons Not Showing
- Verify icon files exist in `apps/web/public/`
- Check manifest in DevTools > Application > Manifest
- Ensure correct file paths and sizes

### Offline Mode Not Working
- Check service worker status in DevTools
- Verify caching strategies in `vite.config.ts`
- Test by going offline in DevTools > Network > Offline

## Resources

- [Vite PWA Plugin Documentation](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

