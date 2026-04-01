/**
 * Test Registry System
 *
 * Auto-discovers and registers all tests in the test suite.
 * Tests are registered automatically when they extend BaseTest.
 */

import type { ITest, TestCategory } from './types'

/**
 * Test Registry Singleton
 * Manages all registered tests and provides discovery capabilities
 */
export class TestRegistry {
  private static instance: TestRegistry
  private tests: Map<string, ITest> = new Map()
  private pending: ITest[] = []

  private constructor() {}

  static getInstance(): TestRegistry {
    if (!TestRegistry.instance) {
      TestRegistry.instance = new TestRegistry()
    }
    return TestRegistry.instance
  }

  /**
   * Register a test
   */
  register(test: ITest): void {
    const metadata = test.getMetadata()
    this.tests.set(metadata.id, test)

    // Capture file path from stack trace
    const stack = new Error().stack
    if (stack) {
      const lines = stack.split('\n')
      // Find the first line that's not from this file or base.ts
      for (const line of lines) {
        if (
          !line.includes('registry.ts') &&
          !line.includes('base.ts') &&
          line.includes('.test.ts')
        ) {
          const match = line.match(/\((.*\.test\.ts[^)]*)\)/)
          if (match) {
            metadata.filePath = match[1]
            break
          }
        }
      }
    }
  }

  /**
   * Get all registered tests
   */
  getAll(): ITest[] {
    return Array.from(this.tests.values())
  }

  /**
   * Get tests by category
   */
  getByCategory(category: TestCategory): ITest[] {
    return this.getAll().filter(t => t.getMetadata().tags.category === category)
  }

  /**
   * Get tests that should run on current cluster
   */
  getRunnable(): ITest[] {
    return this.getAll().filter(t => t.shouldRun())
  }

  /**
   * Get test by ID
   */
  getById(id: string): ITest | undefined {
    return this.tests.get(id)
  }

  /**
   * Get test count
   */
  getCount(): number {
    return this.tests.size
  }

  /**
   * Clear all registered tests (mainly for testing)
   */
  clear(): void {
    this.tests.clear()
    this.pending = []
  }

  /**
   * Add a test to the pending queue (when Mocha globals not available yet)
   */
  addPending(test: ITest): void {
    this.pending.push(test)
  }

  /**
   * Drain pending tests (returns and clears the queue)
   * Safe to call multiple times
   */
  drainPending(): ITest[] {
    const out = [...this.pending]
    this.pending = []
    return out
  }

  /**
   * Get count of pending tests
   */
  getPendingCount(): number {
    return this.pending.length
  }
}

/**
 * Export singleton instance getter
 */
export const getTestRegistry = () => TestRegistry.getInstance()
