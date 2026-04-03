import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  computeContentHash,
  getValidOriginHeaders,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { HttpContentType, HttpHeader, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
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

describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for auth order tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Auth should run BEFORE hash validation (Security: Rule 2.1, auth before validation): should return 401 when no auth header (auth check runs first)'), async () => {
      const token = await createToken();
      const payload = new TextEncoder().encode('auth-order-payload');
      const expectedHash = await computeContentHash(payload);
      const mismatchHash = `${expectedHash.slice(0, -1)}${expectedHash.endsWith('0') ? '1' : '0'}`;
      logInfo('[TEST] Sending request with valid hash but NO auth header', getStackTrace(), undefined, LOG_TEST_OPERATIONS);
      const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.UploadImage);
      logInfo(`[TEST] URL: ${resourceUrl}`, getStackTrace(), undefined, LOG_TEST_OPERATIONS);

      const response = await worker.fetch(resourceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          hash: mismatchHash,
          content: Buffer.from(payload).toString('base64'),
          contentType: HttpContentType.ImagePng,
        }),
      }, token);

      logInfo(`[TEST] Response status: ${response.status}`, getStackTrace(), undefined, LOG_TEST_RESPONSE_DETAILS);
      const bodyText = await response.text();
      logInfo(`[TEST] Response body: ${bodyText}`, getStackTrace(), undefined, LOG_TEST_RESPONSE_DETAILS);

      let body: { error?: string; message?: string };
      try {
        body = JSON.parse(bodyText);
      } catch (error) {
        logError('[TEST] Failed to parse response body as JSON', getStackTrace(), { bodyText, error });
        body = {};
      }

      expect(response.status).toBe(HttpStatus.Unauthorized);
      expect(body.error).toBe(ErrorMessage.Unauthorized);
    });

  it(testName('Auth should run BEFORE hash validation (Security: Rule 2.1, auth before validation): should return 400 when hash is invalid format (validation runs after auth)'), async () => {
      const token = await createToken();
      const payload = new TextEncoder().encode('auth-order-payload');
      const expectedHash = await computeContentHash(payload);
      const mismatchHash = `${expectedHash.slice(0, -1)}${expectedHash.endsWith('0') ? '1' : '0'}`;
      const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.UploadImage);
      const response = await worker.fetch(resourceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId, false, TestConfig.TestCorsOrigin),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          hash: mismatchHash,
          content: Buffer.from(payload).toString('base64'),
          contentType: HttpContentType.ImagePng,
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const body = (await response.json()) as { error?: string; message?: string };
      expect(body.error).toBe(ErrorMessage.BadRequest);
      expect(body.message).toContain('Hash mismatch');
    });

  it(testName('Auth should run BEFORE hash validation (Security: Rule 2.1, auth before validation): should return 401 when no auth AND invalid hash (auth should win)'), async () => {
      const token = await createToken();
      const payload = new TextEncoder().encode('auth-order-payload');
      const expectedHash = await computeContentHash(payload);
      const mismatchHash = `${expectedHash.slice(0, -1)}${expectedHash.endsWith('0') ? '1' : '0'}`;
      logInfo('[TEST] Sending request with INVALID hash and NO auth header', getStackTrace(), undefined, LOG_TEST_OPERATIONS);
      const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.UploadImage);
      logInfo(`[TEST] URL: ${resourceUrl}`, getStackTrace(), undefined, LOG_TEST_OPERATIONS);
      const response = await worker.fetch(resourceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          hash: mismatchHash,
          content: Buffer.from(payload).toString('base64'),
          contentType: HttpContentType.ImagePng,
        }),
      }, token);

      logInfo(`[TEST] Response status: ${response.status}`, getStackTrace(), undefined, LOG_TEST_RESPONSE_DETAILS);
      const bodyText = await response.text();
      logInfo(`[TEST] Response body: ${bodyText}`, getStackTrace(), undefined, LOG_TEST_RESPONSE_DETAILS);

      let body: { error?: string; message?: string };
      try {
        body = JSON.parse(bodyText);
      } catch (error) {
        logError('[TEST] Failed to parse response body as JSON', getStackTrace(), { bodyText, error });
        body = {};
      }

      expect(response.status).toBe(HttpStatus.Unauthorized);
      expect(body.error).toBe(ErrorMessage.Unauthorized);
    });
});
