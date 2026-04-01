/**
 * Test Factory - Helper for creating Mocha tests with ITest contract
 *
 * Provides a factory function that creates Mocha test cases while enforcing
 * the ITest contract. This bridges the gap between our contract system and Mocha's
 * discovery mechanism.
 */

import type { ITest } from './types'

/**
 * Create a Mocha test case from an ITest implementation
 * This is called by each test file to register with Mocha
 */
export function createMochaTest(test: ITest, suiteName?: string): void {
  if (typeof it === 'undefined' || typeof describe === 'undefined') {
    // Mocha not available - test will be discovered when Mocha loads
    return
  }

  const metadata = test.getMetadata()
  const category = metadata.tags.category
  const game = metadata.tags.game
  // Build suite name: category > game (if applicable)
  const fullSuiteName = suiteName || (game ? `${category} > ${game}` : category)

  // Support filtering by TEST_ID environment variable
  const testIdFilter = typeof process !== 'undefined' && process.env?.TEST_ID
  if (testIdFilter && metadata.id !== testIdFilter) {
    // Skip this test if TEST_ID filter is set and doesn't match
    return
  }

  describe(fullSuiteName, function () {
    // Setup hook if needed
    if (metadata.tags.requiresSetup || metadata.tags.requiresRegistry) {
      before(async function () {
        if (test.setup) {
          await test.setup()
        }
      })
    }

    // Register as Mocha test
    it(metadata.name, async function () {
      // Skip if test shouldn't run
      if (!test.shouldRun()) {
        this.skip()
        return
      }

      // Run test-specific setup if provided
      if (test.setup) {
        await test.setup()
      }

      // Run the test
      await test.run()

      // Run test-specific teardown if provided
      if (test.teardown) {
        await test.teardown()
      }
    })
  })
}

/**
 * Decorator-style helper for test files
 * Usage: export const test = createTest(new MyTest());
 */
export function createTest(test: ITest, suiteName?: string): ITest {
  // Create Mocha test when this is called
  createMochaTest(test, suiteName)
  return test
}
