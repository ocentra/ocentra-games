/**
 * Core Test System Exports
 *
 * Provides the foundation for all tests with enforced contracts and auto-registration.
 */

export * from './types'
export * from './base'
export * from './registry'
export { getTestRegistry } from './registry'
export { registerMochaTest, flushPendingTestsToMocha } from './test-decorator'
export { getAllRegisteredTests, getTestCount } from './loader'
