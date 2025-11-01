import { defineConfig } from 'electron-vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
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
    publicDir: resolve(__dirname, 'public'),
    base: './',
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
        external: ['react-native', 'react-native-sqlite-storage']
      }
    },
    resolve: {
      alias: {
        '@monorepo/shared-assets': resolve(__dirname, '../../libs/shared/assets/images/index.ts'),
      }
    },
    optimizeDeps: {
      exclude: ['react-native', 'react-native-sqlite-storage']
    },
    plugins: [
      react(),
      tsconfigPaths({ root: resolve(__dirname, '../..') }) as any
    ]
  }
});
