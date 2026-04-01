import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getLogsApiKey } from '@tests/helpers/test-helpers';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { LogLevel } from '@/constants/logs-api';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getLogsApiAuthHeaders } from '@tests/helpers/test-helpers';
import { buildLogsApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;
  const LOGS_API_KEY = getLogsApiKey();
  const WORKER_URL = process.env[TestEnvVar.TestMode] === TestEnvValue.Real 
    ? (process.env[TestEnvVar.WorkerUrl] || TestConfig.WorkerUrlDev)
    : TestConfig.TestApiUrlPlaceholder;
  const assertSqlTestResponse = async (response: Response): Promise<void> => {
    expect([HttpStatus.Ok, HttpStatus.NotFound]).toContain(response.status);
    const result = (await response.json()) as { success?: boolean; error?: string };
    if (response.status === HttpStatus.Ok) {
      expect(result.success).toBe(true);
      return;
    }
    expect(typeof result.error).toBe('string');
  };

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for analytics tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      worker = await getTestWorker();
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  if (!LOGS_API_KEY) {
    it.skip(testName('All analytics tests - LOGS_API_KEY not set'), () => {
    });
  } else {
    it(testName('Basic SQL Queries: should execute SELECT * FROM logs LIMIT 1'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing analytics SQL query execution', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const testSqlUrl = buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL });
      const response = await worker.fetch(testSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getLogsApiAuthHeaders(),
        },
        body: JSON.stringify({ query: 'SELECT * FROM logs LIMIT 1' }),
      }, token);

      logInfo('[TEST] Analytics SQL query response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      await assertSqlTestResponse(response);
    });

    it(testName('Basic SQL Queries: should execute SELECT blob1 FROM logs LIMIT 1'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing analytics blob query', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const testSqlUrl = buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL });
      const response = await worker.fetch(testSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getLogsApiAuthHeaders(),
        },
        body: JSON.stringify({ query: 'SELECT blob1 FROM logs LIMIT 1' }),
      }, token);

      logInfo('[TEST] Analytics blob query response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      await assertSqlTestResponse(response);
    });

    it(testName('Basic SQL Queries: should execute COUNT() query'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing analytics COUNT query', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const testSqlUrl = buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL });
      const response = await worker.fetch(testSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getLogsApiAuthHeaders(),
        },
        body: JSON.stringify({ query: 'SELECT COUNT() as total FROM logs' }),
      }, token);

      logInfo('[TEST] Analytics COUNT query response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      await assertSqlTestResponse(response);
    });

    it(testName('WHERE Clauses: should filter with startsWith() function'), async () => {
      const token = await createToken();
      const testSqlUrl = buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL });
      const response = await worker.fetch(testSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getLogsApiAuthHeaders(),
        },
        body: JSON.stringify({ query: "SELECT blob1 FROM logs WHERE startsWith(index1, 'info:') LIMIT 1" }),
      }, token);

      await assertSqlTestResponse(response);
    });

    it(testName('WHERE Clauses: should filter with position() function'), async () => {
      const token = await createToken();
      const testSqlUrl = buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL });
      const response = await worker.fetch(testSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getLogsApiAuthHeaders(),
        },
        body: JSON.stringify({ query: "SELECT blob1 FROM logs WHERE position(':Browser:' IN index1) > 0 LIMIT 1" }),
      }, token);

      await assertSqlTestResponse(response);
    });

    it(testName('WHERE Clauses: should filter with numeric comparison'), async () => {
      const token = await createToken();
      const timestamp = Math.floor(Date.now() / 1000) - 86400;
      const testSqlUrl = buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL });
      const response = await worker.fetch(testSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getLogsApiAuthHeaders(),
        },
        body: JSON.stringify({ query: `SELECT blob1 FROM logs WHERE double1 >= ${timestamp} LIMIT 1` }),
      }, token);

      await assertSqlTestResponse(response);
    });

    it(testName('ORDER BY: should order by timestamp DESC'), async () => {
      const token = await createToken();
      const testSqlUrl = buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL });
      const response = await worker.fetch(testSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getLogsApiAuthHeaders(),
        },
        body: JSON.stringify({ query: 'SELECT blob1, timestamp FROM logs ORDER BY timestamp DESC LIMIT 1' }),
      }, token);

      await assertSqlTestResponse(response);
    });

    it(testName('GROUP BY: should group by level with COUNT()'), async () => {
      const token = await createToken();
      const testSqlUrl = buildLogsApiUrl(ApiEndpoint.Logs.TestSql, { baseUrl: WORKER_URL });
      const response = await worker.fetch(testSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getLogsApiAuthHeaders(),
        },
        body: JSON.stringify({ 
          query: `SELECT substring(index1, 1, position(':' IN index1) - 1) as level, COUNT() as count FROM logs GROUP BY level LIMIT 10` 
        }),
      }, token);

      await assertSqlTestResponse(response);
    });

    it(testName('Stats API: should return stats with total_logs, by_level, by_source'), async () => {
      const token = await createToken();
      const statsUrl = buildLogsApiUrl(ApiEndpoint.Logs.Stats, { baseUrl: WORKER_URL });
      const response = await worker.fetch(statsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const stats = await response.json() as { 
        total_logs?: number; 
        by_level?: Record<string, number>; 
        by_source?: Record<string, number> 
      };
      expect(typeof stats.total_logs).toBe('number');
      expect(typeof stats.by_level).toBe('object');
      expect(typeof stats.by_source).toBe('object');
    });

    it(testName('Stats API: should filter stats by time range (since=1h)'), async () => {
      const token = await createToken();
      const statsUrlWithQuery = buildLogsApiUrl(ApiEndpoint.Logs.Stats, { baseUrl: WORKER_URL });
      const url = new URL(statsUrlWithQuery);
      url.searchParams.set(QueryParam.Since, '1h');
      const response = await worker.fetch(url.toString(), {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const stats = await response.json() as { total_logs?: number };
      expect(typeof stats.total_logs).toBe('number');
    });

    it(testName('Query API: should filter by level'), async () => {
      const token = await createToken();
      const queryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
      const url = new URL(queryUrl);
      url.searchParams.set(QueryParam.Level, LogLevel.Info);
      url.searchParams.set(QueryParam.Limit, '10');
      const response = await worker.fetch(url.toString(), {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { logs?: Array<{ level: string }> };
      expect(Array.isArray(data.logs)).toBe(true);
      if (data.logs && data.logs.length > 0) {
        expect(data.logs.every(log => log.level === LogLevel.Info)).toBe(true);
      }
    });

    it(testName('Query API: should filter by source'), async () => {
      const token = await createToken();
      const queryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
      const url = new URL(queryUrl);
      url.searchParams.set(QueryParam.Source, 'Browser:ModelManager');
      url.searchParams.set(QueryParam.Limit, '10');
      const response = await worker.fetch(url.toString(), {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { logs?: Array<{ source: string }> };
      expect(Array.isArray(data.logs)).toBe(true);
      if (data.logs && data.logs.length > 0) {
        expect(data.logs.every(log => log.source === 'Browser:ModelManager')).toBe(true);
      }
    });

    it(testName('Query API: should filter by time range (since=1h)'), async () => {
        const token = await createToken();
        const oneHourAgo = Date.now() - 3600000;
        const queryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
        const url = new URL(queryUrl);
        url.searchParams.set(QueryParam.Since, '1h');
        url.searchParams.set(QueryParam.Limit, '10');
        const response = await worker.fetch(url.toString(), {
          method: HttpMethod.Get,
          headers: {
            ...getLogsApiAuthHeaders(),
          },
        }, token);

        expect(response.status).toBe(HttpStatus.Ok);
        const data = await response.json() as { logs?: Array<{ timestamp: number }> };
        expect(Array.isArray(data.logs)).toBe(true);
        if (data.logs && data.logs.length > 0) {
          expect(data.logs.every(log => log.timestamp >= oneHourAgo)).toBe(true);
        }
      });

    it(testName('Query API: should respect limit parameter'), async () => {
      const token = await createToken();
      const queryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
      const url = new URL(queryUrl);
      url.searchParams.set(QueryParam.Limit, '5');
      const response = await worker.fetch(url.toString(), {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { logs?: unknown[] };
      expect(Array.isArray(data.logs)).toBe(true);
      if (data.logs) {
        expect(data.logs.length).toBeLessThanOrEqual(5);
      }
    });

    it(testName('Query API: should sort logs by timestamp DESC (newest first)'), async () => {
      const token = await createToken();
      const queryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: WORKER_URL });
      const url = new URL(queryUrl);
      url.searchParams.set(QueryParam.Limit, '10');
      const response = await worker.fetch(url.toString(), {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { logs?: Array<{ timestamp: number }> };
      expect(Array.isArray(data.logs)).toBe(true);
      if (data.logs && data.logs.length >= 2) {
        for (let i = 0; i < data.logs.length - 1; i++) {
          expect(data.logs[i].timestamp).toBeGreaterThanOrEqual(data.logs[i + 1].timestamp);
        }
      }
    });
  }
});
