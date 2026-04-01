import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { isMatchActive, isMatchFinalized } from '@/utils/match-state';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('isMatchActive: returns true for phase 0'), () => {
    logInfo('isMatchActive(0)', getStackTrace(), { phase: 0 }, LOG_TEST_OPERATIONS);
    expect(isMatchActive(0)).toBe(true);
  });

  it(testName('isMatchActive: returns true for phase 1'), () => {
    expect(isMatchActive(1)).toBe(true);
  });

  it(testName('isMatchActive: returns true for phase 2'), () => {
    expect(isMatchActive(2)).toBe(true);
  });

  it(testName('isMatchActive: returns false for phase 3 (finalized)'), () => {
    expect(isMatchActive(3)).toBe(false);
  });

  it(testName('isMatchActive: returns false for undefined phase'), () => {
    expect(isMatchActive(undefined)).toBe(false);
  });

  it(testName('isMatchFinalized: returns true for phase 3'), () => {
    logInfo('isMatchFinalized(3)', getStackTrace(), { phase: 3 }, LOG_TEST_RESPONSE_DETAILS);
    expect(isMatchFinalized(3)).toBe(true);
  });

  it(testName('isMatchFinalized: returns false for phase 0'), () => {
    expect(isMatchFinalized(0)).toBe(false);
  });

  it(testName('isMatchFinalized: returns false for phase 1'), () => {
    expect(isMatchFinalized(1)).toBe(false);
  });

  it(testName('isMatchFinalized: returns false for phase 2'), () => {
    expect(isMatchFinalized(2)).toBe(false);
  });

  it(testName('isMatchFinalized: returns false for undefined phase'), () => {
    expect(isMatchFinalized(undefined)).toBe(false);
  });
});
