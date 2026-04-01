import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint, buildTestApiUrlWithQuery } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
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

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for explore tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('List Matches: should return matches list'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing explore matches list', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const exploreMatchesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.ExploreApi.Matches);
      const response = await worker.fetch(exploreMatchesUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      logInfo('[TEST] Explore matches response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; matches: unknown[]; count: number; total_fetched: number };
      logInfo('[TEST] Explore matches data validated', getStackTrace(), { success: data.success, count: data.count, totalFetched: data.total_fetched }, LOG_TEST_OPERATIONS);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.matches)).toBe(true);
      expect(typeof data.count).toBe('number');
      expect(data.count).toBeGreaterThanOrEqual(0);
      expect(typeof data.total_fetched).toBe('number');
      expect(data.total_fetched).toBe(data.matches.length);
    });

  it(testName('List Matches: should return matches sorted by time descending'), async () => {
      const token = await createToken();
      const exploreMatchesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.ExploreApi.Matches);
      const response = await worker.fetch(exploreMatchesUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      logInfo('[TEST] Explore matches sorted response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      if (response.status !== HttpStatus.Ok) {
        logError('[TEST] Unexpected status for sorted matches', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status });
      }
      const data = await response.json() as { matches: Array<Record<string, unknown>> };
      if (data.matches.length > 1) {
        for (let i = 0; i < data.matches.length - 1; i++) {
          const current = data.matches[i];
          const next = data.matches[i + 1];
          const currentTime = new Date((current.start_time || current.createdAt || 0) as string | number).getTime();
          const nextTime = new Date((next.start_time || next.createdAt || 0) as string | number).getTime();
          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          if (currentTime < nextTime) {
            logError('[TEST] Matches not sorted correctly', getStackTrace(), { index: i, currentTime, nextTime });
          }
        }
      }
    });

  it(testName('List Benchmarks: should return benchmarks list'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlForEndpoint(ApiEndpoint.ExploreApi.Benchmarks);
      const response = await worker.fetch(benchmarksUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; benchmarks: unknown[]; count: number; returned: number; stats: Record<string, number>; match_type: string; game_type: string };
      expect(data.success).toBe(true);
      expect(Array.isArray(data.benchmarks)).toBe(true);
      expect(typeof data.count).toBe('number');
      expect(data.count).toBeGreaterThanOrEqual(0);
      expect(typeof data.returned).toBe('number');
      expect(data.returned).toBeLessThanOrEqual(data.count);
      expect(typeof data.match_type).toBe('string');
      expect(typeof data.game_type).toBe('string');
      expect(typeof data.stats).toBe('object');
    });

  it(testName('List Benchmarks: should filter by match type'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { type: 'ai_vs_ai' });
      const response = await worker.fetch(benchmarksUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { match_type: string; benchmarks: Array<Record<string, unknown>> };
      expect(data.match_type).toBe('ai_vs_ai');
      data.benchmarks.forEach(benchmark => {
        expect((benchmark as Record<string, unknown>).benchmark_type).toBe('ai_vs_ai');
      });
    });

  it(testName('List Benchmarks: should filter by game type'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { game_type: '0' });
      const response = await worker.fetch(benchmarksUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { game_type: string; benchmarks: Array<Record<string, unknown>> };
      expect(data.game_type).toBe('0');
    });

  it(testName('List Benchmarks: should respect limit parameter'), async () => {
      const token = await createToken();
      const limit = 10;
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { limit: String(limit) });
      const response = await worker.fetch(benchmarksUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { benchmarks: unknown[]; returned: number };
      expect(data.benchmarks.length).toBeLessThanOrEqual(limit);
      expect(data.returned).toBeLessThanOrEqual(limit);
    });

  it(testName('List Benchmarks: should cap limit at maximum value'), async () => {
      const token = await createToken();
      const excessiveLimit = 5000;
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { limit: String(excessiveLimit) });
      const response = await worker.fetch(benchmarksUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { benchmarks: unknown[]; returned: number };
      expect(data.benchmarks.length).toBeLessThanOrEqual(1000);
      expect(data.returned).toBeLessThanOrEqual(1000);
    });

  it(testName('List Benchmarks: should return stats with counts'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlForEndpoint(ApiEndpoint.ExploreApi.Benchmarks);
      const response = await worker.fetch(benchmarksUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { stats: { total: number; ai_vs_ai: number; ai_vs_human: number } };
      expect(typeof data.stats.total).toBe('number');
      expect(data.stats.total).toBeGreaterThanOrEqual(0);
      expect(typeof data.stats.ai_vs_ai).toBe('number');
      expect(data.stats.ai_vs_ai).toBeGreaterThanOrEqual(0);
      expect(typeof data.stats.ai_vs_human).toBe('number');
      expect(data.stats.ai_vs_human).toBeGreaterThanOrEqual(0);
    });

  it(testName('Error Handling: should handle errors gracefully in list matches'), async () => {
      const token = await createToken();
      const exploreMatchesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.ExploreApi.Matches);
      const response = await worker.fetch(exploreMatchesUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.status === HttpStatus.InternalServerError) {
        const data = await response.json() as { success: boolean; error?: string; matches: unknown[]; count: number };
        expect(data.success).toBe(false);
        expect(Array.isArray(data.matches)).toBe(true);
        expect(data.matches.length).toBe(0);
        expect(data.count).toBe(0);
        expect(typeof data.error).toBe('string');
      } else {
        expect(response.status).toBe(HttpStatus.Ok);
      }
    });

  it(testName('Error Handling: should handle errors gracefully in list benchmarks'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlForEndpoint(ApiEndpoint.ExploreApi.Benchmarks);
      const response = await worker.fetch(benchmarksUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.status === HttpStatus.InternalServerError) {
        const data = await response.json() as { success: boolean; error?: string; benchmarks: unknown[]; count: number };
        expect(data.success).toBe(false);
        expect(Array.isArray(data.benchmarks)).toBe(true);
        expect(data.benchmarks.length).toBe(0);
        expect(data.count).toBe(0);
        expect(typeof data.error).toBe('string');
      } else {
        expect(response.status).toBe(HttpStatus.Ok);
      }
    });
});
