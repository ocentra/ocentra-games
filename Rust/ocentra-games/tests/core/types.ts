/**
 * Core Test Type Definitions
 *
 * Defines interfaces and types for the test system with enforced contracts.
 * All tests must implement ITest or extend BaseTest.
 */

/**
 * Test category classification
 */
export enum TestCategory {
  /** Basic setup and configuration tests */
  SETUP = 'setup',
  /** Game registry functionality */
  REGISTRY = 'registry',
  /** Match lifecycle (create, join, start, end) */
  LIFECYCLE = 'lifecycle',
  /** Game moves and actions */
  MOVES = 'moves',
  /** Error handling and edge cases */
  ERRORS = 'errors',
  /** Performance and stress tests */
  STRESS = 'stress',
  /** Game-specific tests */
  GAME_SPECIFIC = 'game-specific',
}

/**
 * Cluster requirements for test execution
 */
export enum ClusterRequirement {
  /** Test runs on any cluster */
  ANY = 'any',
  /** Test runs only on localnet */
  LOCALNET_ONLY = 'localnet-only',
  /** Test runs on localnet and devnet (with rate limiting) */
  DEVNET_ALLOWED = 'devnet-allowed',
  /** Test requires mainnet */
  MAINNET_ONLY = 'mainnet-only',
}

/**
 * Test tags for filtering and organization
 */
export interface TestTags {
  /** Test type classification */
  category: TestCategory
  /** Cluster requirements */
  cluster: ClusterRequirement
  /** Game-specific tags (e.g., 'claim', 'poker') */
  game?: string
  /** Additional tags for filtering */
  tags?: string[]
  /** Whether test is expensive (should skip on devnet by default) */
  expensive?: boolean
  /** Whether test requires setup */
  requiresSetup?: boolean
  /** Whether test requires game registry */
  requiresRegistry?: boolean
}

/**
 * Test metadata that must be provided by each test
 */
export interface TestMetadata {
  /** Unique test identifier (used in file names) */
  id: string
  /** Human-readable test name */
  name: string
  /** Test description */
  description: string
  /** Test tags */
  tags: TestTags
  /** Test file path (auto-populated by registry) */
  filePath?: string
}

/**
 * Test execution result
 */
export interface TestResult {
  /** Test metadata */
  metadata: TestMetadata
  /** Execution status */
  status: 'passed' | 'failed' | 'skipped'
  /** Execution duration in ms */
  duration: number
  /** Error message if failed */
  error?: string
  /** Stack trace if failed */
  stack?: string
  /** Captured logs */
  logs: string[]
}

/**
 * Test contract interface that all tests must implement
 */
export interface ITest {
  /** Get test metadata */
  getMetadata(): TestMetadata

  /** Run the test */
  run(): Promise<void>

  /** Check if test should run on current cluster */
  shouldRun(): boolean

  /** Setup hook (called before test) */
  setup?(): Promise<void>

  /** Teardown hook (called after test) */
  teardown?(): Promise<void>
}
