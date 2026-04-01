/**
 * Mocha Root Hooks - Automatically capture test results and console logs
 *
 * This file uses Mocha's root hooks API to capture all test results.
 * Root hooks run for all tests automatically.
 *
 * Usage: This file is loaded via --require flag in Anchor.toml
 */

import { reportGenerator, type TestReportData } from './report-generator'
// Load test system to ensure registry is ready
import '@/core'
// Import flush function to ensure pending tests are converted to Mocha suites
import { flushPendingTestsToMocha } from '@/core'

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

// Register root hooks - these run for ALL tests
// Mocha will call these automatically when tests run

// Flush pending tests when Mocha root hooks are registered
// This ensures all test files loaded by Mocha have their suites created
// We use a delayed flush to catch tests loaded after this hook
if (typeof describe === 'function' && typeof it === 'function') {
  // Mocha is available - flush any pending tests immediately
  flushPendingTestsToMocha()

  // Also set up delayed flush to catch tests loaded asynchronously
  if (typeof setTimeout !== 'undefined') {
    setTimeout(() => {
      flushPendingTestsToMocha()
    }, 0)

    // Defensive flush after a short delay
    setTimeout(() => {
      flushPendingTestsToMocha()
    }, 100)
  }
}

export const mochaHooks = {
  beforeEach(this: Mocha.Context) {
    const test = this.currentTest
    if (test) {
      const testKey = test.fullTitle()
      testStartTimes.set(testKey, Date.now())
      attachConsoleCapture(testKey)
    }
  },

  afterEach(this: Mocha.Context) {
    const test = this.currentTest
    if (!test) {
      detachConsoleCapture()
      return
    }

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
  },
}
