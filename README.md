# PayFlow Monorepo

This is an Nx-powered monorepo containing Web, Desktop, and Mobile applications for PayFlow, plus shared libraries.

### Apps
- **Web (`apps/web`)**: React + Vite PWA scaffold (tests/jest set up). Built output under `dist/apps/web`.
- **Desktop (`apps/desktop`)**: Electron app using electron-vite. Windows installers produced in `apps/desktop/release`.
- **Mobile (`apps/mobile`)**: React Native app with iOS and Android native projects, Tailwind via NativeWind.

### Shared Libraries
- **`libs/shared/hooks/scanner`**: Barcode scanner React hook and component. See `README.md` and `VISUAL_GUIDE.md` inside.
- **`libs/shared/assets`**: Shared images/assets with `USAGE.md`.

## Getting started

Prerequisites: Node 18+.

Install dependencies at the repo root:

```sh
npm ci
```

## Running apps

Desktop (Electron):

```sh
npm run start              # alias for nx run desktop:dev
# or
npm run start:desktop      # alias for nx run desktop:start
```

Web (Vite + React):

```sh
npm run start:web          # nx serve web
```

Mobile (React Native):

```sh
npm run start:mobile       # starts Metro / RN dev server
npm run mobile:android     # run on Android emulator/device
npm run mobile:ios         # run on iOS simulator (macOS required)
```

## Building

Desktop build and packaging:

```sh
npm run build:desktop      # builds Electron app (electron-vite)
npm run make:desktop       # build Windows installer (NSIS)
npm run make:desktop:portable
npm run make:desktop:msi
```

Web build:

```sh
npm run build:web          # outputs to dist/apps/web
```

Mobile builds (via Nx React Native plugin):

```sh
npm run build:android-mobile
npm run build:ios-mobile
```

## Repository structure

```
apps/
  web/        # Vite + React PWA
  desktop/    # Electron (electron-vite, electron-builder)
  mobile/     # React Native (iOS/Android)
libs/
  shared/
    hooks/scanner/  # Barcode scanner hook/component + docs
    assets/         # Shared images/assets
docs/               # Setup and PWA notes
```

## Progress so far

- Desktop app builds and produces Windows installers under `apps/desktop/release` (e.g., `PayFlow Setup 0.0.1.exe`).
- Web app scaffolded with PWA assets; production build artifacts are in `dist/apps/web`.
- Mobile app scaffolded with Android and iOS projects; RN dev scripts wired in root `package.json`.
- Shared barcode scanner hook available with integration docs in `libs/shared/hooks/scanner`.
- Shared assets library created with usage guide.

## Useful scripts

```sh
npm run update-icons  # sync/update app icons (script in scripts/update-icons.js)
```

## Notes

This workspace uses Nx 22 and Vite 7 at the root. For the full project graph, run:

```sh
npx nx graph
```
