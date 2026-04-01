import { defineConfig } from 'vitest/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getUnstableIncludeFiles } from './test-runner/script/lib/suite-type-map.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const include = getUnstableIncludeFiles(__dirname);

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts', './tests/test-setup-threads.ts'],
    include,
    exclude: [
      '**/node_modules/**',
    ],
    reporters: ['default', './test-runner/script/report/summary-reporter.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: true,
    sequence: {
      shuffle: false,
    },
    outputFile: {
      json: './test-runner/ReportJson/test-results-unstable.json',
      text: './test-runner/logs/test-output-unstable-latest.txt',
    },
    onConsoleLog() {
      return true;
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
      '@services/monitoring/MetricsCollector': path.resolve(__dirname, '../../src/services/monitoring/MetricsCollector.ts'),
      '@services': path.resolve(__dirname, '../../src/services'),
    },
  },
});
