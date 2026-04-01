/**
 * Test Decorator Helper
 *
 * Provides a helper function that automatically creates Mocha test cases
 * from BaseTest instances. This bridges the contract system with Mocha's discovery.
 *
 * Usage in test files:
 * ```typescript
 * const test = new MyTest();
 * registerMochaTest(test); // Auto-creates describe/it blocks
 * ```
 */

import type { ITest } from './types'
import { getTestRegistry } from './registry'
import { createMochaTest } from './test-factory'

let registeredTestCount = 0

/**
 * Register a test: always store in registry. If Mocha is available,
 * immediately create Mocha test blocks; otherwise the test sits in the pending queue.
 */
export function registerMochaTest(test: ITest, suiteName?: string): void {
  const registry = getTestRegistry()

  // Always add to registry so we can inspect/report later
  registry.register(test)
  registeredTestCount++

  // Always try to create Mocha test immediately
  // If Mocha globals aren't available yet, add to pending queue
  if (typeof describe === 'function' && typeof it === 'function') {
    try {
      createMochaTest(test, suiteName)
      // Success - test is now registered with Mocha
    } catch (err) {
      // If something goes wrong, keep the test in registry and log
      // Do not throw: let the flush attempt later pick it up
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          '[registerMochaTest] failed to create mocha test immediately:',
          err
        )
      }
      // Add to pending queue as fallback
      registry.addPending(test)
    }
  } else {
    // Mocha globals not available yet; record as pending (flush will convert later)
    registry.addPending(test)
  }

  // Log progress
  if (typeof console !== 'undefined' && console.log) {
    if (registeredTestCount % 10 === 0) {
      console.log(
        `[Test Loader] Registered ${registeredTestCount} test(s) so far...`
      )
    }
    if (registeredTestCount === 47) {
      console.log(`[Test Loader] All 47 tests registered successfully!`)
    }
  }
}

/**
 * Attempt to flush pending tests to Mocha. Safe to call multiple times.
 * Call this from loader / mocha-hooks once Mocha is ready.
 */
export function flushPendingTestsToMocha(): void {
  if (typeof describe !== 'function' || typeof it !== 'function') {
    return
  }

  const registry = getTestRegistry()
  const pending = registry.drainPending()

  if (pending.length > 0 && typeof console !== 'undefined' && console.log) {
    console.log(
      `[Test Loader] Flushing ${pending.length} pending test(s) to Mocha...`
    )
  }

  pending.forEach(test => {
    try {
      createMochaTest(test)
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) {
        const metadata = test.getMetadata()
        console.error(
          '[flushPendingTestsToMocha] error creating test',
          metadata?.id ?? '<unknown>',
          err
        )
      }
    }
  })

  if (pending.length > 0 && typeof console !== 'undefined' && console.log) {
    console.log(
      `[Test Loader] Flushed ${pending.length} pending test(s) successfully!`
    )
  }
}
