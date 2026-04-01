import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { createAdminToken, getAdminAuthHeaders, buildTestApiUrlForEndpointWithPath } from '@tests/helpers/test-helpers';
import { CorsOrigin } from '@/constants/cors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpAuthScheme } from '@ocentra/endpoint-domain/constants/http';
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
  let adminToken: string;
  const walletId = `test-wallet-header-${Date.now()}`;

  beforeAll(async () => {
    adminToken = createAdminToken();
    logInfo('[TEST] Initializing test worker for header injection tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('CRLF Injection in Authorization Header: should reject CRLF injection with URL encoding'), async () => {
    const token = await createToken();
    const maliciousAuth = `${HttpAuthScheme.Bearer} ${adminToken}%0D%0AX-Admin: true`;
    const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
    const response = await worker.fetch(matchUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Authorization]: maliciousAuth,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      }
    }, token);

    expect([HttpStatus.BadRequest, HttpStatus.Unauthorized, HttpStatus.Forbidden]).toContain(response.status);
    await consumeResponseBody(response);
  });

  it(testName('CRLF Injection in X-Wallet-Id Header: should reject CRLF injection with URL encoding in X-Wallet-Id'), async () => {
      const token = await createToken();
      const maliciousWalletId = `${walletId}%0D%0AX-Admin: true`;
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.XWalletId]: maliciousWalletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

    expect([HttpStatus.BadRequest, HttpStatus.Unauthorized, HttpStatus.Forbidden]).toContain(response.status);
  });

  it(testName('CRLF Injection in Origin Header: should reject CRLF injection with URL encoding in Origin'), async () => {
      const token = await createToken();
      const maliciousOrigin = `${TestConfig.LocalhostOrigin}%0D%0AAccess-Control-Allow-Origin: ${CorsOrigin.Wildcard}`;
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: maliciousOrigin,
          [HttpHeader.XWalletId]: walletId
        }
      }, token);

    expect([HttpStatus.BadRequest, HttpStatus.Unauthorized, HttpStatus.Forbidden]).toContain(response.status);
    await consumeResponseBody(response);
  });

  // NOTE: Raw CRLF and null byte injection tests are in security/header-injection-raw.test.ts
  // which uses raw TCP sockets to bypass Fetch API validation and test worker defense directly.

  it(testName('Response Header Safety (Invariant Test): should never emit CRLF in response headers'), async () => {
      const token = await createToken();
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      for (const [key, value] of response.headers.entries()) {
        expect(key).not.toContain('\r');
        expect(key).not.toContain('\n');
        expect(value).not.toContain('\r');
        expect(value).not.toContain('\n');
      }
  });

  it(testName('Response Header Safety (Invariant Test): should never emit null bytes in response headers'), async () => {
      const token = await createToken();
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      for (const [key, value] of response.headers.entries()) {
        expect(key).not.toContain('\0');
        expect(value).not.toContain('\0');
      }
      await consumeResponseBody(response);
  });

  it(testName('Valid Headers Should Work: should accept valid Authorization header'), async () => {
      const token = await createToken();
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status === HttpStatus.Ok || response.status === HttpStatus.NotFound).toBe(true);
  });

  it(testName('Valid Headers Should Work: should accept valid X-Wallet-Id header'), async () => {
    const token = await createToken();
    const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.XWalletId]: walletId,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

    expect(response.status === HttpStatus.Ok || response.status === HttpStatus.NotFound).toBe(true);
    await consumeResponseBody(response);
  });
});
