import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/utils/__tests__/setup.ts'],
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/e2e/**', // Exclude Playwright E2E tests
          '**/*.e2e.spec.ts',
          // Exclude R2Service.e2e.test.ts from regular test runs (requires Worker to be running)
          // Run it explicitly with: npm run test:storage:e2e
          // Only exclude if not explicitly running E2E tests
          ...(process.argv.includes('R2Service.e2e.test.ts') ? [] : ['**/R2Service.e2e.test.ts']),
          // Conditionally exclude integration/load tests if SKIP_SOLANA_TESTS is set
          ...(process.env.SKIP_SOLANA_TESTS === 'true' ? [
            '**/integration/**',
            '**/load/**',
          ] : []),
        ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/__tests__/',
        '**/e2e/**',
        'scripts/',
        'Rust/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@lib': resolve(__dirname, './src/lib'),
      '@components': resolve(__dirname, './src/components'),
      '@utils': resolve(__dirname, './src/utils'),
      '@services': resolve(__dirname, './src/services'),
      '@providers': resolve(__dirname, './src/providers'),
      '@constants': resolve(__dirname, './src/constants'),
      '@types': resolve(__dirname, './src/types'),
      '@ui': resolve(__dirname, './src/ui'),
      '@config': resolve(__dirname, './src/config'),
      '@assets': resolve(__dirname, './src/assets'),
    },
  },
})