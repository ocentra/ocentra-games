import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { createAdminToken, getAdminAuthHeaders, getValidRequestHeaders, buildTestApiUrlForEndpoint, generateTestMatchId } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';
import { buildApiUrlWithPathAndQuery } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
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

  it(testName('Generate Signed URL: should generate signed URL for admin user'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match');
      logInfo('[TEST] Testing signed URL generation', getStackTrace(), { matchId }, LOG_TEST_OPERATIONS);
      
      const signedUrlEndpoint = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(matchId));
      const response = await worker.fetch(signedUrlEndpoint, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);
      logInfo('[TEST] Signed URL response', getStackTrace(), { status: response.status, matchId }, LOG_TEST_RESPONSE_DETAILS);

      expect(response.status).toBe(HttpStatus.Ok);
      if (response.status !== HttpStatus.Ok) {
        logError('[TEST] Unexpected status for signed URL generation', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status, matchId });
      }
      const data = await response.json() as { matchId: string; signedUrl: string; expiresIn: number; expiresAt: string };
      expect(data.matchId).toBe(matchId);
      expect(typeof data.signedUrl).toBe('string');
      expect(data.signedUrl.length).toBeGreaterThan(0);
      expect(data.signedUrl).toContain(ApiEndpoint.Matches.Base);
      expect(data.signedUrl).toContain(matchId);
      expect(data.signedUrl).toContain(QueryParam.Token);
      expect(typeof data.expiresIn).toBe('number');
      expect(data.expiresIn).toBe(3600);
      expect(typeof data.expiresAt).toBe('string');
      expect(data.expiresAt.length).toBeGreaterThan(0);
      if (data.matchId !== matchId || !data.signedUrl || !data.signedUrl.includes(ApiEndpoint.Matches.Base)) {
        logError('[TEST] Invalid signed URL response', getStackTrace(), { matchId: data.matchId, expectedMatchId: matchId, signedUrl: data.signedUrl });
      }
    });

  it(testName('Generate Signed URL: should use custom expiration time when provided'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match');
      const customExpiration = 7200;
      
      const signedUrlWithExpires = buildApiUrlWithPathAndQuery(ApiEndpoint.SignedUrl.ByMatchId(''), { matchId }, { expires: customExpiration }, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(signedUrlWithExpires, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { expiresIn: number };
      expect(data.expiresIn).toBe(customExpiration);
    });

  it(testName('Generate Signed URL: should cap expiration at maximum value'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match');
      const excessiveExpiration = 100000;
      
      const signedUrlWithExcessiveExpires = buildApiUrlWithPathAndQuery(ApiEndpoint.SignedUrl.ByMatchId(''), { matchId }, { expires: excessiveExpiration }, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(signedUrlWithExcessiveExpires, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { expiresIn: number };
    expect(data.expiresIn).toBe(86400);
  });

  it(testName('Authorization Enforcement: should reject requests without authentication'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match');
      
      const signedUrlEndpoint = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(matchId));
      const response = await worker.fetch(signedUrlEndpoint, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe(ErrorMessage.Unauthorized);
      expect(typeof data.message).toBe('string');
      expect(data.message?.length).toBeGreaterThan(0);
    });

  it(testName('Authorization Enforcement: should reject requests from non-admin users'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match');
      
      const signedUrlEndpoint = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(matchId));
      const response = await worker.fetch(signedUrlEndpoint, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error?: string; message?: string };
    expect(data.error).toBe(ErrorMessage.Forbidden);
    expect(data.message).toBe('Admin access required to generate signed URLs');
  });

  it(testName('Input Validation: should reject requests with missing matchId'), async () => {
      const token = await createToken();
      const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(''));
      const response = await worker.fetch(signedUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect([HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
      if (response.status === HttpStatus.BadRequest) {
        const data = await response.json() as { error?: string };
        expect(data.error).toBe(ErrorMessage.BadRequest);
      }
      await consumeResponseBody(response);
    });

  it(testName('Input Validation: should reject invalid HTTP methods'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match');
      
      const signedUrlEndpoint = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(matchId));
      const response = await worker.fetch(signedUrlEndpoint, {
        method: HttpMethod.Post,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

    expect(response.status).toBe(HttpStatus.MethodNotAllowed);
    await consumeResponseBody(response);
  });

  it(testName('Signed URL Structure: should generate valid URL structure with token'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match');
      
      const signedUrlEndpoint = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(matchId));
      const response = await worker.fetch(signedUrlEndpoint, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { signedUrl: string };
      const url = new URL(data.signedUrl);
      expect(url.pathname).toBe(`${ApiEndpoint.Matches.Base}/${matchId}`);
      expect(url.searchParams.has(QueryParam.Token)).toBe(true);
      const urlToken = url.searchParams.get(QueryParam.Token);
      expect(typeof urlToken).toBe('string');
      expect(urlToken!.length).toBeGreaterThan(0);
    });

  it(testName('Signed URL Structure: should include expiration timestamp in response'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match');
      const beforeRequest = Date.now();
      
      const signedUrlEndpoint = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(matchId));
      const response = await worker.fetch(signedUrlEndpoint, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const afterRequest = Date.now();
      const data = await response.json() as { expiresAt: string; expiresIn: number };
      const expiresAtTimestamp = new Date(data.expiresAt).getTime();
      const expectedMin = beforeRequest + (data.expiresIn * 1000) - 1000;
      const expectedMax = afterRequest + (data.expiresIn * 1000) + 1000;
      expect(expiresAtTimestamp).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAtTimestamp).toBeLessThanOrEqual(expectedMax);
    });

  // SKIP: Cannot test missing bindings in pool mode - all workers share same miniflare config
  // This test would need unstable mode with custom wrangler config to work
  it.skip(testName('Configuration Validation: should return InternalServerError when SIGNED_URL_SECRET is missing'), async () => {
      const token = await createToken();
      if (!worker) {
        throw new Error('PREREQUISITE FAILED: Worker not initialized');
      }

      const workerWithoutSecret = await getTestWorker();
      const adminToken = createAdminToken();
      if (!adminToken) {
        throw new Error('PREREQUISITE FAILED: Admin token creation failed');
      }

      const matchId = generateTestMatchId('test-match');
      const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(matchId));
      
      if (!signedUrl || !signedUrl.includes(ApiEndpoint.SignedUrl.ByMatchId(matchId))) {
        throw new Error(`PREREQUISITE FAILED: Invalid signed URL: ${signedUrl}`);
      }

      logInfo('Making signed URL request without secret', getStackTrace(), {
        url: signedUrl,
        endpoint: ApiEndpoint.SignedUrl.ByMatchId(matchId),
      }, LOG_TEST_OPERATIONS);

      const response = await workerWithoutSecret.fetch(signedUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Authorization]: formatBearerToken(adminToken),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (!response) {
        throw new Error('PREREQUISITE FAILED: No response received from worker');
      }

      logInfo('Received response', getStackTrace(), {
        status: response.status,
        statusText: response.statusText,
        expectedStatus: HttpStatus.InternalServerError,
      }, LOG_TEST_RESPONSE_DETAILS);

      if (response.status !== HttpStatus.InternalServerError) {
        const body = await response.text().catch(() => 'Unable to read response body');
        logError('Unexpected response status', getStackTrace(), {
          expected: HttpStatus.InternalServerError,
          actual: response.status,
          statusText: response.statusText,
          body: body.substring(0, 500),
          url: signedUrl,
        });
        throw new Error(`Expected ${HttpStatus.InternalServerError} InternalServerError but got ${response.status} ${response.statusText}. Response body: ${body.substring(0, 500)}`);
      }

      expect(response.status).toBe(HttpStatus.InternalServerError);
      const text = await response.text();
      expect(text).toBe('Signed URL secret not configured');

      if (workerWithoutSecret.stop) await workerWithoutSecret.stop();
  });
});
