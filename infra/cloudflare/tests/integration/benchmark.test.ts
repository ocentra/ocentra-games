import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { env } from 'cloudflare:test';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpointWithPath, buildTestApiUrlWithQuery, loadTextFixture } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { setSetupContext } from '@tests/test-setup-pool';
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

describe(extractName(import.meta.url), TestSuiteType.Integration, { concurrent: false, poolSequential: true }, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for benchmark tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      const setupToken = setSetupContext('benchmark-setup', 'tests/integration/benchmark.test.ts');

    logInfo('[TEST] Loading test match data for benchmarks via FIXTURE_LOADER', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    
    const matchAiVsAi = JSON.parse(
      await loadTextFixture('match-ai-vs-ai.json', env)
    );
    const matchAiVsHuman = JSON.parse(
      await loadTextFixture('match-ai-vs-human.json', env)
    );

    const matchUrl1 = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'match-ai-vs-ai-001');
    const putRes1 = await worker.fetch(matchUrl1, {
      method: HttpMethod.Put,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify(matchAiVsAi)
    }, setupToken);
    await putRes1.text().catch(() => undefined);

    const matchUrl2 = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'match-ai-vs-human-001');
    const putRes2 = await worker.fetch(matchUrl2, {
      method: HttpMethod.Put,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify(matchAiVsHuman)
    }, setupToken);
    await putRes2.text().catch(() => undefined);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('AI vs AI Benchmarks: should return AI vs AI matches when type=ai_vs_ai'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing benchmark query for AI vs AI', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { type: 'ai_vs_ai' });
      const response = await worker.fetch(benchmarksUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      logInfo('[TEST] Benchmark response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      if (response.status !== HttpStatus.Ok) {
        logError('[TEST] Unexpected status for benchmark query', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status });
      }
      const data = await response.json() as {
        success: boolean;
        benchmarks: Array<{
          match_id: string;
          benchmark_type: string;
          ai_players: Array<{ model_name?: string; model_id?: string }>;
          human_players: unknown[];
          ai_count: number;
          human_count: number;
        }>;
        count: number;
        match_type: string;
      };

      expect(data.success).toBe(true);
      expect(data.match_type).toBe('ai_vs_ai');
      expect(Array.isArray(data.benchmarks)).toBe(true);

      for (const benchmark of data.benchmarks) {
        expect(benchmark.benchmark_type).toBe('ai_vs_ai');
        expect(benchmark.ai_count).toBeGreaterThanOrEqual(2);
        expect(benchmark.human_count).toBe(0);
        expect(Array.isArray(benchmark.ai_players)).toBe(true);
        expect(benchmark.ai_players.length).toBeGreaterThanOrEqual(2);
        
        for (const aiPlayer of benchmark.ai_players) {
          const identifier = aiPlayer.model_name || aiPlayer.model_id;
          expect(typeof identifier).toBe('string');
          if (typeof identifier === 'string') {
            expect(identifier.length).toBeGreaterThan(0);
          } else {
            throw new Error('Expected identifier to be string');
          }
        }
      }
    });

  it(testName('AI vs AI Benchmarks: should include model metadata in AI vs AI benchmarks'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { type: 'ai_vs_ai', limit: '10' });
      const response = await worker.fetch(benchmarksUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        benchmarks: Array<{
          ai_players: Array<{
            model_name?: string;
            model_id?: string;
            metadata?: Record<string, unknown>;
          }>;
        }>;
      };

      if (data.benchmarks.length > 0) {
        const firstBenchmark = data.benchmarks[0];
        expect(firstBenchmark.ai_players.length).toBeGreaterThan(0);
        
        const firstAI = firstBenchmark.ai_players[0];
        const identifier = firstAI.model_name || firstAI.model_id;
        if (identifier) {
          expect(typeof identifier).toBe('string');
          expect(identifier.length).toBeGreaterThan(0);
        } else {
          expect(firstAI.metadata).not.toBeUndefined();
          expect(typeof firstAI.metadata).toBe('object');
        }
      }
    });

  it(testName('AI vs Human Benchmarks: should return AI vs Human matches when type=ai_vs_human'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { type: 'ai_vs_human' });
      const response = await worker.fetch(benchmarksUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        success: boolean;
        benchmarks: Array<{
          benchmark_type: string;
          ai_players: unknown[];
          human_players: unknown[];
          ai_count: number;
          human_count: number;
        }>;
        match_type: string;
      };

      expect(data.success).toBe(true);
      expect(data.match_type).toBe('ai_vs_human');
      expect(Array.isArray(data.benchmarks)).toBe(true);

      for (const benchmark of data.benchmarks) {
        expect(benchmark.benchmark_type).toBe('ai_vs_human');
        expect(benchmark.ai_count).toBeGreaterThanOrEqual(1);
        expect(benchmark.human_count).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(benchmark.ai_players)).toBe(true);
        expect(Array.isArray(benchmark.human_players)).toBe(true);
      }
    });

  it(testName('All AI Matches: should return all AI matches when type=all'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { type: 'all' });
      const response = await worker.fetch(benchmarksUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        success: boolean;
        benchmarks: Array<{ ai_count: number }>;
        match_type: string;
      };

      expect(data.success).toBe(true);
      expect(data.match_type).toBe('all');
      expect(Array.isArray(data.benchmarks)).toBe(true);

      for (const benchmark of data.benchmarks) {
        expect(benchmark.ai_count).toBeGreaterThanOrEqual(1);
      }
    });

  it(testName('Game Type Filtering: should filter benchmarks by game type'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { type: 'ai_vs_ai', game_type: '0' });
      const response = await worker.fetch(benchmarksUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        benchmarks: Array<{ gameType?: number; game_type?: number }>;
        game_type: string;
      };

      expect(data.game_type).toBe('0');
      
      for (const benchmark of data.benchmarks) {
        const gameType = benchmark.gameType ?? benchmark.game_type ?? 0;
        expect(gameType).toBe(0);
      }
    });

  it(testName('Limit Parameter: should respect limit parameter'), async () => {
      const token = await createToken();
      const limit = 5;
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { type: 'all', limit: String(limit) });
      const response = await worker.fetch(benchmarksUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        benchmarks: unknown[];
        returned: number;
      };

      expect(data.benchmarks.length).toBeLessThanOrEqual(limit);
      expect(data.returned).toBeLessThanOrEqual(limit);
    });

  it(testName('Statistics: should include benchmark statistics'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { type: 'all' });
      const response = await worker.fetch(benchmarksUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        stats: {
          total: number;
          ai_vs_ai: number;
          ai_vs_human: number;
        };
      };

      expect(typeof data.stats.total).toBe('number');
      expect(typeof data.stats.ai_vs_ai).toBe('number');
      expect(typeof data.stats.ai_vs_human).toBe('number');
      expect(data.stats.total).toBeGreaterThanOrEqual(0);
      expect(data.stats.ai_vs_ai).toBeGreaterThanOrEqual(0);
      expect(data.stats.ai_vs_human).toBeGreaterThanOrEqual(0);
    });

  it(testName('Sorting: should return benchmarks sorted by timestamp descending'), async () => {
      const token = await createToken();
      const benchmarksUrl = buildTestApiUrlWithQuery(ApiEndpoint.ExploreApi.Benchmarks, { type: 'all', limit: '10' });
      const response = await worker.fetch(benchmarksUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        benchmarks: Array<{
          start_time?: string;
          createdAt?: string;
          endedAt?: string;
        }>;
      };

      if (data.benchmarks.length > 1) {
        for (let i = 0; i < data.benchmarks.length - 1; i++) {
          const timeA = data.benchmarks[i].start_time || data.benchmarks[i].createdAt || data.benchmarks[i].endedAt || '0';
          const timeB = data.benchmarks[i + 1].start_time || data.benchmarks[i + 1].createdAt || data.benchmarks[i + 1].endedAt || '0';
          const timestampA = new Date(timeA).getTime();
          const timestampB = new Date(timeB).getTime();
          expect(timestampA).toBeGreaterThanOrEqual(timestampB);
        }
      }
    });
});
