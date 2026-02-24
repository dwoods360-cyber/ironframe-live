import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // Keeps UI testing alive
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: [...configDefaults.exclude, 'tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // The GRC Threshold Gatekeeper
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
        // The Constitutional Override for Agent 3 Math:
        'core/irontrust/**/*.ts': {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100
        }
      },
      exclude: [
        'node_modules/',
        '.next/',
        'vitest.config.ts',
        'vitest.setup.ts',
        'tailwind.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
