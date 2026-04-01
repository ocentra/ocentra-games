import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint } from '@tests/helpers/test-helpers';
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
    logInfo('[TEST] Initializing test worker for homepage tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('Homepage Rendering: should return homepage HTML for root path'), async () => {
    const token = await createToken();
    logInfo('[TEST] Testing homepage HTML rendering', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    logInfo('[TEST] Homepage response', getStackTrace(), { status: response.status, contentType: response.headers.get(HttpHeader.ContentType) }, LOG_TEST_RESPONSE_DETAILS);
    expect(response.status).toBe(HttpStatus.Ok);
    const contentType = response.headers.get(HttpHeader.ContentType);
    expect(contentType).toBe(HttpContentType.TextHtml);
    
    const html = await response.text();
    logInfo('[TEST] Homepage HTML validated', getStackTrace(), { htmlLength: html.length }, LOG_TEST_OPERATIONS);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Claim Storage API');
    expect(html).toContain('Available Endpoints');
  });

  it(testName('Homepage Rendering: should include environment information in HTML'), async () => {
    const token = await createToken();
    logInfo('[TEST] Testing homepage environment information', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    logInfo('[TEST] Homepage environment response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
    expect(response.status).toBe(HttpStatus.Ok);
    if (response.status !== HttpStatus.Ok) {
      logError('[TEST] Unexpected status for homepage environment', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status });
    }
    const html = await response.text();
    logInfo('[TEST] Homepage HTML validated for environment info', getStackTrace(), { htmlLength: html.length }, LOG_TEST_OPERATIONS);
    expect(html).toContain('Environment:');
    expect(html).toContain('Base URL:');
    if (!html.includes('Environment:') || !html.includes('Base URL:')) {
      logError('[TEST] Homepage missing environment information', getStackTrace(), { htmlLength: html.length });
    }
  });

  it(testName('Homepage Rendering: should include all API endpoint documentation'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(response.status).toBe(HttpStatus.Ok);
    const html = await response.text();
    
    expect(html).toContain('/api/matches');
    expect(html).toContain('/api/disputes');
    expect(html).toContain('/api/ai/on_event');
    expect(html).toContain('/api/data-export');
    expect(html).toContain('/api/leaderboard');
  });

  it(testName('Homepage Rendering: should include links to documentation'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(response.status).toBe(HttpStatus.Ok);
    const html = await response.text();
    
    expect(html).toContain('/api/docs');
    expect(html).toContain('/openapi.json');
    expect(html).toContain('/explore');
  });

  it(testName('Homepage Rendering: should include test endpoints warning for development'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(response.status).toBe(HttpStatus.Ok);
    const html = await response.text();
    
    expect(html).toContain('Test Endpoints');
    expect(html).toContain('WARNING');
    expect(html).toContain('/api/test/clear-all');
  });

  it(testName('Homepage Rendering: should set correct CORS headers'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(response.status).toBe(HttpStatus.Ok);
    const corsHeader = response.headers.get(HttpHeader.AccessControlAllowOrigin);
    expect(corsHeader).not.toBeNull();
    expect(typeof corsHeader).toBe('string');
  });

  it(testName('Homepage Rendering: should handle requests without Origin header'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get
    }, token);

    expect(response.status).toBe(HttpStatus.Ok);
    const contentType = response.headers.get(HttpHeader.ContentType);
    expect(contentType).toBe(HttpContentType.TextHtml);
    await consumeResponseBody(response);
  });

  it(testName('Homepage Rendering: should include base URL in generated HTML'), async () => {
    const token = await createToken();
    const baseUrl = TestConfig.TestApiUrlPlaceholder;
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(response.status).toBe(HttpStatus.Ok);
    const html = await response.text();
    expect(html).toContain(baseUrl);
  });

  it(testName('Method Handling: should accept GET requests'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect(response.status).toBe(HttpStatus.Ok);
    await consumeResponseBody(response);
  });

  it(testName('Method Handling: should handle OPTIONS requests for CORS preflight'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Options,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect([HttpStatus.Ok, HttpStatus.NoContent, HttpStatus.NotFound]).toContain(response.status);
    await consumeResponseBody(response);
  });
});
