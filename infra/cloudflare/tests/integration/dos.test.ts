import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getValidRequestHeaders, buildTestApiUrlForEndpointWithPath, buildTestApiUrlForEndpoint } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader,  HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { RequestLimits } from '@/constants/request-limits';
import { AIRequestLimits } from '@/constants/ai';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

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
  const walletId = `${TestConfig.TestWalletId}-dos-${Date.now()}`;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for DoS protection tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('Oversized Request Body: should reject request with Content-Length > 10MB'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing DoS protection: oversized request body', getStackTrace(), { size: RequestLimits.MaxRequestSizeBytes + 1024 * 1024 }, LOG_TEST_OPERATIONS);
      const oversizedBody = 'x'.repeat(RequestLimits.MaxRequestSizeBytes + 1024 * 1024);
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.ContentLength]: String(oversizedBody.length),
          [HttpHeader.XWalletId]: walletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: oversizedBody
      }, token);

      logInfo('[TEST] DoS protection response', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
      expect(response.status).toBe(HttpStatus.PayloadTooLarge);
      const json = await response.json() as { error?: string };
      expect(json.error).toBe(ErrorMessage.PayloadTooLarge);
      if (json.error !== ErrorMessage.PayloadTooLarge) {
        logError('[TEST] Unexpected error message', getStackTrace(), { expected: ErrorMessage.PayloadTooLarge, actual: json.error });
    }
  });

  it(testName('Oversized Request Body: should accept request with Content-Length <= 10MB'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing valid request size', getStackTrace(), { size: RequestLimits.MaxRequestSizeBytes }, LOG_TEST_OPERATIONS);
      const validBody = JSON.stringify({ match_id: TestConfig.TestMatchId, version: TestConfig.TestMatchVersion, events: [] });
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.ContentLength]: String(validBody.length),
          [HttpHeader.XWalletId]: walletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: validBody
      }, token);

      logInfo('[TEST] Valid request response', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
    expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(response.status);
    await consumeResponseBody(response);
  });

  it(testName('Rule 5.2.8 / JSON Bomb - Deeply Nested: should handle deeply nested JSON (5000+ levels)'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing JSON bomb: deeply nested structure', getStackTrace(), { levels: 5000 }, LOG_TEST_OPERATIONS);
      let bomb = '"x"';
      for (let i = 0; i < 5000; i++) {
        bomb = `{"a": ${bomb}}`;
      }
      
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.ContentLength]: String(bomb.length),
          [HttpHeader.XWalletId]: walletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: bomb
      }, token);

      logInfo('[TEST] JSON bomb response', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
      expect([HttpStatus.BadRequest, HttpStatus.PayloadTooLarge]).toContain(response.status);
      const expectedStatuses = [HttpStatus.BadRequest, HttpStatus.PayloadTooLarge] as number[];
      if (!expectedStatuses.includes(response.status)) {
      logError('[TEST] Unexpected status for JSON bomb', getStackTrace(), { status: response.status });
    }
      await consumeResponseBody(response);
  });

  it(testName('Array Bomb - Huge Arrays: should handle huge arrays (100k+ elements)'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing array bomb: huge array', getStackTrace(), { elements: 100000 }, LOG_TEST_OPERATIONS);
      const hugeArray = JSON.stringify({
        data: Array(100000).fill('x')
      });
      
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.ContentLength]: String(hugeArray.length),
          [HttpHeader.XWalletId]: walletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: hugeArray
      }, token);

      logInfo('[TEST] Array bomb response', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
      expect([HttpStatus.BadRequest, HttpStatus.PayloadTooLarge]).toContain(response.status);
    });

  it.skip(testName('Content-Length Mismatch: should handle Content-Length mismatch (claim huge size, send small body)'), async () => {
      const token = await createToken();
      // Cannot test Content-Length mismatch via Fetch API - library (undici) validates before request
      const smallBody = '{}';
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.ContentLength]: '999999999',
          [HttpHeader.XWalletId]: walletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: smallBody
      }, token);

    expect([HttpStatus.BadRequest, HttpStatus.PayloadTooLarge]).toContain(response.status);
    await consumeResponseBody(response);
  });

  it(testName('Content-Length Mismatch / Malformed JSON: should handle unclosed brackets'), async () => {
      const token = await createToken();
      const malformed = '{"data": [';
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.XWalletId]: walletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: malformed
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await response.text().catch(() => undefined);
    });

  it(testName('Content-Length Mismatch: should handle invalid UTF-8 sequences'), async () => {
      const token = await createToken();
      const invalidUtf8 = Buffer.from([0xFF, 0xFE, 0xFD]).toString('binary');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.XWalletId]: walletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: invalidUtf8
      }, token);

    expect([HttpStatus.BadRequest, HttpStatus.PayloadTooLarge]).toContain(response.status);
    await consumeResponseBody(response);
  });

  it(testName('Malformed JSON: should handle type confusion attacks'), async () => {
      const token = await createToken();
      const typeConfusion = '{"data": null, "value": undefined, "count": "not-a-number"}';
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.XWalletId]: walletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: typeConfusion
      }, token);

    expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(response.status);
  });

  it(testName('Rule 5.2.7: compression bomb - gzip body to JSON endpoint is rejected or size-limited'), async () => {
    const token = await createToken();
    const gzipMagic = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03]);
    const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
    const response = await worker.fetch(matchUrl, {
      method: HttpMethod.Put,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        'Content-Encoding': 'gzip',
        [HttpHeader.XWalletId]: walletId,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
      },
      body: gzipMagic,
    }, token);
    expect([HttpStatus.BadRequest, HttpStatus.PayloadTooLarge, HttpStatus.UnsupportedMediaType]).toContain(response.status);
    await consumeResponseBody(response);
  });

  it(testName('AI Endpoint Size Limits: should reject AI event request > 1MB'), async () => {
      const token = await createToken();
      const oversizedBody = JSON.stringify({
        matchId: TestConfig.TestMatchId,
        playerId: TestConfig.TestPlayerId,
        eventType: TestConfig.InvalidEventType,
        data: 'x'.repeat(AIRequestLimits.MaxSizeBytes + 1024 * 1024)
      });
      
      const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      const response = await worker.fetch(aiEventUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.ContentLength]: String(oversizedBody.length),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: oversizedBody
      }, token);

      expect(response.status).toBe(HttpStatus.PayloadTooLarge);
      await consumeResponseBody(response);
    });
});
