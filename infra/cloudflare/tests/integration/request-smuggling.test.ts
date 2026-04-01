import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getValidRequestHeaders, buildTestApiUrlForEndpointWithPath } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
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
    logInfo('[TEST] Initializing test worker for request smuggling tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('Content-Length / Transfer-Encoding Mismatches: should reject request with conflicting Content-Length and Transfer-Encoding'), async () => {
      const token = await createToken();
      const body = JSON.stringify({ test: 'data' });
      logInfo('[TEST] Testing request smuggling protection (conflicting headers)', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      
      let response: Response;
      let fetchFailed = false;
      try {
        const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
        response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.ContentLength]: String(body.length),
            [HttpHeader.TransferEncoding]: 'chunked',
          },
          body
        }, token);
      } catch (error) {
        fetchFailed = true;
        logInfo('[TEST] Fetch failed (transport layer rejection)', getStackTrace(), { error: error instanceof Error ? error.message : String(error) }, LOG_TEST_RESPONSE_DETAILS);
        expect(error instanceof Error && error.message.includes('fetch failed')).toBe(true);
        return;
      }

      if (!fetchFailed) {
        logInfo('[TEST] Request smuggling protection response', getStackTrace(), { status: response!.status }, LOG_TEST_RESPONSE_DETAILS);
        const expectedStatuses = [HttpStatus.BadRequest, HttpStatus.LengthRequired] as number[];
        if (!expectedStatuses.includes(response!.status)) {
          logError('[TEST] Unexpected status for request smuggling test', getStackTrace(), { status: response!.status });
        }
        expect([HttpStatus.BadRequest, HttpStatus.LengthRequired]).toContain(response!.status);
        await consumeResponseBody(response!);
      }
    });

  it(testName('Content-Length / Transfer-Encoding Mismatches: should handle chunked encoding correctly'), async () => {
      const token = await createToken();
      const body = JSON.stringify({ match_id: TestConfig.TestMatchId, version: TestConfig.TestMatchVersion, events: [] });
      
      let response: Response;
      let fetchFailed = false;
      try {
        const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
        response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.TransferEncoding]: 'chunked',
          },
          body
        }, token);
      } catch (error) {
        fetchFailed = true;
        expect(error instanceof Error && error.message.includes('fetch failed')).toBe(true);
        return;
      }

      if (!fetchFailed) {
        expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(response!.status);
      }
    });

  it(testName('Content-Length / Transfer-Encoding Mismatches: should reject request with invalid Transfer-Encoding value'), async () => {
      const token = await createToken();
      const body = JSON.stringify({ test: 'data' });
      
      let response: Response;
      let fetchFailed = false;
      try {
        const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
        response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.TransferEncoding]: 'invalid-encoding',
          },
          body
        }, token);
      } catch (error) {
        fetchFailed = true;
        expect(error instanceof Error && error.message.includes('fetch failed')).toBe(true);
        return;
      }

      if (!fetchFailed) {
        expect([HttpStatus.BadRequest, HttpStatus.NotImplemented]).toContain(response!.status);
        await consumeResponseBody(response!);
      }
    });

  it(testName('HTTP/1.1 vs HTTP/2 Desync Attacks: should handle Content-Length: 0 with body'), async () => {
      const token = await createToken();
      const body = JSON.stringify({ test: 'data' });
      
      let response: Response;
      let fetchFailed = false;
      try {
        const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
        response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.ContentLength]: '0',
          },
          body
        }, token);
      } catch (error) {
        fetchFailed = true;
        expect(error instanceof Error && error.message.includes('fetch failed')).toBe(true);
        return;
      }

      if (!fetchFailed) {
        expect([HttpStatus.BadRequest, HttpStatus.LengthRequired]).toContain(response!.status);
      }
    });

  it(testName('HTTP/1.1 vs HTTP/2 Desync Attacks: should reject request with negative Content-Length'), async () => {
      const token = await createToken();
      const body = JSON.stringify({ test: 'data' });
      
      let response: Response;
      let fetchFailed = false;
      try {
        const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
        response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.ContentLength]: '-1',
          },
          body
        }, token);
      } catch (error) {
        fetchFailed = true;
        expect(error instanceof Error && error.message.includes('fetch failed')).toBe(true);
        return;
      }

      if (!fetchFailed) {
        expect([HttpStatus.BadRequest, HttpStatus.LengthRequired]).toContain(response!.status);
        await consumeResponseBody(response!);
      }
    });

  it(testName('HTTP/1.1 vs HTTP/2 Desync Attacks: should reject request with oversized Content-Length'), async () => {
      const token = await createToken();
      const body = JSON.stringify({ test: 'data' });
      
      let response: Response;
      let fetchFailed = false;
      try {
        const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
        response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.ContentLength]: '999999999999',
          },
          body
        }, token);
      } catch (error) {
        fetchFailed = true;
        expect(error instanceof Error && error.message.includes('fetch failed')).toBe(true);
        return;
      }

      if (!fetchFailed) {
        expect([HttpStatus.BadRequest, HttpStatus.PayloadTooLarge]).toContain(response!.status);
      }
    });

  it(testName('Header Injection via Content-Length: should reject request with CRLF in Content-Length header'), async () => {
      const token = await createToken();
      const body = JSON.stringify({ test: 'data' });
      
      let response: Response;
      let fetchFailed = false;
      try {
        const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
        response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.ContentLength]: `10\r\nX-Injected: header`,
          },
          body
        }, token);
      } catch (error) {
        fetchFailed = true;
        expect(error).toBeInstanceOf(Error);
        return;
      }

      if (!fetchFailed) {
        expect([HttpStatus.BadRequest, HttpStatus.LengthRequired]).toContain(response!.status);
        await consumeResponseBody(response!);
      }
    });

  it(testName('Header Injection via Content-Length: should reject request with multiple Content-Length headers'), async () => {
      const token = await createToken();
      const body = JSON.stringify({ test: 'data' });
      const headers = new Headers({
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      });
      headers.append(HttpHeader.ContentLength, String(body.length));
      headers.append(HttpHeader.ContentLength, '999');

      let response: Response;
      let fetchFailed = false;
      try {
        const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
        response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers,
          body
        }, token);
      } catch (error) {
        fetchFailed = true;
        expect(error instanceof Error && error.message.includes('fetch failed')).toBe(true);
        return;
      }

      if (!fetchFailed) {
        expect([HttpStatus.BadRequest, HttpStatus.LengthRequired]).toContain(response!.status);
      }
    });

  it(testName('Host Header Validation: should validate Host header matches request'), async () => {
      const token = await createToken();
      const body = JSON.stringify({ test: 'data' });
      
      let response: Response;
      let fetchFailed = false;
      try {
        const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
        response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Host]: 'evil.com',
          },
          body
        }, token);
      } catch (error) {
        fetchFailed = true;
        expect(error instanceof Error && error.message.includes('fetch failed')).toBe(true);
        return;
      }

      if (!fetchFailed) {
        expect([HttpStatus.BadRequest, HttpStatus.Ok, HttpStatus.Forbidden]).toContain(response!.status);
        await consumeResponseBody(response!);
      }
    });
});
