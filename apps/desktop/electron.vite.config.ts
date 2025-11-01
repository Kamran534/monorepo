import { defineConfig } from 'electron-vite';
import { resolve } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/main.ts'),
        external: ['better-sqlite3']
      },
      outDir: 'dist/main'
    },
    plugins: [tsconfigPaths({ root: resolve(__dirname, '../..') }) as any]
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/preload.ts')
      },
      outDir: 'dist/preload'
    },
    plugins: [tsconfigPaths({ root: resolve(__dirname, '../..') }) as any]
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      rollupOptions: {
        external: ['react-native', 'react-native-sqlite-storage']
      }
    },
    optimizeDeps: {
      exclude: ['react-native', 'react-native-sqlite-storage']
    },
    plugins: [tsconfigPaths({ root: resolve(__dirname, '../..') }) as any]
  }
});
