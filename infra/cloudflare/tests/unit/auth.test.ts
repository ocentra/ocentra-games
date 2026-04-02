import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { createExpiredToken, createForgedToken, createTokenWithInvalidIssuer, createTokenWithInvalidAudience, buildTestApiUrlForEndpoint, getValidOriginHeaders } from '@tests/helpers/test-helpers';
import { AUTH_PROBE_URL, authProbeRequestInit } from '@tests/helpers/auth-probe-request';
import { formatBearerToken } from '@/utils/auth';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestTokenValue } from '@ocentra/endpoint-domain/constants/auth';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = true;
const LOG_TEST_RESPONSE_DETAILS = true;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

function createJwtWithAlgorithm(algorithm: string): string {
  const header = Buffer.from(JSON.stringify({ alg: algorithm, kid: TestConfig.AttackerKeyId, typ: TestConfig.JwtType })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    user_id: TestConfig.TestUserId,
    sub: TestConfig.TestUserId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: `https://securetoken.google.com/${TestConfig.FirebaseProjectId}`,
    aud: TestConfig.FirebaseProjectId,
  })).toString('base64url');
  const signature = algorithm === 'none' ? '' : Buffer.from('invalid-signature').toString('base64url');
  return `${header}.${payload}.${signature}`;
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for auth unit tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Test worker initialized', getStackTrace(), LOG_TEST_OPERATIONS);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 60_000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker?.stop) await worker.stop();
  });

  it(testName('auth: rejects requests without Authorization header'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing auth rejection for missing Authorization header', getStackTrace(), LOG_TEST_OPERATIONS);
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit(getValidOriginHeaders(TestConfig.TestCorsOrigin)), token);

      logInfo('[TEST] Auth rejection response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      if (response.status !== HttpStatus.Unauthorized) {
        logError('[TEST] Auth not rejected for missing header', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
      }
      const body = await response.json() as { error?: string };
      expect(typeof body.error).toBe('string');
      expect(body.error?.length).toBeGreaterThan(0);
      if (!body.error || body.error.length === 0) {
        logError('[TEST] Missing error message in auth rejection', getStackTrace(), { body });
      }
  });

  it(testName('auth: rejects requests with invalid token format'), async () => {
      const token = await createToken();
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit({
        ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
        [HttpHeader.Authorization]: TestConfig.InvalidTokenFormat
      }), token);

      logInfo('[TEST] Invalid token format response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      if (response.status !== HttpStatus.Unauthorized) {
        logError('[TEST] Invalid token format not rejected', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
      }
  });

  it(testName('auth: rejects requests with malformed JWT'), async () => {
      const token = await createToken();
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit({
        ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
        [HttpHeader.Authorization]: formatBearerToken(TestTokenValue.NotValidJwt)
      }), token);

      logInfo('[TEST] Malformed JWT response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      if (response.status !== HttpStatus.Unauthorized) {
        logError('[TEST] Malformed JWT not rejected', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
      }
  });

  it(testName('auth: rejects algorithm-confusion token with alg=none'), async () => {
      const token = await createToken();
      const algNoneToken = createJwtWithAlgorithm('none');
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit({
        ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
        [HttpHeader.Authorization]: formatBearerToken(algNoneToken)
      }), token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('auth: rejects algorithm-confusion token with HS256 header'), async () => {
      const token = await createToken();
      const hs256Token = createJwtWithAlgorithm('HS256');
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit({
        ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
        [HttpHeader.Authorization]: formatBearerToken(hs256Token),
      }), token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('auth: rejects requests with invalid token structure'), async () => {
      const token = await createToken();
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit({
        ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
        [HttpHeader.Authorization]: formatBearerToken(TestTokenValue.InvalidToken)
      }), token);

      logInfo('[TEST] Invalid token structure response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('auth: rejects requests with expired token'), async () => {
      const token = await createToken();
      const expiredToken = createExpiredToken();
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit({
        ...getValidOriginHeaders(TestConfig.TestOriginExample),
        [HttpHeader.Authorization]: formatBearerToken(expiredToken)
      }), token);

      logInfo('[TEST] Expired token response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('auth: rejects requests with invalid issuer'), async () => {
      const token = await createToken();
      const invalidIssuerToken = createTokenWithInvalidIssuer();
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit({
        ...getValidOriginHeaders(TestConfig.TestOriginExample),
        [HttpHeader.Authorization]: formatBearerToken(invalidIssuerToken),
      }), token);

      logInfo('[TEST] Invalid issuer response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('auth: rejects requests with invalid audience'), async () => {
      const token = await createToken();
      const invalidAudToken = createTokenWithInvalidAudience();
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit({
        ...getValidOriginHeaders(TestConfig.TestOriginExample),
        [HttpHeader.Authorization]: formatBearerToken(invalidAudToken)
      }), token);

      logInfo('[TEST] Invalid audience response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('auth: rejects requests with forged signature'), async () => {
      const token = await createToken();
      const forgedToken = createForgedToken();
      const response = await worker.fetch(AUTH_PROBE_URL, authProbeRequestInit({
        ...getValidOriginHeaders(TestConfig.TestOriginExample),
        [HttpHeader.Authorization]: formatBearerToken(forgedToken)
      }), token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('protected endpoints: require auth for match uploads'), async () => {
      const token = await createToken();
      const matchUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Matches.ById(TestConfig.TestMatchId));
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({ match_id: TestConfig.TestMatchId })
      }, token);

      logInfo('[TEST] Match upload auth response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('protected endpoints: require auth for dispute creation'), async () => {
      const token = await createToken();
      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const response = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({ dispute_id: TestConfig.TestDisputeId })
      }, token);

      logInfo('[TEST] Dispute creation auth response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('protected endpoints: require auth for data export'), async () => {
      const token = await createToken();
      const dataExportUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(TestConfig.TestUserId));
      const response = await worker.fetch(dataExportUrl, {
        headers: getValidOriginHeaders(TestConfig.TestCorsOrigin)
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('protected endpoints: require auth for data deletion'), async () => {
      const token = await createToken();
      const dataUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(TestConfig.TestUserId));
      const response = await worker.fetch(dataUrl, {
        method: HttpMethod.Delete,
        headers: getValidOriginHeaders(TestConfig.TestCorsOrigin)
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
  });

  it(testName('protected endpoints: require auth for AI endpoints'), async () => {
      const token = await createToken();
      const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      const response = await worker.fetch(aiEventUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidOriginHeaders(TestConfig.TestCorsOrigin),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({ matchId: TestConfig.TestMatchId, playerId: TestConfig.TestUserId })
      }, token);

    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });
});

