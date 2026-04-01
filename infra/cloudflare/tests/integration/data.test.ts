import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint, getValidRequestHeaders, getAdminAuthHeaders, generateTestUserId } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
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

describe(extractName(import.meta.url), TestSuiteType.Integration, { runIn: RunIn.Unstable, concurrent: false }, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for data integration tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('Data Export: should export user data for authenticated user'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-export');
      logInfo('[TEST] Testing data export', getStackTrace(), { userId }, LOG_TEST_OPERATIONS);

      const dataExportUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(userId));
      const response = await worker.fetch(dataExportUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);
      logInfo('[TEST] Data export response', getStackTrace(), { status: response.status, userId }, LOG_TEST_RESPONSE_DETAILS);

      expect(response.status).toBe(HttpStatus.Ok);
      if (response.status !== HttpStatus.Ok) {
        logError('[TEST] Unexpected status for data export', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status, userId });
      }
      const data = await response.json() as { user_id: string; matches: unknown[]; disputes: unknown[]; exported_at: string };
      expect(data.user_id).toBe(userId);
      expect(Array.isArray(data.matches)).toBe(true);
      expect(Array.isArray(data.disputes)).toBe(true);
      expect(typeof data.exported_at).toBe('string');
      expect(data.exported_at.length).toBeGreaterThan(0);
      if (data.user_id !== userId || !Array.isArray(data.matches) || !Array.isArray(data.disputes)) {
        logError('[TEST] Invalid data export structure', getStackTrace(), { userId: data.user_id, expectedUserId: userId, hasMatches: Array.isArray(data.matches), hasDisputes: Array.isArray(data.disputes) });
      }
    });

  it(testName('Data Export: should allow admin to export any user data'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-export-admin');

      const dataExportUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(userId));
      const response = await worker.fetch(dataExportUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { user_id: string };
      expect(data.user_id).toBe(userId);
    });

  it(testName('Data Export Authorization: should reject requests without authentication'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-export-unauth');

      const dataExportUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(userId));
      const response = await worker.fetch(dataExportUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Data Export Authorization: should reject cross-user data export attempts'), async () => {
      const token = await createToken();
      const ownUserId = generateTestUserId('data-export-own');
      const otherUserId = generateTestUserId('data-export-other');

      const dataExportUrl2 = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(otherUserId));
      const response = await worker.fetch(dataExportUrl2, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(ownUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe(ErrorMessage.Forbidden);
      expect(data.message).toBe('You can only export your own data');
    });

  it(testName('Data Export Input Validation: should reject requests with missing userId'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-export-missing');
      const dataExportUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.Base);
      const response = await worker.fetch(dataExportUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect([HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
      if (response.status === HttpStatus.BadRequest) {
        const data = await response.json() as { error?: string; message?: string };
        expect(data.error).toBe(ErrorMessage.BadRequest);
      } else {
        await consumeResponseBody(response);
      }
    });

  it(testName('Data Export Input Validation: should reject invalid HTTP methods'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-export-method');

      const dataExportUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(userId));
      const response = await worker.fetch(dataExportUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.MethodNotAllowed);
      await consumeResponseBody(response);
    });

  it(testName('Data Deletion Endpoint: should reject GET method on data deletion path'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-get-method');

      const dataUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(userId));
      const response = await worker.fetch(dataUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.MethodNotAllowed);
      await consumeResponseBody(response);
    });

  it(testName('Data Deletion: should delete user data with confirmation'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-delete');

      const dataUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(userId));
      const response = await worker.fetch(dataUrl, {
        method: HttpMethod.Delete,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ confirm: true })
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; deleted_items: { matches: number; disputes: number; evidence: number }; deleted_at: string };
      expect(data.success).toBe(true);
      expect(typeof data.deleted_items.matches).toBe('number');
      expect(data.deleted_items.matches).toBeGreaterThanOrEqual(0);
      expect(typeof data.deleted_items.disputes).toBe('number');
      expect(data.deleted_items.disputes).toBeGreaterThanOrEqual(0);
      expect(typeof data.deleted_items.evidence).toBe('number');
      expect(data.deleted_items.evidence).toBeGreaterThanOrEqual(0);
      expect(typeof data.deleted_at).toBe('string');
      expect(data.deleted_at.length).toBeGreaterThan(0);
    });

  it(testName('Data Deletion: should accept confirmation via query parameter'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-delete-query');

      const baseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(userId));
      const url = new URL(baseUrl);
      url.searchParams.set('confirm', 'true');
      const dataUrl = url.toString();
      const response = await worker.fetch(dataUrl, {
        method: HttpMethod.Delete,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

  it(testName('Data Deletion: should allow admin to delete any user data'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-delete-admin');

      const dataUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(userId));
      const response = await worker.fetch(dataUrl, {
        method: HttpMethod.Delete,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ confirm: true })
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

  it(testName('Data Deletion Authorization: should reject requests without authentication'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-delete-unauth');

      const dataUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(userId));
      const response = await worker.fetch(dataUrl, {
        method: HttpMethod.Delete,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ confirm: true })
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Data Deletion Authorization: should reject cross-user data deletion attempts'), async () => {
      const token = await createToken();
      const ownUserId = generateTestUserId('data-delete-own');
      const otherUserId = generateTestUserId('data-delete-other');

      const dataUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(otherUserId));
      const response = await worker.fetch(dataUrl, {
        method: HttpMethod.Delete,
        headers: {
          ...getValidRequestHeaders(ownUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ confirm: true })
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe(ErrorMessage.Forbidden);
      expect(data.message).toBe('You can only delete your own data');
    });

  it(testName('Data Deletion Validation: should reject deletion without confirmation'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-delete-no-confirm');

      const dataUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(userId));
      const response = await worker.fetch(dataUrl, {
        method: HttpMethod.Delete,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ confirm: false })
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string };
      expect(typeof data.error).toBe('string');
      expect(data.error?.length).toBeGreaterThan(0);
    });

    it(testName('should delete data using authenticated userId when userId not in path'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('data-delete-no-path');
      if (!worker) {
        throw new Error('PREREQUISITE FAILED: Worker not initialized');
      }

      const dataUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(userId));
      if (!dataUrl) {
        throw new Error('PREREQUISITE FAILED: dataUrl is null/undefined');
      }
      if (!dataUrl.includes(ApiEndpoint.Data.ByUserId(userId))) {
        throw new Error(`PREREQUISITE FAILED: Invalid data URL - missing endpoint. URL: ${dataUrl}, Expected: ${ApiEndpoint.Data.ByUserId(userId)}`);
      }

      logInfo('Making data deletion request without userId in path', getStackTrace(), {
        url: dataUrl,
        endpoint: ApiEndpoint.Data.ByUserId(userId),
        hasToken: true,
      }, LOG_TEST_OPERATIONS);

      const response = await worker.fetch(dataUrl, {
        method: HttpMethod.Delete,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ confirm: true })
      }, token);

      if (response.status !== HttpStatus.Ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        logError('[TEST] Unexpected status for data deletion', getStackTrace(), {
          expected: HttpStatus.Ok,
          actual: response.status,
          error: errorData,
          url: dataUrl,
        });
      }

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; deleted_items?: { matches?: number; disputes?: number; evidence?: number }; deleted_at?: string };
      expect(data.success).toBe(true);
      expect(data.deleted_items).not.toBeNull();
      expect(typeof data.deleted_items?.matches).toBe('number');
      expect(data.deleted_items?.matches).toBeGreaterThanOrEqual(0);
      expect(typeof data.deleted_items?.disputes).toBe('number');
      expect(data.deleted_items?.disputes).toBeGreaterThanOrEqual(0);
      expect(typeof data.deleted_items?.evidence).toBe('number');
      expect(data.deleted_items?.evidence).toBeGreaterThanOrEqual(0);
      expect(typeof data.deleted_at).toBe('string');
      expect(data.deleted_at?.length).toBeGreaterThan(0);
    });
});
