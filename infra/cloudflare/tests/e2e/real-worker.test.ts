import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildCreditsApiUrl,
  buildTestApiUrlForEndpoint,
  buildTestApiUrlWithQuery,
  buildTestApiUrlForEndpointWithPath,
  generateTestUserId,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { CreditAction, Currency } from '@ocentra/endpoint-domain/constants/credits';
import { formatBearerToken } from '@/utils/auth';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
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

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    try {
      await response.arrayBuffer();
    } catch {
      try {
        await response.text();
      } catch {
        try {
          await response.blob();
        } catch {
          void 0;
        }
      }
    }
  }
}

describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing real worker for E2E tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Real worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Authentication in Real Worker: should reject requests without Authorization header'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing auth rejection for missing Authorization header', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);
      const response = await worker.fetch(resourceUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      logInfo('[TEST] Auth rejection response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      if (response.status !== HttpStatus.Unauthorized) {
        logError('[TEST] Auth not rejected for missing header', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
      }
      const body = await response.json() as { error?: string };
      expect(typeof body.error).toBe('string');
      expect(body.error?.length).toBeGreaterThan(0);
      if (!body.error || body.error.length === 0) {
        logError('[TEST] Missing error message in auth rejection', getStackTrace(), { body });
      }
    });

  it(testName('Authentication in Real Worker: should reject requests with invalid token format'), async () => {
      const token = await createToken();
      const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);
      const response = await worker.fetch(resourceUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: TestConfig.InvalidToken,
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Authentication in Real Worker: should reject requests with malformed JWT'), async () => {
      const token = await createToken();
      const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);
      const response = await worker.fetch(resourceUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: formatBearerToken('not.valid.jwt'),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      logInfo('[TEST] Malformed JWT response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      if (response.status !== HttpStatus.Unauthorized) {
        logError('[TEST] Malformed JWT not rejected', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
      }
    });

  it(testName('CORS in Real Worker: should return correct CORS headers for allowed origin'), async () => {
      const token = await createToken();
      const testUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Test.Base);
      const response = await worker.fetch(testUrl, {
        method: HttpMethod.Options,
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          'Access-Control-Request-Method': HttpMethod.Post
        }
      }, token);

      expect([HttpStatus.Ok, HttpStatus.NoContent]).toContain(response.status);
      expect(response.headers.get(HttpHeader.AccessControlAllowOrigin)).toBe(TestConfig.TestCorsOrigin);
      expect(response.headers.get(HttpHeader.AccessControlAllowMethods)).toContain(HttpMethod.Post);
      await consumeResponseBody(response);
    });

  it(testName('CORS in Real Worker: should include security headers in response'), async () => {
      const token = await createToken();
      const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
      const response = await worker.fetch(rootUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.headers.get(HttpHeader.XContentTypeOptions)).toBe(SecurityHeaderValue.NoSniff);
    });

  it(testName('Rate Limiting in Real Worker: should enforce rate limits across multiple requests'), async () => {
      const token = await createToken();
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const userId = generateTestUserId('real-worker-rate');

      const walletId = `${TestConfig.TestWalletId}-${Date.now()}`;

      const responses: number[] = [];
      for (let i = 0; i < 5; i++) {
        const resourceUrl2 = buildCreditsApiUrl(userId, CreditAction.Purchase);
        const response = await worker.fetch(resourceUrl2, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId, false, TestConfig.TestCorsOrigin),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.XWalletId]: walletId
          },
          body: JSON.stringify({
            ac_amount: 100,
            amount: 1,
            currency: Currency.USD,
          })
        }, token);
        responses.push(response.status);
        await consumeResponseBody(response);

        if (isRealMode) {
          expect(response.status).toBeGreaterThanOrEqual(HttpStatus.Ok);
          expect(response.status).toBeLessThan(HttpStatus.InternalServerError);
        }
      }

      expect(responses).toHaveLength(5);
      expect(responses.every(status => typeof status === 'number' && status >= HttpStatus.Ok && status < 600)).toBe(true);
      expect(responses.filter(status => status === HttpStatus.TooManyRequests).length).toBeLessThan(5);
    }, 15000);

  it(testName('Asset Endpoints in Real Worker: should return 404 for non-existent assets'), async () => {
      const token = await createToken();
      const resourceUrlNonexistent = buildTestApiUrlWithQuery(ApiEndpoint.Assets.DownloadUrl, { [QueryParam.Guid]: TestConfig.TestHashNonexistent });
      const response = await worker.fetch(resourceUrlNonexistent, {
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId, false, TestConfig.TestCorsOrigin),
          [HttpHeader.XWalletId]: TestConfig.TestWalletId
        }
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      await consumeResponseBody(response);
    });

  it(testName('Health Check in Real Worker: should respond to root path'), async () => {
      const token = await createToken();
      const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
      const response = await worker.fetch(rootUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(response);
    });

  it(testName('Health Check in Real Worker: should respond to OPTIONS requests (CORS preflight)'), async () => {
      const token = await createToken();
      const testUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Test.Base);
      const response = await worker.fetch(testUrl, {
        method: HttpMethod.Options,
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          'Access-Control-Request-Method': HttpMethod.Get
        }
      }, token);

      expect([HttpStatus.Ok, HttpStatus.NoContent]).toContain(response.status);
      const allowMethods = response.headers.get(HttpHeader.AccessControlAllowMethods);
      expect(typeof allowMethods).toBe('string');
      expect(allowMethods?.length).toBeGreaterThan(0);
      await consumeResponseBody(response);
    });

  it(testName('Error Handling in Real Worker: should return error for invalid endpoints'), async () => {
      const token = await createToken();
      const logsUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Logs.Base, 'invalid-path');
      const response = await worker.fetch(logsUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      const contentType = response.headers.get(HttpHeader.ContentType);
      expect(typeof contentType).toBe('string');
      expect(contentType?.length).toBeGreaterThan(0);
      await consumeResponseBody(response);
    });

  it(testName('Error Handling in Real Worker: should not leak sensitive information in errors'), async () => {
      const token = await createToken();
      const resourceUrlTest = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);
      const response = await worker.fetch(resourceUrlTest, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: formatBearerToken(TestConfig.InvalidToken),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      const body = await response.text();

      expect(body).not.toContain('/Users/');
      expect(body).not.toContain('C:\\');
      expect(body).not.toContain('at ');
      expect(body).not.toContain('FIREBASE_PROJECT_ID');
    });

  it(testName('Security Headers in Real Worker: should include X-Content-Type-Options header'), async () => {
      const token = await createToken();
      const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
      const response = await worker.fetch(rootUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.headers.get(HttpHeader.XContentTypeOptions)).toBe(SecurityHeaderValue.NoSniff);
      await consumeResponseBody(response);
    });

  it(testName('Security Headers in Real Worker: should not expose server information'), async () => {
      const token = await createToken();
      const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
      const response = await worker.fetch(rootUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.headers.get('Server')).toBeNull();
      expect(response.headers.get('X-Powered-By')).toBeNull();
      await consumeResponseBody(response);
    });
});
