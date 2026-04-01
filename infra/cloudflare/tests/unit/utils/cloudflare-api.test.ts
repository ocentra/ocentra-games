import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { getAnalyticsEngineSqlUrl } from '@/utils/cloudflare-api';
import { buildFullUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com';
const buildExpectedAnalyticsUrl = (accountId: string) => buildFullUrl(`/client/v4/accounts/${accountId}/analytics_engine/sql`, { baseUrl: CLOUDFLARE_API_BASE });

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;

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

  it(testName('getAnalyticsEngineSqlUrl: generates correct Analytics Engine SQL URL'), () => {
    logInfo('[TEST] Testing getAnalyticsEngineSqlUrl', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const accountId = 'test-account-id';
    const result = getAnalyticsEngineSqlUrl(accountId);
    expect(result).toBe(buildExpectedAnalyticsUrl(accountId));
    if (!result.includes(accountId) || !result.includes('/analytics_engine/sql')) {
      logError('[TEST] Analytics Engine SQL URL generation failed', getStackTrace(), { result, accountId });
    }
    logInfo('[TEST] Analytics Engine SQL URL validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('getAnalyticsEngineSqlUrl: handles different account IDs'), () => {
    const accountId = 'another-account-id';
    const result = getAnalyticsEngineSqlUrl(accountId);
    expect(result).toBe(buildExpectedAnalyticsUrl(accountId));
  });

  it(testName('getAnalyticsEngineSqlUrl: includes correct API path'), () => {
    const accountId = 'test-account-id';
    const result = getAnalyticsEngineSqlUrl(accountId);
    expect(result).toContain('/client/v4/accounts/');
    expect(result).toContain('/analytics_engine/sql');
  });

  it(testName('getAnalyticsEngineSqlUrl: uses HTTPS protocol'), () => {
    const accountId = 'test-account-id';
    const result = getAnalyticsEngineSqlUrl(accountId);
    expect(result).toMatch(/^https:\/\//);
  });

  it(testName('getAnalyticsEngineSqlUrl: includes account ID in URL path'), () => {
    const accountId = 'my-account-123';
    const result = getAnalyticsEngineSqlUrl(accountId);
    expect(result).toContain(`/accounts/${accountId}/`);
  });
});
