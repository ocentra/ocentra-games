// Cluster detection utilities - applies to all games
// Note: Cannot import from setup.ts here to avoid circular dependency
// This file should be imported after setup.ts in the dependency chain

// Import provider lazily to avoid circular dependency
let _provider: ReturnType<typeof require> | null = null
function getProvider() {
  if (!_provider) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _provider = require('./setup').provider
  }
  return _provider
}

// Detect cluster type for conditional test execution
export const isLocalnet = (): boolean => {
  const cluster = getProvider().connection.rpcEndpoint
  return (
    cluster.includes('localhost') ||
    cluster.includes('127.0.0.1') ||
    cluster.includes('localnet')
  )
}

export const isDevnet = (): boolean => {
  const cluster = getProvider().connection.rpcEndpoint
  return cluster.includes('devnet') || cluster.includes('api.devnet.solana.com')
}

export const isMainnet = (): boolean => {
  const cluster = getProvider().connection.rpcEndpoint
  return (
    cluster.includes('mainnet') ||
    cluster.includes('api.mainnet-beta.solana.com')
  )
}

// Test execution flags - can be controlled via environment variables
// Note: Some flags use lazy evaluation to avoid circular dependency with provider setup
export const TEST_FLAGS = {
  // SIMPLE MODE: Only run basic tests (skip complex setup)
  // Set SIMPLE_TESTS=true to run only simple.test.ts
  SIMPLE_MODE: process.env.SIMPLE_TESTS === 'true',

  // Skip expensive tests on devnet (can be overridden with env var)
  SKIP_EXPENSIVE_ON_DEVNET: process.env.SKIP_EXPENSIVE_TESTS !== 'false',

  // Run stress tests (default: only on localnet) - lazy evaluated
  get RUN_STRESS_TESTS(): boolean {
    return process.env.RUN_STRESS_TESTS === 'true' || isLocalnet()
  },

  // Run comprehensive error tests (default: only on localnet) - lazy evaluated
  get RUN_COMPREHENSIVE_ERROR_TESTS(): boolean {
    return process.env.RUN_ERROR_TESTS === 'true' || isLocalnet()
  },

  // Force all tests (override all flags)
  FORCE_ALL_TESTS: process.env.FORCE_ALL_TESTS === 'true',
}

// Helper to check if test should run - ONLY skip on devnet for rate limiting
// On localnet, all tests run. On devnet, skip stress/expensive tests by default.
export const shouldRunTest = (
  testType: 'stress' | 'error' | 'expensive' = 'expensive'
): boolean => {
  if (TEST_FLAGS.FORCE_ALL_TESTS) return true

  // Always run on localnet
  if (isLocalnet()) return true

  // On devnet: skip stress/error tests by default (rate limiting), but allow override
  if (isDevnet()) {
    switch (testType) {
      case 'stress':
        // Only skip if not explicitly enabled
        return (
          TEST_FLAGS.RUN_STRESS_TESTS || process.env.RUN_STRESS_TESTS === 'true'
        )
      case 'error':
        // Only skip if not explicitly enabled
        return (
          TEST_FLAGS.RUN_COMPREHENSIVE_ERROR_TESTS ||
          process.env.RUN_ERROR_TESTS === 'true'
        )
      case 'expensive':
        // Skip expensive tests on devnet unless explicitly enabled
        return (
          !TEST_FLAGS.SKIP_EXPENSIVE_ON_DEVNET ||
          process.env.SKIP_EXPENSIVE_TESTS === 'false'
        )
      default:
        return true // Default: run all tests
    }
  }

  // Mainnet: skip all expensive tests
  return false
}

// Helper to conditionally skip test suites - ONLY for devnet rate limiting
// On localnet, all tests run. On devnet, skip only stress/expensive tests unless forced.
export const conditionalDescribe = (
  name: string,
  fn: (this: Mocha.Suite) => void
): void => {
  // Always run on localnet
  if (isLocalnet()) {
    describe(name, fn)
    return
  }

  // On devnet: only skip if SIMPLE_MODE is explicitly set
  // (This allows running full test suite on devnet if needed)
  if (TEST_FLAGS.SIMPLE_MODE && !TEST_FLAGS.FORCE_ALL_TESTS) {
    describe.skip(name, fn)
  } else {
    describe(name, fn)
  }
}
