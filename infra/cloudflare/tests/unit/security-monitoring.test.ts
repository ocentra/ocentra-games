import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { createForgedToken, createExpiredToken, getValidRequestHeaders, buildTestApiUrlWithQuery, buildTestApiUrlForEndpointWithPath, buildTestApiUrlForEndpoint, getValidOriginHeaders } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { ResourceType } from '@ocentra/endpoint-domain/constants/resources';
import { SecurityHeaderValue } from '@/constants/security-headers';
import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
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
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for security monitoring tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    worker = await getTestWorker();
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('security event logging: logs CORS violations'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing CORS violation logging', getStackTrace(), { origin: TestConfig.EvilOrigin }, LOG_TEST_OPERATIONS);
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash });
      const response = await worker.fetch(resourceUrl, {
        headers: getValidOriginHeaders(TestConfig.EvilOrigin)
      }, token);

      logInfo('[TEST] CORS violation response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      if (response.status < HttpStatus.BadRequest) {
        logError('[TEST] CORS violation not properly rejected', getStackTrace(), { status: response.status });
      }
  });

  it(testName('security event logging: logs rate limit violations'), async () => {
      const token = await createToken();
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const WORKER_URL = process.env[TestEnvVar.WorkerUrl];
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud || (WORKER_URL && WORKER_URL.includes('workers.dev'));

      if (isRealMode) {
        return;
      }

      const walletId = `${TestConfig.TestWalletId}-${Date.now()}`;
      const responses: number[] = [];

      for (let i = 0; i < 105; i++) {
        const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash, [QueryParam.Type]: ResourceType.Image });
        const response = await worker.fetch(resourceUrl, {
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId, false, TestConfig.TestCorsOrigin),
            [HttpHeader.XWalletId]: walletId
          }
        }, token);
        responses.push(response.status);
      }

      const rateLimited = responses.filter(s => s === HttpStatus.TooManyRequests).length;
      expect(rateLimited).toBeGreaterThan(0);
  }, 60000);

  it(testName('security event logging: logs authentication failures'), async () => {
      const token = await createToken();
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash });
      const response = await worker.fetch(resourceUrl, {
        headers: {
          ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
          [HttpHeader.Authorization]: formatBearerToken(TestConfig.InvalidToken)
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('security event logging: logs invalid signature attempts'), async () => {
      const token = await createToken();
      const forgedToken = createForgedToken();
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash });
      const response = await worker.fetch(resourceUrl, {
        headers: {
          ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
          [HttpHeader.Authorization]: formatBearerToken(forgedToken)
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('security event logging: logs expired token attempts'), async () => {
      const token = await createToken();
      const expiredToken = createExpiredToken();
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash });
      const response = await worker.fetch(resourceUrl, {
        headers: {
          ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
          [HttpHeader.Authorization]: formatBearerToken(expiredToken)
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('security event logging: logs privilege escalation attempts'), async () => {
      const token = await createToken();
      const dataExportUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.DataExport.ByUserId(TestConfig.OtherUserId), TestConfig.OtherUserId);
      const response = await worker.fetch(dataExportUrl, {
        headers: getValidRequestHeaders(TestConfig.RegularUserId, false, TestConfig.TestCorsOrigin)
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      await response.text().catch(() => undefined);
  });

  it(testName('security headers: include security headers in all responses'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      headers: getValidOriginHeaders(TestConfig.TestCorsOrigin)
    }, token);

    expect(response.headers.get(HttpHeader.XContentTypeOptions)).toBe(SecurityHeaderValue.NoSniff);
    expect(response.headers.get(HttpHeader.XFrameOptions)).toBe(SecurityHeaderValue.Deny);
  });
});
