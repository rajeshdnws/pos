import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';

const normalizePath = (p: string) => p.replace(/\\/g, '/');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // relative path for Electron file:// protocol in production
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    alias: [
      { find: '@', replacement: normalizePath(path.resolve(__dirname, './src')) },
      { find: /^@rs-inventory\/types$/, replacement: normalizePath(path.resolve(__dirname, '../../packages/types/src/index.ts')) },
      { find: /^@rs-inventory\/business$/, replacement: normalizePath(path.resolve(__dirname, '../../packages/business/src/browser.ts')) },
      { find: /^@rs-inventory\/database$/, replacement: normalizePath(path.resolve(__dirname, '../../packages/database/src/index.ts')) },
      { find: /^@rs-inventory\/printing$/, replacement: normalizePath(path.resolve(__dirname, '../../packages/printing/src/index.ts')) },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: ['..', '../..'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
