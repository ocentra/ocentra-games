
import { defineConfig } from 'vitest/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getE2EPhaseFiles } from './test-runner/script/lib/suite-type-map.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CWD = path.resolve(__dirname);
const { unstable: e2eUnstable } = getE2EPhaseFiles(CWD);

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts', './tests/test-setup-threads.ts'],
    include: ['tests/e2e/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    reporters: ['default', './test-runner/script/report/summary-reporter.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: e2eUnstable.length > 0,
      },
    },
    outputFile: {
      json: './test-runner/ReportJson/e2e-results-threads.json',
      text: './test-runner/logs/e2e-output-threads-latest.txt',
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
      '@services': path.resolve(__dirname, '../../src/services'),
    }
  }
});
