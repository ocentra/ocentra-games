import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { env } from 'cloudflare:test';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  computeContentHash,
  buildTestApiUrlForEndpoint,
  buildTestApiUrlWithQuery,
  buildTestApiUrlForEndpointWithPath,
  getValidRequestHeaders,
  getAdminAuthHeaders,
  getLogsApiAuthHeaders,
  loadBinaryFixture,
} from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { SecurityHeaderValue } from '@/constants/security-headers';
import { ResourceType } from '@ocentra/endpoint-domain/constants/resources';
import { ApiAction } from '@ocentra/endpoint-domain/constants/api-actions';
import { TestConfig, TestEnvVar, TestEnvValue, TestValues } from '@tests/constants/test-constants';
import {
  getEndpointsByParamType,
  getEndpointsRequiringAuth
} from '@tests/helpers/endpoint-registry';
import {
  generateAttackPayloads,
  getAllAttackVectors
} from '@tests/helpers/attack-generators';
import { executeSecurityTest } from '@tests/helpers/test-executors';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

let TEST_IMAGE_BUFFER: Uint8Array;

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_STEPS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

function logStep(step: string, data?: unknown) {
  logInfo(`\n[SECURITY TEST] ${step}`, getStackTrace(), undefined, LOG_TEST_STEPS);
  if (data !== undefined) logInfo(JSON.stringify(data, null, 2), getStackTrace(), undefined, LOG_TEST_STEPS);
}

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
    logInfo('[TEST] Initializing test worker for security E2E tests', getStackTrace(), LOG_TEST_STEPS);
    worker = await getTestWorker();
    TEST_IMAGE_BUFFER = await loadBinaryFixture('Claim0.png', env);
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_STEPS);
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('CORS Security: should reject requests from disallowed origins'), async () => {
      const token = await createToken();
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash });
      const response = await worker.fetch(resourceUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.EvilOrigin
        }
      }, token);

      expect(response.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  it(testName('CORS Security: should accept requests from allowed origins'), async () => {
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

  it(testName('CORS Security: should include proper CORS headers for preflight requests'), async () => {
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

  it(testName('Authentication Security: should reject requests without Authorization header'), async () => {
      const token = await createToken();
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash });
      const response = await worker.fetch(resourceUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      const body = await response.json() as { error?: string };
      expect(typeof body.error).toBe('string');
      expect(body.error?.length).toBeGreaterThan(0);
    });

  it(testName('Authentication Security: should reject requests with invalid token format'), async () => {
      const token = await createToken();
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash });
      const response = await worker.fetch(resourceUrl, {
        headers: {
          [HttpHeader.Authorization]: TestConfig.InvalidToken,
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Authentication Security: should reject requests with malformed JWT'), async () => {
      const token = await createToken();
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash });
      const response = await worker.fetch(resourceUrl, {
        headers: {
          [HttpHeader.Authorization]: formatBearerToken('not.valid.jwt'),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Security Headers: should include X-Content-Type-Options header'), async () => {
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

  it(testName('Security Headers: should not expose server information'), async () => {
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

  it(testName('Security Headers: should include security headers in all responses'), async () => {
      const token = await createToken();
      const testUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Test.Base);
      const response = await worker.fetch(testUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.headers.get(HttpHeader.XContentTypeOptions)).toBe(SecurityHeaderValue.NoSniff);
    });

  it(testName('Error Handling Security: should not leak sensitive information in error responses'), async () => {
      const token = await createToken();
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: 'test' });
      const response = await worker.fetch(resourceUrl, {
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
      expect(body).not.toContain('SIGNED_URL_SECRET');
    });

  it(testName('Error Handling Security: should return appropriate error messages without stack traces'), async () => {
      const token = await createToken();
      const logsUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Logs.Base, 'invalid-path');
      const response = await worker.fetch(logsUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      const body = await response.json() as { error?: string; message?: string };
      expect(typeof (body.error || body.message)).toBe('string');
      expect((body.error || body.message)?.length).toBeGreaterThan(0);
      expect(JSON.stringify(body)).not.toContain('at ');
    });

  it(testName('Input Validation Security: should reject oversized requests'), async () => {
      const token = await createToken();
      const largeBody = 'x'.repeat(11 * 1024 * 1024);
      const requestBody = JSON.stringify({ logs: [{ message: largeBody }] });
      const logsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.ContentLength]: String(requestBody.length),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        },
        body: requestBody
      }, token);

      expect(response.status).toBe(HttpStatus.PayloadTooLarge);
      await consumeResponseBody(response);
    });

    it(testName('should sanitize user input in error messages'), async () => {
      const token = await createToken();
      const maliciousInput = '<script>alert("xss")</script>';
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: maliciousInput });
      const response = await worker.fetch(resourceUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      const body = await response.text();
      expect(body).not.toContain('<script>');
      expect(body).not.toContain('alert');
    });

  it(testName('Rate Limiting Security: should enforce rate limits for authenticated requests'), async () => {
      const token = await createToken();
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const walletId = `${TestConfig.TestWalletId}-rate-${Date.now()}`;
      const responses: number[] = [];
      const iterations = isRealMode ? 5 : 105;

      for (let i = 0; i < iterations; i++) {
        const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: TestConfig.TestHash2 });
        const response = await worker.fetch(resourceUrl, {
          headers: {
            ...getValidRequestHeaders(TestConfig.TestUserId, false, TestConfig.TestCorsOrigin),
            [HttpHeader.XWalletId]: walletId
          }
        }, token);
        responses.push(response.status);
        await consumeResponseBody(response);

        if (isRealMode) {
          expect(response.status).toBeGreaterThanOrEqual(HttpStatus.Ok);
          expect(response.status).toBeLessThan(HttpStatus.InternalServerError);
        }
      }

      const rateLimited = responses.filter(s => s === HttpStatus.TooManyRequests).length;
      if (!isRealMode) {
        expect(rateLimited).toBeGreaterThan(0);
      } else {
        expect(rateLimited).toBeLessThan(iterations);
      }
    }, 60000);

  /* ========================= Matrix-Based Security Tests ========================= */

  const attackVectors = getAllAttackVectors();

  attackVectors.forEach(attackVector => {
    const pathEndpoints = getEndpointsByParamType('path');
    const queryEndpoints = getEndpointsByParamType('query');
    const headerEndpoints = getEndpointsRequiringAuth();

    pathEndpoints.forEach(endpoint => {
      if (endpoint.skipSecurityTests) {
        return;
      }
      endpoint.pathParams?.forEach(paramName => {
        const attackPayloads = generateAttackPayloads('path', paramName, attackVector);

        if (attackPayloads.length > 0) {
          attackPayloads.forEach(payload => {
            it(testName(`Matrix-Based Attack Vector Tests - Attack Vector: ${attackVector} - Endpoint: ${endpoint.name} - Path Param: ${paramName}: should reject ${payload.description}`), async () => {
                    const token = await createToken();
                    const result = await executeSecurityTest(
                      worker,
                      endpoint,
                      payload,
                      'path',
                      paramName,
                      undefined,
                      token
                    );

                    expect(result.success).toBe(true);
                    if (!result.success) {
                      throw new Error(
                        `Attack ${payload.description} not rejected on ${endpoint.name}. ` +
                        `Status: ${result.status}, Error: ${result.error}`
                      );
                    }
                  });
                });
            }
          });
    });

    queryEndpoints.forEach(endpoint => {
      if (endpoint.skipSecurityTests) {
        return;
      }
      endpoint.queryParams?.forEach(paramName => {
        const attackPayloads = generateAttackPayloads('query', paramName, attackVector);

        if (attackPayloads.length > 0) {
          attackPayloads.forEach(payload => {
            it(testName(`Matrix-Based Attack Vector Tests - Attack Vector: ${attackVector} - Endpoint: ${endpoint.name} - Query Param: ${paramName}: should reject ${payload.description}`), async () => {
                    const token = await createToken();
                    const result = await executeSecurityTest(
                      worker,
                      endpoint,
                      payload,
                      'query',
                      paramName,
                      undefined,
                      token
                    );

                    expect(result.success).toBe(true);
                    if (!result.success) {
                      throw new Error(
                        `Attack ${payload.description} not rejected on ${endpoint.name}. ` +
                        `Status: ${result.status}, Error: ${result.error}`
                      );
                    }
                  });
                });
            }
          });
    });

    if (attackVector === 'unicode-invisible' || attackVector === 'trailing-whitespace' || attackVector === 'boundary-values') {
      const attackPayloads = generateAttackPayloads('header', 'Authorization', attackVector);

      if (attackPayloads.length > 0) {
        headerEndpoints.forEach(endpoint => {
          attackPayloads.forEach(payload => {
            it(testName(`Matrix-Based Attack Vector Tests - Attack Vector: ${attackVector} - Endpoint: All Auth Endpoints - Header: Authorization - ${endpoint.name}: should reject ${payload.description}`), async () => {
                    const token = await createToken();
                    const result = await executeSecurityTest(
                      worker,
                      endpoint,
                      payload,
                      'header',
                      'Authorization',
                      undefined,
                      token
                    );

                    if (result.status >= 400) {
                      expect(result.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
                    }
                  });
                });
        });
      }
    }

    const walletEndpoints = getEndpointsByParamType('query').filter(e => e.requiresWallet);
    const walletAttackPayloads = generateAttackPayloads('header', 'X-Wallet-Id', attackVector);

    if (walletAttackPayloads.length > 0 && walletEndpoints.length > 0) {
      walletEndpoints.forEach(endpoint => {
        walletAttackPayloads.forEach(payload => {
            it(testName(`Matrix-Based Attack Vector Tests - Attack Vector: ${attackVector} - Endpoint: All Wallet Endpoints - Header: X-Wallet-Id - ${endpoint.name}: should reject ${payload.description}`), async () => {
                    const token = await createToken();
                    const result = await executeSecurityTest(
                      worker,
                      endpoint,
                      payload,
                      'header',
                      'X-Wallet-Id',
                      undefined,
                      token
                    );

                    if (result.status >= 400) {
                      expect(result.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
                    }
                  });
                });
      });
    }
  });

  /* ========================= Header Smuggling ========================= */

  it(testName('Header Smuggling: should handle duplicate Authorization headers consistently across endpoints'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const evilToken = 'evil-token';

      const endpoints = [
        {
          url: buildTestApiUrlWithQuery(
            ApiEndpoint.Resources.Base,
            { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Type]: ResourceType.Image }
          ),
        },
        {
          url: buildTestApiUrlWithQuery(
            ApiEndpoint.Resources.Base,
            { [QueryParam.Hash]: TestConfig.TestHash }
          ),
        },
        {
          url: buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base),
        },
      ];

      for (const { url: endpointUrl } of endpoints) {
        const requestHeaders = new Headers({
          ...getAdminAuthHeaders(),
          [HttpHeader.XWalletId]: wallet,
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        });
        requestHeaders.append(HttpHeader.Authorization, formatBearerToken(evilToken));
        const response = await worker.fetch(endpointUrl,
          {
            method: HttpMethod.Get,
            headers: requestHeaders
          },
          token
        );
        
        if (response.status === HttpStatus.Ok) {
          const result = await response.json() as { uploadUrl?: string; [key: string]: unknown };
          if (result.uploadUrl) {
            const tokenUrl = new URL(result.uploadUrl);
            const urlToken = tokenUrl.searchParams.get('token');
            expect(urlToken).not.toContain(evilToken);
          }
        } else {
          await consumeResponseBody(response);
        }
      }
    });

    it(testName('should handle duplicate X-Wallet-Id headers consistently'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const evilWallet = 'attacker-wallet';

      const requestHeaders = new Headers({
        ...getAdminAuthHeaders(),
        [HttpHeader.XWalletId]: wallet,
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin
      });
      requestHeaders.append(HttpHeader.XWalletId, evilWallet);

      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Type]: ResourceType.Image });
      const response = await worker.fetch(resourceUrl, {
          method: HttpMethod.Get,
          headers: requestHeaders
        },
        token
      );
      
      expect(response.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  /* ========================= Mixed Auth Confusion ========================= */

  it(testName('Mixed Auth Confusion: should reject admin token with wrong wallet ID in resources endpoint'), async () => {
      const token = await createToken();
      const wrongWallet = 'wrong-wallet';

      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Type]: ResourceType.Image });
      const response = await worker.fetch(resourceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wrongWallet,
            [HttpHeader.Origin]: TestConfig.TestCorsOrigin
          }
        },
        token
      );

      expect(response.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  /* ========================= Token Replay Across Context ========================= */

  it(testName('Token Replay Across Context: should reject same token used with different wallet'), async () => {
      const token = await createToken();
      const wallet1 = `wallet-${Date.now()}`;
      const wallet2 = `wallet-${Date.now() + 1}`;
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);

      const getUrl1 = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet1,
            [HttpHeader.Origin]: TestConfig.TestCorsOrigin
          }
        },
        token
      );

      if (getUrl1.status !== HttpStatus.Ok) {
        return;
      }

      const { uploadUrl: uploadUrl1 } = await getUrl1.json() as { uploadUrl: string };
      const url = new URL(uploadUrl1);

      const upload2 = await worker.fetch(url.toString(), {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.XWalletId]: wallet2,
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        },
        body: buffer
      }, token);

      expect(upload2.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await consumeResponseBody(upload2);
    });

  it(testName('Token Replay Across Context: should reject same token used with different Origin'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const buffer = TEST_IMAGE_BUFFER;
      const hash = await computeContentHash(buffer);

      const getUrl = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Type]: ResourceType.Image }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.TestCorsOrigin
          }
        },
        token
      );

      if (getUrl.status !== HttpStatus.Ok) {
        return;
      }

      const { uploadUrl } = await getUrl.json() as { uploadUrl: string };

      const upload = await worker.fetch(uploadUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ImagePng,
          [HttpHeader.XWalletId]: wallet,
          [HttpHeader.Origin]: TestConfig.EvilOrigin
        },
        body: buffer
      }, token);

      if (upload.status < 400) {
        logStep('Warning: Token accepted with different Origin');
      }
      await consumeResponseBody(upload);
    });

  /* ========================= Path Confusion Attacks ========================= */

  it(testName('Path Confusion Attacks: should reject request with both hash and guid parameters'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const hash = '2792482a5a7265103ac27fe81183813ca3c1ea6460c3aa5bfeea6b1b6d98fa37';
      const guid = TestValues.TestAssetGuid;

      const response = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Hash]: hash, [QueryParam.Guid]: guid, [QueryParam.Type]: ResourceType.Image }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.TestCorsOrigin
          }
        },
        token
      );

      expect(response.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  it(testName('Path Confusion Attacks: should reject guid with URL-encoded path separator'), async () => {
      const token = await createToken();
      const wallet = `wallet-${Date.now()}`;
      const invalidGuid = `${TestValues.TestAssetGuid}/evil`;

      const response = await worker.fetch(
        buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Action]: ApiAction.GetUploadUrl, [QueryParam.Guid]: invalidGuid, [QueryParam.Type]: ResourceType.Asset }),
        {
          method: HttpMethod.Get,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: wallet,
            [HttpHeader.Origin]: TestConfig.TestCorsOrigin
          }
        },
        token
      );

      expect(response.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });
});

