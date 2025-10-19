import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts', 'api/**/*.spec.ts', 'api/**/*.spec.js'],
    isolate: false,
    pool: 'threads',
    poolOptions: {
      threads: { minThreads: 1, maxThreads: 1 },
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage/unit',
      include: ['api/**/*.ts'],
      exclude: ['api/**/*.spec.ts', 'api/migrations/**', 'api/types/**', 'api/openapi.ts', 'api/knexfile.*'],
      all: true,
      thresholds: {
        statements: 0.8,
        branches: 0.8,
        functions: 0.8,
        lines: 0.8,
      },
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
