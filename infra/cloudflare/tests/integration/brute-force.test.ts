import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  getLogsApiAuthHeaders,
  createExpiredToken,
  createForgedToken,
} from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, HttpAuthScheme } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { LogLevel } from '@/constants/logs-api';
import { TestConfig } from '@tests/constants/test-constants';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('brute force: repeated invalid logs API keys are consistently rejected without key enumeration'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);
    const responseSignatures = new Set<string>();

    for (let i = 0; i < 20; i++) {
      const response = await worker.fetch(
        url,
        {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} invalid-key-${i}`,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
          body: JSON.stringify({
            id: `bf-${Date.now()}-${i}`,
            level: LogLevel.Info,
            message: `invalid attempt ${i}`,
            timestamp: Date.now(),
            source: 'BruteForceTest',
          }),
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Unauthorized);
      expect(response.headers.get(HttpHeader.WwwAuthenticate)).toBe(HttpAuthScheme.Bearer);
      const payload = (await response.json()) as { error?: string };
      expect(payload.error).toBe(ErrorMessage.Unauthorized);
      responseSignatures.add(`${response.status}|${payload.error}|${response.headers.get(HttpHeader.WwwAuthenticate) ?? ''}`);
    }

    expect(responseSignatures.size).toBe(1);
  });

  it(testName('brute force: invalid key spray never grants access and valid key still required'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);

    for (let i = 0; i < 10; i++) {
      const invalidResponse = await worker.fetch(
        url,
        {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} credential-spray-${i}`,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
          body: JSON.stringify({
            id: `spray-${Date.now()}-${i}`,
            level: LogLevel.Info,
            message: 'invalid credentials',
            timestamp: Date.now(),
            source: 'BruteForceTest',
          }),
        },
        token
      );
      expect(invalidResponse.status).toBe(HttpStatus.Unauthorized);
      await invalidResponse.text().catch(() => undefined);
    }

    const validResponse = await worker.fetch(
      url,
      {
        method: HttpMethod.Post,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        },
        body: JSON.stringify({
          id: `valid-after-spray-${Date.now()}`,
          level: LogLevel.Info,
          message: 'valid key should succeed',
          timestamp: Date.now(),
          source: 'BruteForceTest',
        }),
      },
      token
    );

    expect(validResponse.status).toBe(HttpStatus.Ok);
    const successPayload = (await validResponse.json()) as { success?: boolean };
    expect(successPayload.success).toBe(true);

    const invalidAfterValidResponse = await worker.fetch(
      url,
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} still-invalid`,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        },
        body: JSON.stringify({
          id: `invalid-after-valid-${Date.now()}`,
          level: LogLevel.Info,
          message: 'invalid key remains denied',
          timestamp: Date.now(),
          source: 'BruteForceTest',
        }),
      },
      token
    );

    expect(invalidAfterValidResponse.status).toBe(HttpStatus.Unauthorized);
    await invalidAfterValidResponse.text().catch(() => undefined);
  });

  it(testName('brute force Rule 14.13: protected auth endpoint rejects many invalid JWTs without enumeration'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-brute-credits`;
    const balanceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Balance(userId));
    const invalidTokens = [
      formatBearerToken('not.valid.jwt'),
      formatBearerToken('a.b.c'),
      formatBearerToken('x.y.z'),
      formatBearerToken(''),
      formatBearerToken(createExpiredToken()),
      formatBearerToken(createForgedToken()),
      ...Array.from({ length: 12 }, (_, i) => formatBearerToken(`invalid-bearer-${i}-${Date.now()}`)),
    ];
    const responseSignatures = new Set<string>();

    for (const authHeader of invalidTokens) {
      const response = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Authorization]: authHeader,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      const body = await response.text();
      const payload = body.length > 0 ? (JSON.parse(body) as { error?: string }) : {};
      responseSignatures.add(`${response.status}|${payload.error ?? ''}|${response.headers.get(HttpHeader.WwwAuthenticate) ?? ''}`);
    }

    expect(responseSignatures.size).toBe(1);
  });
});
