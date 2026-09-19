import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@rs-inventory/types': path.resolve(__dirname, './packages/types/src/index.ts'),
      '@rs-inventory/database': path.resolve(__dirname, './packages/database/src/index.ts'),
      '@rs-inventory/business': path.resolve(__dirname, './packages/business/src/index.ts'),
      '@rs-inventory/printing': path.resolve(__dirname, './packages/printing/src/index.ts'),
    },
  },
});
