import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './', // relative path for Electron file:// protocol in production
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@rs-inventory/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
//# sourceMappingURL=vite.config.js.map