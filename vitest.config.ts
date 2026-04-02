import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { resolve } from 'path'
import { config } from 'dotenv'

export default defineConfig(({ mode = 'test' }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const envFile = config({ path: resolve(process.cwd(), '.env') })
  const finalEnv = { ...env, ...envFile.parsed }

  const r2WorkerUrl = finalEnv.VITE_R2_WORKER_URL || process.env.VITE_R2_WORKER_URL || ''
  const hasR2Config = Boolean(r2WorkerUrl)

  const skipLoadTests = finalEnv.SKIP_LOAD_TESTS === 'true' || process.env.SKIP_LOAD_TESTS === 'true'
  const skipSolanaTests = finalEnv.SKIP_SOLANA_TESTS === 'true' || process.env.SKIP_SOLANA_TESTS === 'true'
  const requestedLoadTest = process.argv.some(arg => arg.includes('/__tests__/load/') || arg.includes('\\__tests__\\load\\'))
  const requestedIntegrationTest = process.argv.some(arg => arg.includes('/__tests__/integration/') || arg.includes('\\__tests__\\integration\\'))
  const requestedStorageTest = process.argv.some(arg => /R2Service\.(hello|integration|e2e)\.test\.ts/.test(arg))

  const excludePatterns = [
    '**/node_modules/**',
    '**/.stryker-tmp/**',
    '**/.temp/**',
    '**/dist/**',
    'infra/**',
    'packages/**',
    '**/network-domain/e2e/**',
    '**/tests/load/**',
    '**/tests/e2e/**',
    '**/__tests__/e2e/**',
    '**/*.e2e.test.ts',
    '**/*.e2e.spec.ts',
    'Rust/**',
  ]

  if (skipLoadTests || !requestedLoadTest) {
    excludePatterns.push('**/__tests__/load/**')
  }

  if (skipSolanaTests || !requestedIntegrationTest) {
    excludePatterns.push('**/services/__tests__/integration/**')
  }

  if (!requestedStorageTest) {
    excludePatterns.push(
      '**/R2Service.hello.test.ts',
      '**/R2Service.integration.test.ts',
      '**/R2Service.e2e.test.ts',
    )
  } else if (!hasR2Config) {
    excludePatterns.push('**/R2Service.e2e.test.ts')
  }

  return {
    define: {
      'import.meta.env.VITE_R2_WORKER_URL': JSON.stringify(r2WorkerUrl),
      'import.meta.env.VITE_R2_BUCKET_NAME': JSON.stringify(finalEnv.VITE_R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME || 'claim-matches-test'),
      'import.meta.env.VITE_STORAGE_FALLBACK_FIREBASE': JSON.stringify(finalEnv.VITE_STORAGE_FALLBACK_FIREBASE || process.env.VITE_STORAGE_FALLBACK_FIREBASE || 'false'),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/utils/__tests__/setup.ts'],
      exclude: excludePatterns,
      reporter: ['verbose'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
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
        '@test-data': resolve(__dirname, './test-data/loaders'),
      },
    },
  }
})
