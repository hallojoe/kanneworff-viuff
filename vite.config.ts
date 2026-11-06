import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/kanneworff-viuff/',
  build: { rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom', restoreMocks: true },
});
