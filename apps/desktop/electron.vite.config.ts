import { defineConfig } from 'electron-vite';
import { resolve } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/main.ts')
      },
      outDir: 'dist/main'
    },
    plugins: [tsconfigPaths({ root: resolve(__dirname, '../..') })]
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/preload.ts')
      },
      outDir: 'dist/preload'
    },
    plugins: [tsconfigPaths({ root: resolve(__dirname, '../..') })]
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: resolve(__dirname, 'dist/renderer')
    },
    plugins: [tsconfigPaths({ root: resolve(__dirname, '../..') })]
  }
});
