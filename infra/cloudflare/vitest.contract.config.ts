import { defineConfig } from 'vitest/config';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    environment: 'node',
    include: ['tests/contracts/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    reporters: ['default', './test-runner/script/report/summary-reporter.ts'],
    outputFile: {
      json: './test-runner/ReportJson/test-results.json',
      text: './test-runner/logs/test-output-latest.txt',
    },
    testTimeout: 200000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
    },
  },
});
