import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getLogsApiAuthHeaders, buildTestApiUrlForEndpoint, buildTestApiUrlForEndpointWithPath } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import type { ApiPath } from '@ocentra/endpoint-domain/types/brands';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { LogLevel } from '@/constants/logs-api';
import { buildLogsApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
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
    logInfo('[TEST] Initializing test worker for logs integration tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('Store Logs: should store single log entry'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing log entry storage', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const logEntry = {
        id: `test-log-${Date.now()}`,
        level: LogLevel.Info,
        message: 'Test log message',
        timestamp: Date.now(),
        source: 'Test',
        context: 'test-context'
      };

      const logsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(logEntry)
      }, token);

      logInfo('[TEST] Log storage response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      if (response.status !== HttpStatus.Ok) {
        logError('[TEST] Log storage failed', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status });
      }
      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);
      if (!data.success) {
        logError('[TEST] Log storage returned success=false', getStackTrace(), { data });
      }
    });

  it(testName('Store Logs: should store batch of log entries'), async () => {
      const token = await createToken();
      const logEntries = {
        logs: [
          {
            id: `test-log-${Date.now()}-1`,
            level: LogLevel.Info,
            message: 'Test log message 1',
            timestamp: Date.now(),
            source: 'Test',
            context: 'test-context'
          },
          {
            id: `test-log-${Date.now()}-2`,
            level: LogLevel.Warn,
            message: 'Test log message 2',
            timestamp: Date.now(),
            source: 'Test',
            context: 'test-context'
          }
        ]
      };

      const logsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(logEntries)
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; stored: number };
      expect(data.success).toBe(true);
      expect(data.stored).toBe(2);
    });

  it(testName('Store Logs: should reject batch exceeding maximum size'), async () => {
      const token = await createToken();
      const logs = Array.from({ length: 201 }, (_, i) => ({
        id: `test-log-${Date.now()}-${i}`,
        level: LogLevel.Info,
        message: `Test log message ${i}`,
        timestamp: Date.now(),
        source: 'Test'
      }));

      const logsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ logs })
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string };
      expect(typeof data.error).toBe('string');
      expect(data.error?.length).toBeGreaterThan(0);
    });

  it(testName('Query Logs: should query logs without filters'), async () => {
      const token = await createToken();
      const logsQueryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(logsQueryUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { logs: unknown[] };
      expect(Array.isArray(data.logs)).toBe(true);
    });

  it(testName('Query Logs: should filter logs by level'), async () => {
      const token = await createToken();
      const logsQueryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const url = new URL(logsQueryUrl);
      url.searchParams.set(QueryParam.Level, LogLevel.Error);
      const logsUrl = url.toString();
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { logs: Array<Record<string, unknown>> };
      expect(Array.isArray(data.logs)).toBe(true);
    });

  it(testName('Query Logs: should filter logs by source'), async () => {
      const token = await createToken();
      const logsQueryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const url = new URL(logsQueryUrl);
      url.searchParams.set(QueryParam.Source, 'Test');
      const logsUrl = url.toString();
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { logs: unknown[] };
      expect(Array.isArray(data.logs)).toBe(true);
    });

  it(testName('Query Logs: should filter logs by since parameter'), async () => {
      const token = await createToken();
      const logsQueryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const url = new URL(logsQueryUrl);
      url.searchParams.set(QueryParam.Since, '1h');
      const logsUrl = url.toString();
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { logs: unknown[] };
      expect(Array.isArray(data.logs)).toBe(true);
    });

  it(testName('Query Logs: should respect limit parameter'), async () => {
      const token = await createToken();
      const limit = 10;
      const logsQueryUrl = buildLogsApiUrl(ApiEndpoint.Logs.Query, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const url = new URL(logsQueryUrl);
      url.searchParams.set(QueryParam.Limit, String(limit));
      const logsUrl = url.toString();
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { logs: unknown[] };
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.logs.length).toBeLessThanOrEqual(limit);
    });

  it(testName('Logs Stats: should return log statistics'), async () => {
      const token = await createToken();
      const logsStatsUrl = buildLogsApiUrl(ApiEndpoint.Logs.Stats, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(logsStatsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { total_logs: number; by_level: Record<string, number>; by_source: Record<string, number>; oldest_timestamp: number | null; newest_timestamp: number | null };
      expect(typeof data.total_logs).toBe('number');
      expect(data.total_logs).toBeGreaterThanOrEqual(0);
      expect(typeof data.by_level).toBe('object');
      expect(typeof data.by_source).toBe('object');
    });

  it(testName('Authorization: should reject requests without API key'), async () => {
      const token = await createToken();
      const logsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ id: 'test', level: LogLevel.Info, message: 'test', timestamp: Date.now() })
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe(ErrorMessage.Unauthorized);
    });

  it(testName('Authorization: should reject requests with invalid API key'), async () => {
      const token = await createToken();
      const logsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: 'Bearer invalid-key',
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ id: 'test', level: LogLevel.Info, message: 'test', timestamp: Date.now() })
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe(ErrorMessage.Unauthorized);
    });

  it(testName('Input Validation: should reject requests with invalid log entry format'), async () => {
      const token = await createToken();
      const logsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ invalid: 'data' })
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe(ErrorMessage.BadRequest);
    });

    it(testName('should reject requests exceeding maximum size'), async () => {
        const token = await createToken();
      const largePayload = 'x'.repeat(10 * 1024 * 1024);
      const logsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Logs.Base);
      const response = await worker.fetch(logsUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.ContentLength]: String(largePayload.length),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: largePayload
      }, token);

      expect(response.status === HttpStatus.PayloadTooLarge || response.status === HttpStatus.BadRequest).toBe(true);
    });

  it(testName('Removed SQL endpoints: /logs/test-sql returns NotFound'), async () => {
      const token = await createToken();
      const logsTestSqlUrl = buildLogsApiUrl('/api/v1/logs/test-sql' as ApiPath, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(logsTestSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ query: 'SELECT * FROM logs LIMIT 1' })
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe(ErrorMessage.NotFound);
    });

  it(testName('Invalid Paths: should return 404 for invalid log paths'), async () => {
      const token = await createToken();
      const logsInvalidUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Logs.Base, 'invalid-path');
      const response = await worker.fetch(logsInvalidUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe(ErrorMessage.NotFound);
    });

  it(testName('Invalid Paths: should return NotFound for /sql path (SQL endpoint removed)'), async () => {
      const token = await createToken();
      const logsSqlUrl = buildLogsApiUrl('/api/v1/logs/sql' as ApiPath, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(logsSqlUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getLogsApiAuthHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({ query: 'SELECT * FROM logs' })
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe(ErrorMessage.NotFound);
    });
});
