
/**
 * Asserts that test context has valid suitePath and suiteType (no empty/unknown).
 * Run with threads config to see the fix: context is thread-isolated via ALS, so no "unknown" log filing.
 * Example: npx vitest run tests/unit/suite-context.test.ts --config vitest.unit-threads.config.ts
 * Or: npm run test:unit:threads:helper -- --run tests/unit/suite-context.test.ts
 */
import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { getCurrentContext } from '@tests/test-setup-core';
import { TestSuiteTypeValue } from '@ocentra/logging-domain/test-log/types';

const VALID_SUITE_TYPES: readonly string[] = Object.values(TestSuiteTypeValue);

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  it(testName('suite-context: has valid suitePath and suiteType (no unknown) when running in threads'), () => {
    const ctx = getCurrentContext();
    expect(ctx).not.toBeNull();
    expect(typeof ctx?.suitePath).toBe('string');
    expect(ctx?.suitePath).not.toBe('');
    expect(ctx?.suitePath).not.toBe('unknown');
    expect(typeof ctx?.suiteType).toBe('string');
    expect(VALID_SUITE_TYPES).toContain(ctx?.suiteType);
  });
});
