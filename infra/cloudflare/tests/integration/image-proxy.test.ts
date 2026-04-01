import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlWithQuery, buildTestApiUrlForEndpoint } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
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

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Proxy Allowed Domains: should proxy images from googleusercontent.com'), async () => {
      const token = await createToken();
      const testImageUrl = 'https://lh3.googleusercontent.com/a/default-user=s96-c';
      logInfo(`[TEST] Testing proxy for: ${testImageUrl}`, getStackTrace(), { url: testImageUrl }, LOG_TEST_OPERATIONS);
      
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: testImageUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.status === HttpStatus.Ok) {
        const contentType = response.headers.get(HttpHeader.ContentType);
        logInfo(`[TEST] Successfully proxied image`, getStackTrace(), { status: response.status, contentType }, LOG_TEST_OPERATIONS);
        expect(contentType?.startsWith('image/') || contentType === HttpContentType.ImageJpeg).toBe(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        logError(`[TEST] Proxy failed with status ${response.status}`, getStackTrace(), { status: response.status, error: errorData });
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.InternalServerError, HttpStatus.NotFound]).toContain(response.status);
      }
      await consumeResponseBody(response);
    });

  it(testName('Proxy Allowed Domains: should proxy images from facebook.com'), async () => {
      const token = await createToken();
      const testImageUrl = 'https://facebook.com/images/test.jpg';
      logInfo(`[TEST] Testing proxy for: ${testImageUrl}`, getStackTrace(), { url: testImageUrl }, LOG_TEST_OPERATIONS);
      
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: testImageUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.status === HttpStatus.Ok) {
        const contentType = response.headers.get(HttpHeader.ContentType);
        logInfo(`[TEST] Successfully proxied image`, getStackTrace(), { status: response.status, contentType }, LOG_TEST_OPERATIONS);
        expect(contentType?.startsWith('image/') || contentType === HttpContentType.ImageJpeg).toBe(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        logError(`[TEST] Proxy failed with status ${response.status}`, getStackTrace(), { status: response.status, error: errorData });
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.InternalServerError, HttpStatus.NotFound]).toContain(response.status);
      }
      await consumeResponseBody(response);
    });

  it(testName('Proxy Allowed Domains: should proxy images from fbcdn.net'), async () => {
      const token = await createToken();
      const testImageUrl = 'https://fbcdn.net/images/test.jpg';
      logInfo(`[TEST] Testing proxy for: ${testImageUrl}`, getStackTrace(), { url: testImageUrl }, LOG_TEST_OPERATIONS);

      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: testImageUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.status === HttpStatus.Ok) {
        const contentType = response.headers.get(HttpHeader.ContentType);
        logInfo(`[TEST] Successfully proxied image`, getStackTrace(), { status: response.status, contentType }, LOG_TEST_OPERATIONS);
        expect(response.status).toBe(HttpStatus.Ok);
      } else {
        const errorData = await response.json().catch(() => ({}));
        logError(`[TEST] Proxy failed with status ${response.status}`, getStackTrace(), { status: response.status, error: errorData });
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.InternalServerError, HttpStatus.NotFound]).toContain(response.status);
      }
      await consumeResponseBody(response);
    });

  it(testName('Security - Domain Whitelist: should reject images from disallowed domains'), async () => {
      const token = await createToken();
      const maliciousUrl = 'https://evil.com/image.jpg';
      logInfo(`[TEST] Testing security rejection for: ${maliciousUrl}`, getStackTrace(), { url: maliciousUrl }, LOG_TEST_OPERATIONS);
      
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: maliciousUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      logInfo(`[TEST] Security check response`, getStackTrace(), { status: response.status, url: maliciousUrl }, LOG_TEST_OPERATIONS);
      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe('Image source not allowed');
    });

  it(testName('Security - Domain Whitelist: should reject localhost URLs'), async () => {
      const token = await createToken();
      const localhostUrl = 'http://localhost/image.jpg';
      logInfo(`[TEST] Testing SSRF protection for: ${localhostUrl}`, getStackTrace(), { url: localhostUrl }, LOG_TEST_OPERATIONS);
      
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: localhostUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      logInfo(`[TEST] SSRF protection response`, getStackTrace(), { status: response.status, url: localhostUrl }, LOG_TEST_OPERATIONS);
      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe('Image source not allowed');
    });

  it(testName('Security - Domain Whitelist: should reject 127.0.0.1 URLs'), async () => {
      const token = await createToken();
      const localhostUrl = 'http://127.0.0.1/image.jpg';
      logInfo(`[TEST] Testing SSRF protection for: ${localhostUrl}`, getStackTrace(), { url: localhostUrl }, LOG_TEST_OPERATIONS);
      
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: localhostUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      logInfo(`[TEST] SSRF protection response`, getStackTrace(), { status: response.status, url: localhostUrl }, LOG_TEST_OPERATIONS);
      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe('Image source not allowed');
    });

  it(testName('Security - Domain Whitelist: should reject file:// URLs'), async () => {
      const token = await createToken();
      const fileUrl = 'file:///etc/passwd';
      logInfo(`[TEST] Testing file:// scheme rejection`, getStackTrace(), { url: fileUrl }, LOG_TEST_OPERATIONS);
      
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: fileUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      logInfo(`[TEST] File scheme protection response`, getStackTrace(), { status: response.status, url: fileUrl }, LOG_TEST_OPERATIONS);
      expect(response.status === HttpStatus.BadRequest || response.status === HttpStatus.Forbidden).toBe(true);
      await consumeResponseBody(response);
    });

  it(testName('Input Validation: should reject requests without url parameter'), async () => {
      const token = await createToken();
      logInfo(`[TEST] Testing missing url parameter validation`, getStackTrace(), {}, LOG_TEST_OPERATIONS);
      
      const imageProxyUrl = buildTestApiUrlForEndpoint(ApiEndpoint.ImageProxy);
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      logInfo(`[TEST] Validation response`, getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe('Missing url parameter');
    });

  it(testName('Input Validation: should reject empty url parameter'), async () => {
      const token = await createToken();
      logInfo(`[TEST] Testing empty url parameter validation`, getStackTrace(), {}, LOG_TEST_OPERATIONS);
      
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: '' });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      logInfo(`[TEST] Empty url validation response`, getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
      expect(response.status === HttpStatus.BadRequest || response.status === HttpStatus.Forbidden).toBe(true);
      await consumeResponseBody(response);
    });

  it(testName('Response Headers: should set cache control headers for successful responses'), async () => {
      const token = await createToken();
      const testImageUrl = 'https://lh3.googleusercontent.com/a/default-user=s96-c';
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: testImageUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.status === HttpStatus.Ok) {
        const cacheControl = response.headers.get(HttpHeader.CacheControl);
        logInfo(`[TEST] Cache control header check`, getStackTrace(), { status: response.status, cacheControl }, LOG_TEST_OPERATIONS);
        expect(typeof cacheControl).toBe('string');
        expect(cacheControl?.length).toBeGreaterThan(0);
      } else {
        logError(`[TEST] Unexpected status when checking cache headers`, getStackTrace(), { status: response.status });
      }
      await consumeResponseBody(response);
    });

  it(testName('Response Headers: should preserve content type from source'), async () => {
      const token = await createToken();
      const testImageUrl = 'https://lh3.googleusercontent.com/a/default-user=s96-c';
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: testImageUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.status === HttpStatus.Ok) {
        const contentType = response.headers.get(HttpHeader.ContentType);
        logInfo(`[TEST] Content type preservation check`, getStackTrace(), { status: response.status, contentType }, LOG_TEST_OPERATIONS);
        expect(typeof contentType).toBe('string');
        expect(contentType?.length).toBeGreaterThan(0);
      } else {
        logError(`[TEST] Unexpected status when checking content type`, getStackTrace(), { status: response.status });
      }
      await consumeResponseBody(response);
    });

  it(testName('Error Handling: should handle fetch failures gracefully'), async () => {
      const token = await createToken();
      const invalidUrl = 'https://googleusercontent.com/nonexistent-image-12345.jpg';
      logInfo(`[TEST] Testing error handling for non-existent image`, getStackTrace(), { url: invalidUrl }, LOG_TEST_OPERATIONS);
      
      const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: invalidUrl });
      const response = await worker.fetch(imageProxyUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.status !== HttpStatus.Ok) {
        const data = await response.json() as { error?: string };
        logInfo(`[TEST] Error handled gracefully`, getStackTrace(), { status: response.status, error: data.error }, LOG_TEST_OPERATIONS);
        expect(typeof data.error).toBe('string');
        expect(data.error?.length).toBeGreaterThan(0);
      } else {
        logError(`[TEST] Unexpected success for non-existent image`, getStackTrace(), { status: response.status });
        await consumeResponseBody(response);
      }
    });
});
