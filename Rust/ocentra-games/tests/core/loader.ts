/**
 * Test Loader - Auto-discovers and loads all tests
 *
 * This file is responsible for:
 * 1. Initializing the test registry
 * 2. Providing utilities for test discovery
 *
 * Note: Tests are auto-discovered by Mocha using the glob pattern in Anchor.toml.
 * When Mocha loads each test file, it executes the module code, which calls
 * registerMochaTest() to register the test with Mocha's describe/it blocks.
 *
 * This file is imported by root-hooks.ts to ensure the registry is ready.
 */

import { getTestRegistry } from './registry'
import type { ITest } from './types'
import { flushPendingTestsToMocha } from './test-decorator'

/**
 * Get all registered tests (for debugging/reporting)
 */
export function getAllRegisteredTests(): ITest[] {
  return getTestRegistry().getAll()
}

/**
 * Get test count (for reporting)
 */
export function getTestCount(): number {
  return getTestRegistry().getCount()
}

/**
 * Initialize test system when module loads
 * Note: Tests will be registered as Mocha discovers and loads them
 */
if (typeof console !== 'undefined' && console.log) {
  // Log will be updated after tests are loaded by Mocha
  console.log(
    `[Test Loader] Initialized (tests will register as Mocha discovers them)`
  )
}

// Try immediate flush (if Mocha already present)
try {
  flushPendingTestsToMocha()
} catch {
  // ignore - Mocha might not be ready yet
}

// Also attempt flush on next tick(s) - sometimes globals appear slightly later
if (typeof setTimeout !== 'undefined') {
  setTimeout(() => {
    try {
      flushPendingTestsToMocha()
    } catch {
      // ignore
    }
  }, 0)

  // Defensive second flush after 200ms for odd environments
  setTimeout(() => {
    try {
      flushPendingTestsToMocha()
    } catch {
      // ignore
    }
  }, 200)
}
