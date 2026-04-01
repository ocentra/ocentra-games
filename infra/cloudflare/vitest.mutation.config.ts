import { defineConfig } from 'vitest/config';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/unit/badges.test.ts',
      'tests/unit/config/plan-tiers.test.ts',
      'tests/unit/logic/credits.test.ts',
      'tests/unit/logic/payment.test.ts',
      'tests/unit/logic/promo-redeem.test.ts',
    ],
    exclude: ['**/node_modules/**'],
    reporters: ['default'],
    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: true,
    sequence: {
      shuffle: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
      '@services/monitoring/MetricsCollector': path.resolve(
        __dirname,
        '../../src/services/monitoring/MetricsCollector.ts'
      ),
      '@services': path.resolve(__dirname, '../../src/services'),
    },
  },
});
