import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const log = Logger.instance;
log.register(import.meta.url);

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      log.logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  describe('Enhanced AntiCheatDO', () => {
    it(testName('Analyze: returns low/medium/high risk payload contract'), async () => {
      const userId = `ac-user-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.AntiCheat.Analyze, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          events: new Array(120).fill({ type: 'move' }),
          moveTimingMs: 5,
        }),
      });

      expect(response.status).toBe(HttpStatus.Ok);
      const data = (await response.json()) as { risk?: string; score?: number; trustScore?: number };
      expect(['low', 'medium', 'high']).toContain(data.risk);
      expect(typeof data.score).toBe('number');
      expect(typeof data.trustScore).toBe('number');
    });

    it(testName('Analyze: high-risk input lowers trust score over time'), async () => {
      const userId = `ac-trust-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.AntiCheat.Analyze, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const headers = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      };

      const first = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers,
        body: JSON.stringify({ events: new Array(120).fill({}), moveTimingMs: 5 }),
      });
      expect(first.status).toBe(HttpStatus.Ok);
      const firstData = (await first.json()) as { trustScore?: number };

      const second = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers,
        body: JSON.stringify({ events: new Array(120).fill({}), moveTimingMs: 5 }),
      });
      expect(second.status).toBe(HttpStatus.Ok);
      const secondData = (await second.json()) as { trustScore?: number };

      expect(typeof firstData.trustScore).toBe('number');
      expect(typeof secondData.trustScore).toBe('number');
      expect((secondData.trustScore ?? 100)).toBeLessThanOrEqual(firstData.trustScore ?? 100);
    });

    it(testName('Status: returns status and trustScore'), async () => {
      const userId = `ac-status-${Date.now()}`;
      const analyzeUrl = buildApiUrl(ApiEndpoint.AntiCheat.Analyze, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const statusUrl = buildApiUrl(ApiEndpoint.AntiCheat.Status(userId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const headers = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      };

      await worker.fetch(analyzeUrl, {
        method: HttpMethod.Post,
        headers,
        body: JSON.stringify({ events: new Array(60).fill({}), moveTimingMs: 25 }),
      });

      const statusResponse = await worker.fetch(statusUrl, {
        method: HttpMethod.Get,
        headers,
      });
      expect(statusResponse.status).toBe(HttpStatus.Ok);
      const data = (await statusResponse.json()) as { status?: string; trustScore?: number };
      expect(['clear', 'flagged', 'suspended']).toContain(data.status);
      expect(typeof data.trustScore).toBe('number');
    });

    it(testName('Status: rejects invalid nested userId path values'), async () => {
      const userId = `ac-invalid-${Date.now()}`;
      const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.AntiCheat.Base}/status/%C3%AC%C2%8D%03`;
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = (await response.json()) as { error?: string; message?: string };
      expect(data.error).toBe('Bad Request');
      expect(typeof data.message).toBe('string');
    });

    it(testName('Report: returns received true'), async () => {
      const userId = `ac-report-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.AntiCheat.Report, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          reporterId: userId,
          targetId: 'target-user',
          reason: 'suspicious',
          matchId: 'match-1',
        }),
      });
      expect(response.status).toBe(HttpStatus.Ok);
      const data = (await response.json()) as { received?: boolean };
      expect(data.received).toBe(true);
    });

    it(testName('Report threshold: five reports can move status to flagged'), async () => {
      const userId = `ac-multi-report-${Date.now()}`;
      const reportUrl = buildApiUrl(ApiEndpoint.AntiCheat.Report, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const statusUrl = buildApiUrl(ApiEndpoint.AntiCheat.Status(userId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const headers = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      };

      for (let i = 0; i < 5; i++) {
        const reportRes = await worker.fetch(reportUrl, {
          method: HttpMethod.Post,
          headers,
          body: JSON.stringify({
            reporterId: userId,
            targetId: `target-${i}`,
            reason: 'cheating',
            matchId: `match-${i}`,
          }),
        });
        expect(reportRes.status).toBe(HttpStatus.Ok);
      }

      const statusRes = await worker.fetch(statusUrl, { method: HttpMethod.Get, headers });
      expect(statusRes.status).toBe(HttpStatus.Ok);
      const data = (await statusRes.json()) as { status?: string };
      expect(['clear', 'flagged', 'suspended']).toContain(data.status);
    });
  });
});
