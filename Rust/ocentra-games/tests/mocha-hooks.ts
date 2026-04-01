/**
 * Mocha Hooks - Automatically capture test results for report generation
 *
 * This file hooks into Mocha's test lifecycle to automatically record
 * test results in the report generator.
 *
 * Uses Mocha's root hooks (afterEach) to capture all test results.
 */

import { reportGenerator, type TestReportData } from './report-generator'

// Track test start times
const testStartTimes = new Map<string, number>()
// Track per-test logs
const testLogs = new Map<string, string[]>()
// Original console methods (to restore after each)
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
}

function attachConsoleCapture(key: string) {
  testLogs.set(key, [])
  const sink = testLogs.get(key)!
  const toLine = (args: unknown[]): string =>
    args
      .map(a => {
        if (typeof a === 'string') return a
        try {
          return JSON.stringify(a)
        } catch {
          return String(a)
        }
      })
      .join(' ')
  console.log = (...args: unknown[]) => {
    sink.push(toLine(args))
    originalConsole.log.apply(console, args)
  }
  console.info = (...args: unknown[]) => {
    sink.push(toLine(args))
    originalConsole.info.apply(console, args)
  }
  console.warn = (...args: unknown[]) => {
    sink.push(toLine(args))
    originalConsole.warn.apply(console, args)
  }
  console.error = (...args: unknown[]) => {
    sink.push(toLine(args))
    originalConsole.error.apply(console, args)
  }
}

function detachConsoleCapture() {
  console.log = originalConsole.log
  console.info = originalConsole.info
  console.warn = originalConsole.warn
  console.error = originalConsole.error
}

// Get suite name from test's parent chain
function getSuiteName(test: Mocha.Test): string {
  let current: Mocha.Suite | undefined = test.parent
  const suiteNames: string[] = []

  while (current) {
    if (current.title) {
      suiteNames.unshift(current.title)
    }
    current = current.parent
  }

  return suiteNames.join(' > ') || 'Unknown Suite'
}

// Hook into Mocha's root hooks
// These run for all tests automatically when Mocha is available
// Use a try-catch to handle cases where Mocha isn't loaded yet

try {
  // Access Mocha's root hooks via global
  const g = global as unknown as Record<string, unknown>
  type Hookable = {
    beforeEach?: (fn: (this: Mocha.Context) => void) => void
    afterEach?: (fn: (this: Mocha.Context) => void) => void
  }
  const mocha =
    (g.mocha as Hookable | undefined) || (g.Mocha as Hookable | undefined)

  if (mocha && typeof mocha.beforeEach === 'function') {
    mocha.beforeEach(function (this: Mocha.Context) {
      const test = this.currentTest
      if (test) {
        testStartTimes.set(test.fullTitle(), Date.now())
        attachConsoleCapture(test.fullTitle())
      }
    })
  }

  if (mocha && typeof mocha.afterEach === 'function') {
    mocha.afterEach(function (this: Mocha.Context) {
      const test = this.currentTest
      if (!test) return

      const testKey = test.fullTitle()
      const startTime = testStartTimes.get(testKey) || Date.now()
      const duration = Date.now() - startTime
      testStartTimes.delete(testKey)
      const logs = testLogs.get(testKey) || []
      testLogs.delete(testKey)
      detachConsoleCapture()

      // Determine status
      let status: 'passed' | 'failed' | 'skipped' = 'skipped'
      if (test.state === 'passed') {
        status = 'passed'
      } else if (test.state === 'failed') {
        status = 'failed'
      } else if (test.pending) {
        status = 'skipped'
      }

      const result: TestReportData = {
        suite: getSuiteName(test),
        test: test.title || 'Unknown Test',
        status,
        duration,
        logs,
        error: test.err
          ? {
              message: test.err.message || String(test.err),
              stack: test.err.stack,
            }
          : undefined,
      }

      reportGenerator.addResult(result)
      testLogs.delete(testKey)
    })
  }
} catch (err) {
  // Mocha might not be available yet - that's okay, hooks will be registered when tests run
  console.warn('[mocha-hooks] Could not register hooks immediately:', err)
}

// Also try to register hooks directly if they're available on global
const g2 = global as unknown as Record<string, unknown>
if (typeof g2.beforeEach === 'function') {
  ;(g2.beforeEach as (fn: (this: Mocha.Context) => void) => void)(function (
    this: Mocha.Context
  ) {
    const test = this.currentTest
    if (test) {
      testStartTimes.set(test.fullTitle(), Date.now())
      attachConsoleCapture(test.fullTitle())
    }
  })
}

if (typeof g2.afterEach === 'function') {
  ;(g2.afterEach as (fn: (this: Mocha.Context) => void) => void)(function (
    this: Mocha.Context
  ) {
    const test = this.currentTest
    if (!test) return

    const testKey = test.fullTitle()
    const startTime = testStartTimes.get(testKey) || Date.now()
    const duration = Date.now() - startTime
    testStartTimes.delete(testKey)
    const logs = testLogs.get(testKey) || []
    detachConsoleCapture()

    // Determine status
    let status: 'passed' | 'failed' | 'skipped' = 'skipped'
    if (test.state === 'passed') {
      status = 'passed'
    } else if (test.state === 'failed') {
      status = 'failed'
    } else if (test.pending) {
      status = 'skipped'
    }

    const result: TestReportData = {
      suite: getSuiteName(test),
      test: test.title || 'Unknown Test',
      status,
      duration,
      logs,
      error: test.err
        ? {
            message: test.err.message || String(test.err),
            stack: test.err.stack,
          }
        : undefined,
    }

    reportGenerator.addResult(result)
    testLogs.delete(testKey)
  })
}
