import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getValidRequestHeaders, buildTestApiUrlForEndpointWithPath, buildTestApiUrlForEndpoint, generateTestMatchId } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader,  HttpContentType } from '@ocentra/endpoint-domain/constants/http';
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

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for archive tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('Match Archiving: should require authentication for archiving'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing archive auth requirement', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const archiveUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Archive.ByMatchId('test-match'));
      const response = await worker.fetch(archiveUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      logInfo('[TEST] Archive auth check response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Match Archiving: should archive existing match'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-archive');
      logInfo('[TEST] Testing match archiving', getStackTrace(), { matchId }, LOG_TEST_OPERATIONS);

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const createResponse = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          match_id: matchId,
          version: '1.0.0',
          events: []
        })
      }, token);

      logInfo('[TEST] Match creation response', getStackTrace(), { status: createResponse.status, matchId }, LOG_TEST_RESPONSE_DETAILS);
      expect(createResponse.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(createResponse);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const archiveUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Archive.ByMatchId(matchId));
      const archiveResponse = await worker.fetch(archiveUrl, {
        method: HttpMethod.Post,
        headers: getValidRequestHeaders(TestConfig.TestUserId)
      }, token);

      logInfo('[TEST] Archive response', getStackTrace(), { status: archiveResponse.status, matchId }, LOG_TEST_RESPONSE_DETAILS);
      expect(archiveResponse.status).toBe(HttpStatus.Ok);
      const data = await archiveResponse.json() as { success: boolean; matchId: string; archivedAt: string };
      logInfo('[TEST] Archive data validated', getStackTrace(), { success: data.success, matchId: data.matchId, archivedAt: data.archivedAt }, LOG_TEST_OPERATIONS);
      expect(data.success).toBe(true);
      expect(data.matchId).toBe(matchId);
      expect(typeof data.archivedAt).toBe('string');
      expect(data.archivedAt.length).toBeGreaterThan(0);
    }, 30000);

  it(testName('Match Archiving: should return 404 for non-existent match'), async () => {
      const token = await createToken();
      // Use valid UUID format that doesn't exist (not 'nonexistent-match' which fails validation)
      const nonExistentMatchId = generateTestMatchId('nonexistent');
      const archiveUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Archive.ByMatchId(nonExistentMatchId));
      const response = await worker.fetch(archiveUrl, {
        method: HttpMethod.Post,
        headers: getValidRequestHeaders(TestConfig.TestUserId)
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      await consumeResponseBody(response);
    });

  it(testName('Match Archiving: should reject non-POST requests'), async () => {
      const token = await createToken();
      const archiveUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Archive.ByMatchId('test-match'));
      const response = await worker.fetch(archiveUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId)
      }, token);

      expect(response.status).toBe(HttpStatus.MethodNotAllowed);
      await consumeResponseBody(response);
    });

  it(testName('Match Archiving: should require match ID in path'), async () => {
    const token = await createToken();
    if (!worker) {
      throw new Error('PREREQUISITE FAILED: Worker not initialized');
    }

    const archiveUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Archive.ByMatchId('test-match'));
    if (!archiveUrl) {
      throw new Error('PREREQUISITE FAILED: archiveUrl is null/undefined');
    }
    const expectedPath = ApiEndpoint.Archive.ByMatchId('test-match');
    if (!archiveUrl.includes(expectedPath)) {
      throw new Error(`PREREQUISITE FAILED: Invalid archive URL - missing endpoint. URL: ${archiveUrl}, Expected: ${expectedPath}`);
    }

    logInfo('Making archive request without matchId', getStackTrace(), {
      url: archiveUrl,
      endpoint: expectedPath,
    }, LOG_TEST_OPERATIONS);

    const response = await worker.fetch(archiveUrl, {
      method: HttpMethod.Post,
      headers: getValidRequestHeaders(TestConfig.TestUserId)
    }, token);

    if (!response) {
      throw new Error('PREREQUISITE FAILED: No response received from worker');
    }

    logInfo('Received response', getStackTrace(), {
      status: response.status,
      statusText: response.statusText,
      expectedStatus: HttpStatus.BadRequest,
    }, LOG_TEST_RESPONSE_DETAILS);

    if (response.status !== HttpStatus.BadRequest) {
      const body = await response.text().catch(() => 'Unable to read response body');
      logError('Unexpected response status', getStackTrace(), {
        expected: HttpStatus.BadRequest,
        actual: response.status,
        statusText: response.statusText,
        body: body.substring(0, 500),
        url: archiveUrl,
      });
      throw new Error(`Expected ${HttpStatus.BadRequest} BadRequest but got ${response.status} ${response.statusText}. Response body: ${body.substring(0, 500)}`);
    }

    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });
});
