/**
 * Vitest config for unit tests using threads pool (not pool-workers)
 * Use this to debug test discovery issues or when pool-workers has problems
 * Unstable: singleThread set to false for analysis (parallel); may see port clash or NDJSON/logger behavior differences.
 */
import { defineConfig } from 'vitest/config';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts', './tests/test-setup-threads.ts'],
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    reporters: ['default', './test-runner/script/report/summary-reporter.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    outputFile: {
      json: './test-runner/ReportJson/test-results-threads.json',
      text: './test-runner/logs/test-output-threads-latest.txt',
    },
    onConsoleLog() {
      return true;
    },
    testTimeout: 30000,
    hookTimeout: 60000,  // Standardized (was 90000, pool uses 30000)
    isolate: true,
    sequence: {
      shuffle: false,
    },
  },
  esbuild: {
    target: 'node18',
    sourcemap: false,
    logLevel: 'error',
    legalComments: 'none',
    treeShaking: false,
    format: 'esm',
    keepNames: false,
    minifyIdentifiers: false,
    minifySyntax: false,
    minifyWhitespace: false,
    platform: 'node',
  },
  build: {
    commonjsOptions: {
      include: []
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
      '@services/monitoring/MetricsCollector': path.resolve(__dirname, '../../src/services/monitoring/MetricsCollector.ts'),
      '@services': path.resolve(__dirname, '../../src/services')
    }
  }
});
