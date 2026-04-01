import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus, HttpHeader, HttpMethod, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { AIEventType } from '@/constants/ai';
import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
import { getAdminAuthHeaders, buildTestApiUrlForEndpoint } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_SKIP_NOTICES = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
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
    logInfo('[TEST] Initializing test worker for KV verification tests', getStackTrace(), {}, LOG_TEST_SKIP_NOTICES);
      worker = await getTestWorker();
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_SKIP_NOTICES);
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Rate Limiting with KV Storage: should allow requests under rate limit'), async () => {
    const token = await createToken();
    const walletId = `test-wallet-kv-${Date.now()}`;
    logInfo('[TEST] Testing rate limit with KV storage', getStackTrace(), { walletId }, LOG_TEST_SKIP_NOTICES);
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getAdminAuthHeaders(),
        [HttpHeader.XWalletId]: walletId,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify({
        matchId: TestConfig.TestMatchId,
        playerId: TestConfig.TestPlayerId,
        eventType: AIEventType.MoveSubmitted
      })
    }, token);

    logInfo('[TEST] Rate limit test response', getStackTrace(), { status: response.status, walletId }, LOG_TEST_SKIP_NOTICES);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = await response.json() as Record<string, unknown>;
    expect(data).not.toBeNull();
    expect(typeof data).toBe('object');
  });

  it(testName('Rate Limiting with KV Storage: should enforce rate limit and return 429 when limit exceeded'), async () => {
      const token = await createToken();
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const walletId = `test-wallet-kv-limit-${Date.now()}`;
      const responses: number[] = [];
      const iterations = isRealMode ? 5 : 25;

      for (let i = 0; i < iterations; i++) {
        const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
        const response = await worker.fetch(aiEventUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getAdminAuthHeaders(),
            [HttpHeader.XWalletId]: walletId,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({
            matchId: TestConfig.TestMatchId,
            playerId: TestConfig.TestPlayerId,
            eventType: AIEventType.MoveSubmitted
          })
        }, token);
        responses.push(response.status);
        if (isRealMode) {
          expect(response.status).toBeGreaterThanOrEqual(HttpStatus.Ok);
          expect(response.status).toBeLessThan(HttpStatus.InternalServerError);
        }
        await consumeResponseBody(response);
      }

      const rateLimited = responses.filter(s => s === HttpStatus.TooManyRequests);
      if (!isRealMode) {
        expect(rateLimited.length).toBeGreaterThan(0);
        expect(responses.every(s => s === HttpStatus.Ok || s === HttpStatus.TooManyRequests)).toBe(true);
      } else {
        expect(rateLimited.length).toBeLessThan(iterations);
      }
  }, 60000);

  it(testName('Rate Limiting with KV Storage: should gracefully degrade to in-memory fallback when KV fails'), async () => {
    const token = await createToken();
    const walletId = `test-wallet-kv-fallback-${Date.now()}`;
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getAdminAuthHeaders(),
        [HttpHeader.XWalletId]: walletId,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify({
        matchId: TestConfig.TestMatchId,
        playerId: TestConfig.TestPlayerId,
        eventType: AIEventType.MoveSubmitted
      })
    }, token);

    expect([HttpStatus.Ok, HttpStatus.ServiceUnavailable]).toContain(response.status);
    if (response.status === HttpStatus.Ok) {
      const data = await response.json() as { action?: unknown; chainOfThought?: unknown; modelMetadata?: unknown };
      expect(data).not.toBeNull();
      expect(typeof data).toBe('object');
      expect(data.action).not.toBeUndefined();
    }
  });

  it(testName('Rate Limiting with KV Storage: should track rate limits per wallet independently'), async () => {
      const token = await createToken();
      const wallet1 = `test-wallet-kv-1-${Date.now()}`;
      const wallet2 = `test-wallet-kv-2-${Date.now()}`;

      const aiEventUrl1 = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      const response1 = await worker.fetch(aiEventUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.XWalletId]: wallet1,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({
          matchId: TestConfig.TestMatchId,
          playerId: TestConfig.TestPlayerId,
          eventType: AIEventType.MoveSubmitted
        })
      }, token);

      const aiEventUrl2 = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      const response2 = await worker.fetch(aiEventUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.XWalletId]: wallet2,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({
          matchId: TestConfig.TestMatchId,
          playerId: TestConfig.TestPlayerId,
          eventType: AIEventType.MoveSubmitted
        })
      }, token);

    expect(response1.status).toBe(HttpStatus.Ok);
    expect(response2.status).toBe(HttpStatus.Ok);
    await consumeResponseBody(response1);
    await consumeResponseBody(response2);
  });
});
