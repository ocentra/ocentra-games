import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import {
  DEFAULT_PLAN_TIERS,
  getAllowanceRemaining,
  isPeriodExpired,
  type UserPlanState,
} from '@/config/plan-tiers';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function createPlanState(overrides?: Partial<UserPlanState>): UserPlanState {
  return {
    tier: 'pro',
    periodStart: Date.now(),
    tokensUsedThisPeriod: 0,
    ...overrides,
  };
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('isPeriodExpired: returns false before 30-day boundary'), () => {
    const periodStart = 1_700_000_000_000;
    const now = periodStart + PERIOD_MS - 1;
    expect(isPeriodExpired(periodStart, now)).toBe(false);
  });

  it(testName('isPeriodExpired: returns true at exact 30-day boundary'), () => {
    const periodStart = 1_700_000_000_000;
    const now = periodStart + PERIOD_MS;
    expect(isPeriodExpired(periodStart, now)).toBe(true);
  });

  it(testName('getAllowanceRemaining: returns full monthly allowance when period is expired'), () => {
    const state = createPlanState({
      periodStart: 1_700_000_000_000,
      tokensUsedThisPeriod: 55_000,
    });
    const now = state.periodStart + PERIOD_MS;
    const allowance = getAllowanceRemaining(state, DEFAULT_PLAN_TIERS.pro, now);

    expect(allowance).toBe(DEFAULT_PLAN_TIERS.pro.monthlyTokenAllowance);
  });

  it(testName('getAllowanceRemaining: returns allowance minus usage when period is active'), () => {
    const state = createPlanState({
      periodStart: Date.now() - 1_000,
      tokensUsedThisPeriod: 12_345,
    });
    const now = state.periodStart + 60_000;
    const allowance = getAllowanceRemaining(state, DEFAULT_PLAN_TIERS.pro, now);

    expect(allowance).toBe(DEFAULT_PLAN_TIERS.pro.monthlyTokenAllowance - 12_345);
  });

  it(testName('getAllowanceRemaining: clamps remaining allowance to zero when usage exceeds allowance'), () => {
    const state = createPlanState({
      periodStart: Date.now() - 1_000,
      tokensUsedThisPeriod: DEFAULT_PLAN_TIERS.free.monthlyTokenAllowance + 10_000,
      tier: 'free',
    });
    const now = state.periodStart + 60_000;
    const allowance = getAllowanceRemaining(state, DEFAULT_PLAN_TIERS.free, now);

    expect(allowance).toBe(0);
  });
});
