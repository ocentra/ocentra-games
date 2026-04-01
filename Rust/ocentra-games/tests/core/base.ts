/**
 * Base Test Class
 *
 * Provides base implementation for all tests with common functionality.
 * All tests should extend this class or implement ITest directly.
 */

import { expect } from 'chai'
import type { ITest, TestMetadata } from './types'
import { ClusterRequirement, TestCategory } from './types'
import { isLocalnet, isDevnet, shouldRunTest } from '@/common'
import { initializeTestAccounts, setupGameRegistry } from '@/helpers'
// Import registry from separate file to avoid circular dependencies
import { getTestRegistry } from './registry'

/**
 * Abstract base class for all tests
 * Provides common functionality and enforces the test contract
 */
export abstract class BaseTest implements ITest {
  protected metadata: TestMetadata

  constructor(metadata: TestMetadata) {
    this.metadata = metadata
    // Auto-register on construction
    getTestRegistry().register(this)
  }

  /**
   * Get test metadata (required by ITest)
   */
  getMetadata(): TestMetadata {
    return this.metadata
  }

  /**
   * Check if test should run on current cluster (required by ITest)
   */
  shouldRun(): boolean {
    const { tags } = this.metadata

    // Check cluster requirement
    if (tags.cluster === ClusterRequirement.LOCALNET_ONLY && !isLocalnet()) {
      return false
    }

    if (
      tags.cluster === ClusterRequirement.MAINNET_ONLY &&
      !isLocalnet() &&
      !isDevnet()
    ) {
      return false
    }

    // Check expensive flag for devnet
    if (isDevnet() && tags.expensive) {
      if (tags.category === TestCategory.STRESS) {
        return shouldRunTest('stress')
      }
      if (tags.category === TestCategory.ERRORS) {
        return shouldRunTest('error')
      }
      return shouldRunTest('expensive')
    }

    return true
  }

  /**
   * Default setup hook - can be overridden
   */
  async setup(): Promise<void> {
    if (this.metadata.tags.requiresSetup) {
      await initializeTestAccounts()
    }

    if (this.metadata.tags.requiresRegistry) {
      await setupGameRegistry()
    }
  }

  /**
   * Default teardown hook - can be overridden
   */
  async teardown(): Promise<void> {
    // Default: no teardown needed
  }

  /**
   * Run the test (must be implemented by subclasses)
   */
  abstract run(): Promise<void>

  /**
   * Helper to assert and throw meaningful errors
   */
  protected assert(condition: boolean, message: string): asserts condition {
    void expect(condition, message).to.be.true
  }

  /**
   * Helper to assert equality
   */
  protected assertEqual<T>(actual: T, expected: T, message?: string): void {
    expect(actual, message).to.equal(expected)
  }

  /**
   * Helper to assert not equal
   */
  protected assertNotEqual<T>(actual: T, expected: T, message?: string): void {
    expect(actual, message).to.not.equal(expected)
  }

  /**
   * Helper to assert truthy
   */
  protected assertTruthy<T>(
    value: T,
    message?: string
  ): asserts value is NonNullable<T> {
    void expect(value, message).to.be.ok
  }

  /**
   * Helper to assert falsy
   */
  protected assertFalsy(value: unknown, message?: string): void {
    void expect(value, message).to.be.not.ok
  }

  /**
   * Check if error has AnchorError shape (has error.errorCode.code)
   * This works for both real AnchorError instances and synthetic errors from normalizeAndRethrowAnchorError
   */
  protected isAnchorError(err: unknown): err is {
    error?: { errorCode?: { code?: string } }
    errorCode?: { code?: string }
  } {
    if (!err || typeof err !== 'object') {
      return false
    }
    const error = err as {
      error?: { errorCode?: { code?: string } }
      errorCode?: { code?: string }
    }
    return !!(error.error?.errorCode?.code || error.errorCode?.code)
  }

  /**
   * Get error code from an error (works for both real and synthetic AnchorErrors)
   */
  protected getErrorCode(err: unknown): string | undefined {
    if (!this.isAnchorError(err)) {
      return undefined
    }
    return (
      (
        err as {
          error?: { errorCode?: { code?: string } }
          errorCode?: { code?: string }
        }
      ).error?.errorCode?.code ||
      (err as { errorCode?: { code?: string } }).errorCode?.code
    )
  }
}
