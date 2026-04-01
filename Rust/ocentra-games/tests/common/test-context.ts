// Test context utilities - applies to all games

import { PublicKey } from '@solana/web3.js'

/**
 * Test Context Helper - Provides meaningful IDs and logging for tests
 * Use this to log test context so errors are actionable
 */
export class TestContext {
  private testName: string
  private context: Map<string, string> = new Map()

  constructor(testName: string) {
    this.testName = testName
    this.log(`[TEST] Starting: ${testName}`)
  }

  set(key: string, value: string | PublicKey | number | boolean): void {
    const strValue =
      value instanceof PublicKey ? value.toString() : String(value)
    this.context.set(key, strValue)
    this.log(`[TEST] ${key}: ${strValue}`)
  }

  get(key: string): string | undefined {
    return this.context.get(key)
  }

  log(message: string): void {
    console.log(`[${this.testName}] ${message}`)
  }

  error(message: string, error?: unknown): never {
    const contextStr = Array.from(this.context.entries())
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')

    const errorMsg = error instanceof Error ? error.message : String(error)
    const fullMessage = `[${this.testName}] ${message}\nContext:\n${contextStr}\nError: ${errorMsg}`

    console.error(fullMessage)
    throw new Error(fullMessage)
  }

  expect(condition: boolean, message: string): void {
    if (!condition) {
      this.error(`Assertion failed: ${message}`)
    }
  }

  finish(): void {
    this.log(`[TEST] Completed: ${this.testName}`)
  }
}

/**
 * Helper to create a test context with common setup
 */
export const createTestContext = (testName: string): TestContext => {
  return new TestContext(testName)
}
