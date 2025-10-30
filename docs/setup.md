### Project setup (based on this repository)

Run these from the repo root unless noted.

1) Install dependencies

```bash
npm install
npm --prefix apps/desktop install
```

2) Web app (`apps/web`)

```bash
# serve
nx serve web

# build
nx build web

# test and lint
nx test web
nx lint web
```

3) Mobile app (React Native, `apps/mobile`)

```bash
# start Metro / development
nx start mobile

# run on simulators/devices
nx run-ios mobile
nx run-android mobile

# build native bundles
nx build-ios mobile
nx build-android mobile
```

4) Desktop app (Electron + Vite, `desktop`)

Nx targets delegate to `apps/desktop/package.json` scripts.

```bash
# develop / start
nx run desktop:dev
nx run desktop:start

# build renderer/main bundles
nx run desktop:build
```

Optional Windows installers (run from repo root):

```bash
# build desktop first, then package
npm run make:desktop
npm run make:desktop:portable
npm run make:desktop:msi
```

Notes:

- Nx plugins are configured in `nx.json`; many targets are inferred from project files (e.g., Vite, React Native). No manual targets are defined for `web` and `mobile`.
- Desktop targets are defined in `apps/desktop/project.json` and call local npm scripts.


