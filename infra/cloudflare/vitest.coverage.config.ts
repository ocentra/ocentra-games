/**
 * Coverage-only config. Runs logic tests in Node so Istanbul can collect coverage.
 * Used only by run-coverage.ts. Main tests use vitest.config.ts (Workers pool).
 */
import { defineConfig } from 'vitest/config';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/contracts/consumers/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      'tests/unit/auth.test.ts',
      'tests/unit/worker-helper.test.ts',
      'tests/contracts/providers/**',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './test-runner/coverage',
      clean: true,
      cleanOnRerun: true,
      reportOnFailure: true,
      include: [
        'src/logic/**/*.ts',
        'src/utils/**/*.ts',
        'src/constants/**/*.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/types.ts',
        'src/templates/**',
        'src/handlers/**',
        'node_modules/**',
        'dist/**',
        '.wrangler/**',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
    },
  },
});
