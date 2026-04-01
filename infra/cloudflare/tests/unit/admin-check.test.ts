import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint, getValidRequestHeaders, getAdminAuthHeaders, getValidOriginHeaders } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
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

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for admin check tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    worker = await getTestWorker();
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('admin endpoints: require authentication for admin operations'), async () => {
    const token = await createToken();
    logInfo('[TEST] Testing admin auth requirement', getStackTrace(), LOG_TEST_OPERATIONS);
    const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId('test-match'));
    const response = await worker.fetch(signedUrl, {
      headers: getValidOriginHeaders(TestConfig.TestCorsOrigin)
    }, token);

    logInfo('[TEST] Admin auth check response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    if (response.status !== HttpStatus.Unauthorized) {
      logError('[TEST] Admin auth not enforced', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
    }
  });

  it(testName('admin endpoints: require admin status for signed URL generation'), async () => {
    const token = await createToken();
    const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId('test-match'));
    const response = await worker.fetch(signedUrl, {
      headers: getValidRequestHeaders(TestConfig.RegularUserId, false, TestConfig.TestCorsOrigin)
    }, token);

    logInfo('[TEST] Non-admin user response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
    expect(response.status).toBe(HttpStatus.Forbidden);
    if (response.status !== HttpStatus.Forbidden) {
      logError('[TEST] Non-admin user should be forbidden', getStackTrace(), { expected: HttpStatus.Forbidden, actual: response.status });
    }
  });

  it(testName('admin endpoints: allow admin users to access admin endpoints'), async () => {
    const token = await createToken();
    const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId('test-match'));
    const response = await worker.fetch(signedUrl, {
      headers: {
        ...getAdminAuthHeaders(TestConfig.TestAdminUserId),
        ...getValidOriginHeaders(TestConfig.TestCorsOrigin)
      }
    }, token);

    expect([HttpStatus.Ok, HttpStatus.NotFound, HttpStatus.InternalServerError, HttpStatus.BadRequest]).toContain(response.status);
  });

  it(testName('admin endpoints: block non-admin from accessing admin endpoints'), async () => {
    const token = await createToken();
    const dataExportUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(TestConfig.OtherUserId));
    const response = await worker.fetch(dataExportUrl, {
      headers: getValidRequestHeaders(TestConfig.RegularUserId, false, TestConfig.TestCorsOrigin)
    }, token);

    expect(response.status).toBe(HttpStatus.Forbidden);
    await response.text().catch(() => undefined);
  });
});
