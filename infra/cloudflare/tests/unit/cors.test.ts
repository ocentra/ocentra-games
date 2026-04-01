import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { CorsTestHelper } from '@tests/helpers/cors-test-helper';
import { buildTestApiUrlForEndpoint, getValidOriginHeaders } from '@tests/helpers/test-helpers';
import { EnvironmentValidator } from '@/validators/environment-validator';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { SecurityHeaderValue } from '@/constants/security-headers';
import { CorsOrigin, CorsMethods, CorsHeaders } from '@/constants/cors';
import { CorsMaxAge } from '@/constants/security-headers';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { SecuritySsrfDangerousScheme } from '@/constants/security-monitoring';
import { TestConfig } from '@tests/constants/test-constants';
import type { Env } from '@/constants/env';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { validateCorsOrigin, getCorsHeaders } from '@/utils/cors';

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

function createProductionEnv(corsOrigin: string, corsAllowedOrigins?: string): Env {
  return {
    MATCHES_BUCKET: {} as unknown as Env['MATCHES_BUCKET'],
    MATCH_COORDINATOR: {} as unknown as Env['MATCH_COORDINATOR'],
    ENVIRONMENT: Environment.Production,
    CORS_ORIGIN: corsOrigin,
    CORS_ALLOWED_ORIGINS: corsAllowedOrigins,
  };
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  let worker: Awaited<ReturnType<typeof CorsTestHelper.createDevelopmentWorker>>;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for CORS tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    worker = await CorsTestHelper.createDevelopmentWorker();
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('development: allows wildcard origin in development'), async () => {
    const token = await createToken();
    logInfo('[TEST] Testing wildcard origin in development', getStackTrace(), { origin: TestConfig.LocalhostOrigin }, LOG_TEST_OPERATIONS);
    await CorsTestHelper.expectOriginAllowed(
      worker,
      TestConfig.LocalhostOrigin,
      TestConfig.LocalhostOrigin,
      token
    );
    logInfo('[TEST] Wildcard origin test completed', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      await CorsTestHelper.expectOriginAllowed(
        worker,
        TestConfig.LocalhostOrigin,
        TestConfig.LocalhostOrigin,
        token
      );
    } catch (error) {
      logError('[TEST] Wildcard origin test failed', getStackTrace(), { error, origin: TestConfig.LocalhostOrigin });
      throw error;
    }
  });

  it(testName('development: uses request origin when wildcard is set in dev'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing request origin when wildcard is set', getStackTrace(), { origin: TestConfig.LocalhostOrigin }, LOG_TEST_RESPONSE_DETAILS);
      try {
        await CorsTestHelper.expectOriginAllowed(
          worker,
          TestConfig.LocalhostOrigin,
          TestConfig.LocalhostOrigin,
          token
        );
      } catch (error) {
        logError('[TEST] Request origin test failed', getStackTrace(), { error, origin: TestConfig.LocalhostOrigin });
        throw error;
      }
  });

  it(testName('development: uses whitelist in development when provided'), async () => {
      const token = await createToken();
      const whitelistWorker = await CorsTestHelper.createDevelopmentWorker({
        allowedOrigins: [TestConfig.LocalhostOrigin, TestConfig.LocalhostOrigin2]
      });

      await CorsTestHelper.expectOriginAllowed(
        whitelistWorker,
        TestConfig.LocalhostOrigin,
        TestConfig.LocalhostOrigin,
        token
      );
  });

  it(testName('development: still allows non-whitelisted origins in dev when wildcard set'), async () => {
      const token = await createToken();
      await CorsTestHelper.expectOriginAllowed(
        worker,
        TestConfig.LocalhostOrigin3,
        TestConfig.LocalhostOrigin3,
        token
      );
  });

  it(testName('production: allows specific origin in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.TestCorsOrigin);
    expect(result).toBeNull();
  });

  it(testName('production: validates request origin matches allowed origin in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.TestCorsOrigin);
    expect(result).toBeNull();
  });

  it(testName('production: sets Access-Control-Allow-Origin header for valid origin in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const headers = getCorsHeaders(prodEnv, TestConfig.TestCorsOrigin);
    expect(headers[HttpHeader.AccessControlAllowOrigin]).toBe(TestConfig.TestCorsOrigin);
  });

  it(testName('production: does not set Access-Control-Allow-Origin header for invalid origin in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const headers = getCorsHeaders(prodEnv, TestConfig.EvilOrigin);
    expect(headers[HttpHeader.AccessControlAllowOrigin]).toBeUndefined();
  });

  it(testName('production: rejects mismatched origin in production'), async () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.EvilOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
    const body = await result!.json() as { error: string; message: string };
    expect(body.error).toBe(ErrorMessage.Forbidden);
    expect(body.message).toBe('Origin not allowed');
  });

  it(testName('production: rejects request from localhost in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.LocalhostOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('production: rejects subdomain attacks in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.EvilSubdomainOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('production: rejects similar domain attacks in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.EvilSimilarDomainOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('environment validation: refuses to create production worker with wildcard CORS'), async () => {
    await expect(async () => {
      await CorsTestHelper.createProductionWorker(CorsOrigin.Wildcard);
    }).rejects.toThrow('Test helper: Cannot create production worker with wildcard CORS');
  });

  it(testName('environment validation: validates production environment rejects wildcard CORS'), () => {
    EnvironmentValidator.reset();
    const invalidEnv: Env = {
      ENVIRONMENT: Environment.Production,
      CORS_ORIGIN: CorsOrigin.Wildcard,
      MATCH_COORDINATOR: {} as unknown as DurableObjectNamespace,
      MATCHES_BUCKET: {} as unknown as R2Bucket,
    };

    const result = EnvironmentValidator.isValid(invalidEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].reason).toContain(ErrorMessage.CorsOriginCannotBeWildcardInProduction);
  });

  it(testName('environment validation: validates production environment requires CORS_ORIGIN'), () => {
    EnvironmentValidator.reset();
    const invalidEnv: Env = {
      ENVIRONMENT: Environment.Production,
      CORS_ORIGIN: undefined,
      MATCH_COORDINATOR: {} as unknown as DurableObjectNamespace,
      MATCHES_BUCKET: {} as unknown as R2Bucket,
    };

    const result = EnvironmentValidator.isValid(invalidEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].reason).toContain('CORS_ORIGIN must be set in production');
  });

  it(testName('environment validation: validates production environment requires HTTPS CORS_ORIGIN'), () => {
    EnvironmentValidator.reset();
    const invalidEnv: Env = {
      ENVIRONMENT: Environment.Production,
      CORS_ORIGIN: TestConfig.TestOriginExampleHttp,
      MATCH_COORDINATOR: {} as unknown as DurableObjectNamespace,
      MATCHES_BUCKET: {} as unknown as R2Bucket,
    };

    const result = EnvironmentValidator.isValid(invalidEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].reason).toContain('Production CORS_ORIGIN must use HTTPS');
  });

  it(testName('environment validation: allows valid production configuration'), () => {
    EnvironmentValidator.reset();
    const validEnv: Env = {
      ENVIRONMENT: Environment.Production,
      CORS_ORIGIN: TestConfig.TestCorsOrigin,
      MATCH_COORDINATOR: {} as unknown as DurableObjectNamespace,
      MATCHES_BUCKET: {} as unknown as R2Bucket,
    };

    const result = EnvironmentValidator.isValid(validEnv);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it(testName('CORS headers: includes all required CORS headers'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Options,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        'Access-Control-Request-Method': HttpMethod.Get
      }
    }, token);

    expect(response.headers.get(HttpHeader.AccessControlAllowOrigin)).toBe(TestConfig.LocalhostOrigin);
    expect(response.headers.get(HttpHeader.AccessControlAllowMethods)).toBe(CorsMethods.All);
    expect(response.headers.get(HttpHeader.AccessControlAllowHeaders)).toBe(CorsHeaders.Default);
    expect(response.headers.get(HttpHeader.AccessControlAllowCredentials)).toBe(QueryValue.True);
    expect(response.headers.get(HttpHeader.AccessControlMaxAge)).toBe(CorsMaxAge.Default);
  });

  it(testName('CORS headers: allows necessary HTTP methods'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Options,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        'Access-Control-Request-Method': HttpMethod.Post
      }
    }, token);

    const methods = response.headers.get(HttpHeader.AccessControlAllowMethods) || '';
    expect(methods).toContain(HttpMethod.Get);
    expect(methods).toContain(HttpMethod.Post);
    expect(methods).toContain(HttpMethod.Put);
    expect(methods).toContain(HttpMethod.Delete);
    expect(methods).toContain(HttpMethod.Options);
  });

  it(testName('CORS headers: allows necessary headers including Authorization'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Options,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        'Access-Control-Request-Headers': HttpHeader.Authorization
      }
    }, token);

    const headers = response.headers.get(HttpHeader.AccessControlAllowHeaders) || '';
    expect(headers).toContain(HttpHeader.Authorization);
    expect(headers).toContain(HttpHeader.ContentType);
    expect(headers).toContain(HttpHeader.Signature);
  });

  it(testName('CORS headers: sets credentials to true'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      headers: getValidOriginHeaders(TestConfig.LocalhostOrigin)
    }, token);

    expect(response.headers.get(HttpHeader.AccessControlAllowCredentials)).toBe(QueryValue.True);
  });

  it(testName('CORS headers: includes security headers'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      headers: getValidOriginHeaders(TestConfig.LocalhostOrigin)
    }, token);

    expect(response.headers.get(HttpHeader.XContentTypeOptions)).toBe(SecurityHeaderValue.NoSniff);
  });

  it(testName('CORS headers: sets appropriate max-age for preflight caching'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Options,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        'Access-Control-Request-Method': HttpMethod.Get
      }
    }, token);

    expect(response.headers.get(HttpHeader.AccessControlMaxAge)).toBe(CorsMaxAge.Default);
  });

  it(testName('Rule 1.1.18: origin allowed but method disallowed - preflight with PATCH does not allow PATCH'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Options,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        'Access-Control-Request-Method': 'PATCH',
      },
    }, token);
    const allowMethods = response.headers.get(HttpHeader.AccessControlAllowMethods) ?? '';
    expect(allowMethods.split(',').map((m) => m.trim())).not.toContain('PATCH');
  });

  it(testName('Rule 1.1.19: origin allowed but headers disallowed - preflight with X-Evil-Header does not allow it'), async () => {
    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Options,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        'Access-Control-Request-Method': HttpMethod.Get,
        'Access-Control-Request-Headers': 'X-Evil-Header',
      },
    }, token);
    const allowHeaders = response.headers.get(HttpHeader.AccessControlAllowHeaders) ?? '';
    expect(allowHeaders.split(',').map((h) => h.trim().toLowerCase())).not.toContain('x-evil-header');
  });

  it(testName('Rule 1.1.15: preflight is validated per origin (no cached preflight reuse across origins)'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    expect(validateCorsOrigin(prodEnv, TestConfig.TestCorsOrigin)).toBeNull();
    expect(validateCorsOrigin(prodEnv, TestConfig.EvilOrigin)).not.toBeNull();
    expect(validateCorsOrigin(prodEnv, TestConfig.EvilOrigin)?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('Rule 1.1.21: mobile WebView-style origin is rejected in production unless allowlisted'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const webViewOrigin = 'file:///android_asset/index.html';
    const result = validateCorsOrigin(prodEnv, webViewOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('Rule 1.1.22: deep-link style origin is rejected in production unless allowlisted'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const deepLinkOrigin = 'myapp://deeplink/path';
    const result = validateCorsOrigin(prodEnv, deepLinkOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('Rule 1.1.23: wallet-embedded browser style origin is rejected in production unless allowlisted'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const walletOrigin = 'https://phantom.app/embed';
    const result = validateCorsOrigin(prodEnv, walletOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('Rule 1.2.1: origin string mutation (homoglyph) is rejected in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const homoglyphOrigin = 'https://exаmple.com';
    const result = validateCorsOrigin(prodEnv, homoglyphOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('Rule 1.2.3: overlong origin string is rejected or safely handled in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const overlongOrigin = 'https://a.example.com/' + 'x'.repeat(8000);
    const result = validateCorsOrigin(prodEnv, overlongOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('Rule 1.1.24: preflight cache poisoning - concurrent CORS validation is per-origin (no cross-origin reuse)'), async () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const [resultAllowed, resultEvil] = await Promise.all([
      Promise.resolve(validateCorsOrigin(prodEnv, TestConfig.TestCorsOrigin)),
      Promise.resolve(validateCorsOrigin(prodEnv, TestConfig.EvilOrigin)),
    ]);
    expect(resultAllowed).toBeNull();
    expect(resultEvil).not.toBeNull();
    expect(resultEvil?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('edge case: handles empty origin in development'), async () => {
      const token = await createToken();
      const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
      const response = await worker.fetch(rootUrl, {
        headers: {}
      }, token);

      const origin = response.headers.get(HttpHeader.AccessControlAllowOrigin);
      expect(origin).toBe(CorsOrigin.Wildcard);
  });

  it(testName('edge case: handles undefined origin in development'), async () => {
      const token = await createToken();
      const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
      const response = await worker.fetch(rootUrl, {}, token);

      const origin = response.headers.get(HttpHeader.AccessControlAllowOrigin);
      expect(origin).toBe(CorsOrigin.Wildcard);
  });

  it(testName('edge case: handles case-sensitive origin comparison'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.TestCorsOrigin.toUpperCase());
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('edge case: handles trailing slash in origin'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, `${TestConfig.TestCorsOrigin}/`);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('attack prevention: prevents null origin bypass'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.AttackOriginNull);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('attack prevention: prevents file:// protocol bypass'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.AttackOriginFile);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('attack prevention: prevents data: URI bypass'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.AttackOriginDataUri);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('attack prevention: rejects missing Origin header in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, null);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
    const headers = getCorsHeaders(prodEnv, undefined);
    expect(headers[HttpHeader.AccessControlAllowOrigin]).toBeUndefined();
  });

  it(testName('attack prevention: rejects empty Origin header in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, '');
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
    const headers = getCorsHeaders(prodEnv, '');
    expect(headers[HttpHeader.AccessControlAllowOrigin]).toBeUndefined();
  });

  it(testName('attack prevention: rejects scheme mismatch in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    if (TestConfig.TestCorsOrigin.startsWith(SecuritySsrfDangerousScheme.Https)) {
      const httpOrigin = TestConfig.TestCorsOrigin.replace(SecuritySsrfDangerousScheme.Https, SecuritySsrfDangerousScheme.Http);
      const result = validateCorsOrigin(prodEnv, httpOrigin);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(HttpStatus.Forbidden);
    }
  });

  it(testName('attack prevention: rejects port mismatch in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const baseUrl = TestConfig.TestCorsOrigin.replace(/\/$/, '');
    const portMismatchOrigin = `${baseUrl}${TestConfig.TestPortMismatch}`;
    if (portMismatchOrigin !== TestConfig.TestCorsOrigin) {
      const result = validateCorsOrigin(prodEnv, portMismatchOrigin);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(HttpStatus.Forbidden);
    }
  });

  it(testName('attack prevention: rejects trailing dot origin in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    if (TestConfig.TestCorsOrigin.endsWith(TestConfig.TestTldSuffix)) {
      const trailingDotSuffix = `${TestConfig.TestTldSuffix}.`;
      const trailingDotOrigin = TestConfig.TestCorsOrigin.replace(TestConfig.TestTldSuffix, trailingDotSuffix);
      const result = validateCorsOrigin(prodEnv, trailingDotOrigin);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(HttpStatus.Forbidden);
    }
  });

  it(testName('attack prevention: rejects IP-based origin in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result1 = validateCorsOrigin(prodEnv, TestConfig.AttackOriginIpv4Localhost);
    expect(result1).not.toBeNull();
    expect(result1?.status).toBe(HttpStatus.Forbidden);
    
    const result2 = validateCorsOrigin(prodEnv, TestConfig.AttackOriginIpv4Private);
    expect(result2).not.toBeNull();
    expect(result2?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('attack prevention: rejects IPv6 origin in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result1 = validateCorsOrigin(prodEnv, TestConfig.AttackOriginIpv6Localhost);
    expect(result1).not.toBeNull();
    expect(result1?.status).toBe(HttpStatus.Forbidden);
    
    const result2 = validateCorsOrigin(prodEnv, TestConfig.AttackOriginIpv6Example);
    expect(result2).not.toBeNull();
    expect(result2?.status).toBe(HttpStatus.Forbidden);
  });

  it(testName('attack prevention: rejects multiple Origin headers in production'), () => {
    const prodEnv = createProductionEnv(TestConfig.TestCorsOrigin);
    const result = validateCorsOrigin(prodEnv, TestConfig.EvilOrigin);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(HttpStatus.Forbidden);
    const headers = getCorsHeaders(prodEnv, TestConfig.EvilOrigin);
    expect(headers[HttpHeader.AccessControlAllowOrigin]).toBeUndefined();
  });
});
