import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.spec.ts', 'api/**/*.spec.ts', 'api/**/*.spec.js'],
    isolate: false,
    pool: 'threads',
    poolOptions: {
      threads: { minThreads: 1, maxThreads: 1 },
    },
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@domain': path.resolve(__dirname, 'src/app/domain'),
      '@application': path.resolve(__dirname, 'src/app/application'),
    },
  },
});
