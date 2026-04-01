/**
 * Vitest config for integration tests using threads pool (unstable_dev).
 * By default runs ONLY unstable-only tests (from suite-type-map: runIn=unstable).
 * When VITEST_INTEGRATION_THREADS_EXPLICIT_FILES=1 (e.g. single-file run), allows any integration file.
 */
import { defineConfig } from 'vitest/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getUnstableIncludeFiles } from './test-runner/script/lib/suite-type-map.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CWD = path.resolve(__dirname);

const explicitFiles = process.env.VITEST_INTEGRATION_THREADS_EXPLICIT_FILES === '1';
const unstableFromMap = getUnstableIncludeFiles(CWD);
const include = explicitFiles
  ? ['tests/integration/**/*.test.ts', 'tests/e2e/**/*.test.ts']
  : unstableFromMap;

const runningUnstableOnly = !explicitFiles && unstableFromMap.length > 0;

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts', './tests/test-setup-threads.ts'],
    include,
    exclude: ['**/node_modules/**'],
    reporters: ['default', './test-runner/script/report/summary-reporter.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: runningUnstableOnly,
      },
    },
    outputFile: {
      json: './test-runner/ReportJson/integration-results-threads.json',
      text: './test-runner/logs/integration-output-threads-latest.txt',
    },
    onConsoleLog() {
      return true;
    },
    testTimeout: 70000,
    hookTimeout: 90000,
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
