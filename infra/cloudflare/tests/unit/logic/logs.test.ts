import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  writeLogToAnalyticsLogic,
  parseSinceLogic,
  queryLogsLogic,
  sanitizeErrorLogic,
  timingSafeEqualLogic,
  validateApiKeyLogic,
  getClientIdLogic,
  getStatsFromAnalyticsEngineLogic,
  type LogsAnalytics,
  type LogsFetch,
} from '@/logic/logs';
import { getAnalyticsEngineSqlUrl } from '@/utils/cloudflare-api';
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

const TestConstants = {
  LogId1: 'log1',
  LevelInfo: 'info',
  LevelError: 'error',
  LevelWarn: 'warn',
  LevelDebug: 'debug',
  TestMessage: 'Test message',
  TestLog: 'Test log',
  ErrorMessage: 'Error message',
  WarningMessage: 'Warning message',
  InfoMessage: 'Info message',
  ErrorStackTrace: 'Error stack trace',
  WarningStackTrace: 'Warning stack trace',
  StackTrace: 'Stack trace',
  TestSource: 'TestSource',
  TestContext: 'TestContext',
  TestTs: 'test.ts',
  TestTsPath: '/path/to/test.ts',
  TestLine: 42,
  TestColumn: 10,
  AnalyticsError: 'Analytics error',
  InvalidTimestampFormat: 'Invalid timestamp format',
  SinceParameterRequired: 'Since parameter is required',
  FailedToParseTimestamp: 'Failed to parse timestamp',
  NetworkError: 'Network error',
  InvalidJson: 'invalid json',
  SqlError: 'SQL error',
  TestAccount: 'test-account',
  TestToken: 'test-token',
  DatasetLogs: 'logs',
  TestSourceColon: 'TestSource:',
  TestLevel: "test'level",
  TestSourceEscaped: "test'source",
  TestLevelEscaped: "test''level",
  TestSourceEscapedDouble: "test''source",
  Limit10: 10,
  Limit50: 50,
  Limit100: 100,
  Limit200: 200,
  MaxLogSize: 1000,
  MaxStackSize: 5000,
  MaxArgsSize: 10000,
  MaxBlobSize: 50000,
  MaxBlobSizeSmall: 1000,
  MaxBlobSizeTiny: 500,
  Truncated: '[TRUNCATED]',
  EmptyString: '',
  XRepeat2000: 'x'.repeat(2000),
  XRepeat10000: 'x'.repeat(10000),
  XRepeat50000: 'x'.repeat(50000),
  XRepeat1000: 'x'.repeat(1000),
  XRepeat5000: 'x'.repeat(5000),
  YRepeat1000: 'y'.repeat(1000),
  ZRepeat2000: 'z'.repeat(2000),
  Since30s: '30s',
  Since5m: '5m',
  Since2h: '2h',
  Since1d: '1d',
  SinceInvalid: 'invalid',
  SinceEmpty: '',
  SinceNotADate: 'not-a-date',
  SinceIso: '2024-01-01T00:00:00Z',
  SinceIsoTimestamp: new Date('2024-01-01T00:00:00Z').getTime(),
  Since30sMs: 31000,
  Since5mMs: 310000,
  Since2hMs: 7300000,
  Since1dMs: 86401000,
  AnalyticsEngineQueryFailed: 'Analytics Engine query failed',
  FailedToParseAnalyticsEngineResponse: 'Failed to parse Analytics Engine response',
  AnalyticsEngineQueryError: 'Analytics Engine query error',
  Limit: 'LIMIT',
  NoAuthorizationHeader: 'No Authorization header',
  InvalidAuthorizationHeaderFormat: 'Invalid Authorization header format',
  LogsApiKeyNotConfigured: 'LOGS_API_KEY not configured',
  StatsQueryError: 'Stats query error',
  Separator: ':',
  Unknown: 'unknown',
  MaxUserAgentLength: 100,
  MaxUserAgentLength50: 50,
  XRepeat200: 'x'.repeat(200),
  XRepeat50: 'x'.repeat(50),
  ClientIp192: '192.168.1.1',
  ClientId192: '192.168.1.1:unknown',
  ClientId192Truncated: '192.168.1.1:' + 'x'.repeat(50),
  OneDayAgoMs: 86400000,
  TotalLogs: 'total_logs',
  ByLevel: 'by_level',
  BySource: 'by_source',
  FullIndex: 'full_index',
  Oldest: 'oldest',
  Newest: 'newest',
  OldestTimestamp: 'oldest_timestamp',
  NewestTimestamp: 'newest_timestamp',
  InfoSourceOrigin: 'info:source:origin',
  InfoPart1Part2Origin: 'info:part1:part2:origin',
  Part1Part2: 'part1:part2',
  Total: 'total',
  Count: 'count',
  Level: 'level',
  Source: 'source',
  Origin: 'origin',
  Data: 'data',
  Result: 'result',
  Errors: 'errors',
  Message: 'message',
  Entry: 'entry',
  Blob1: 'blob1',
  InternalServerError: 'Internal Server Error',
  Status500: 500,
  Status200: 200,
  Test: 'test',
  Test1: 'test1',
  Test2: 'test2',
  SafeError: 'Safe error',
  InternalError: 'Internal error',
  UnknownError: 'Unknown error',
  UnsafeErrorMessage: 'Unsafe error message',
  SafeErrorMessage: 'Safe error message',
  SafeErrorAdditional: 'Safe error: additional details',
  SeparatorColonSpace: ': ',
  SpecialChars: '!@#$%^&*()',
  TestKey: 'test-key',
  Bearer: 'Bearer',
  Space: ' ',
  InvalidFormat: 'InvalidFormat',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should write log entry successfully'), () => {
    logInfo('[TEST] Testing writeLogToAnalyticsLogic', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelInfo,
          message: TestConstants.TestMessage,
          timestamp: Date.now(),
          source: TestConstants.TestSource,
          context: TestConstants.TestContext,
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    expect(mockAnalytics.writeDataPoint).toHaveBeenCalled();
    if (!result.success) {
      logError('[TEST] Log write to analytics failed', getStackTrace(), { success: result.success });
    }
  });

  it(testName('should truncate long messages'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const longMessage = TestConstants.XRepeat2000;
    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelInfo,
          message: longMessage,
          timestamp: Date.now(),
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(parsed.message.length).toBeLessThanOrEqual(1000);
  });

  it(testName('should include stack for error level'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: 'log1',
          level: TestConstants.LevelError,
          message: TestConstants.ErrorMessage,
          timestamp: Date.now(),
          stack: TestConstants.ErrorStackTrace,
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(parsed.stack).toBe('Error stack trace');
  });

  it(testName('should include stack for warn level'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: 'log1',
          level: TestConstants.LevelWarn,
          message: TestConstants.WarningMessage,
          timestamp: Date.now(),
          stack: TestConstants.WarningStackTrace,
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(parsed.stack).toBe('Warning stack trace');
  });

  it(testName('should exclude stack for non-error levels'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: 'log1',
          level: TestConstants.LevelInfo,
          message: TestConstants.InfoMessage,
          timestamp: Date.now(),
          stack: TestConstants.StackTrace,
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(parsed.stack).toBeUndefined();
  });

  it(testName('should truncate long stack traces'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const longStack = TestConstants.XRepeat10000;
    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelError,
          message: 'Error message',
          timestamp: Date.now(),
          stack: longStack,
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(parsed.stack.length).toBeLessThanOrEqual(TestConstants.MaxStackSize);
    expect(parsed.stack.endsWith('...')).toBe(true);
  });

  it(testName('should handle args truncation'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const largeArgs = [TestConstants.XRepeat2000, TestConstants.YRepeat1000.repeat(2), TestConstants.ZRepeat2000];
    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelInfo,
          message: 'Test message',
          timestamp: Date.now(),
          args: largeArgs,
        },
        maxLogSize: 1000,
        maxStackSize: 5000,
        maxArgsSize: TestConstants.MaxLogSize,
        maxBlobSize: 50000,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(Array.isArray(parsed.args)).toBe(true);
    expect(parsed.args.length).toBeLessThanOrEqual(3);
  });

  it(testName('should handle empty args'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelInfo,
          message: 'Test message',
          timestamp: Date.now(),
          args: [],
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(parsed.args).toBeUndefined();
  });

  it(testName('should handle args JSON.stringify error'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const circularObj: { self?: unknown } = {};
    circularObj.self = circularObj;

    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelInfo,
          message: 'Test message',
          timestamp: Date.now(),
          args: [circularObj],
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(parsed.args).toBeUndefined();
  });

  it(testName('should reduce blob size when entry exceeds maxBlobSize'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const veryLongMessage = TestConstants.XRepeat50000;
    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelInfo,
          message: veryLongMessage,
          timestamp: Date.now(),
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSizeSmall,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    expect(blob.length).toBeLessThanOrEqual(TestConstants.MaxBlobSizeSmall);
  });

  it(testName('should remove stack and args when blob still too large after reduction'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const veryLongMessage = TestConstants.XRepeat1000;
    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelError,
          message: veryLongMessage,
          timestamp: Date.now(),
          stack: TestConstants.XRepeat5000,
          args: [TestConstants.YRepeat1000],
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSizeTiny,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(blob.length).toBeLessThanOrEqual(500);
    expect(parsed.message).toContain(TestConstants.Truncated);
    expect(parsed.stack).toBeUndefined();
    expect(parsed.args).toBeUndefined();
  });

  it(testName('should handle errors during write'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn().mockImplementation(() => {
        throw new Error(TestConstants.AnalyticsError);
      }),
    };

    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelInfo,
          message: 'Test message',
          timestamp: Date.now(),
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.AnalyticsError}`);
  });

  it(testName('should include file, filePath, line, and column when provided'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          id: TestConstants.LogId1,
          level: TestConstants.LevelInfo,
          message: 'Test message',
          timestamp: Date.now(),
          file: TestConstants.TestTs,
          filePath: TestConstants.TestTsPath,
          line: TestConstants.TestLine,
          column: TestConstants.TestColumn,
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(parsed.file).toBe(TestConstants.TestTs);
    expect(parsed.filePath).toBe(TestConstants.TestTsPath);
    expect(parsed.line).toBe(TestConstants.TestLine);
    expect(parsed.column).toBe(TestConstants.TestColumn);
  });

  it(testName('should handle missing optional fields'), () => {
    const mockAnalytics: LogsAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const result = writeLogToAnalyticsLogic(
      {
        entry: {
          level: TestConstants.LevelInfo,
          message: 'Test message',
          timestamp: Date.now(),
        },
        maxLogSize: TestConstants.MaxLogSize,
        maxStackSize: TestConstants.MaxStackSize,
        maxArgsSize: TestConstants.MaxArgsSize,
        maxBlobSize: TestConstants.MaxBlobSize,
      },
      mockAnalytics
    );

    expect(result.success).toBe(true);
    const call = (mockAnalytics.writeDataPoint as ReturnType<typeof vi.fn>).mock.calls[0];
    const blob = call[0].blobs[0];
    const parsed = JSON.parse(blob);
    expect(parsed.id).toBe(TestConstants.EmptyString);
    expect(parsed.context).toBe(TestConstants.EmptyString);
    expect(parsed.source).toBe(TestConstants.EmptyString);
    expect(parsed.origin).toBe(TestConstants.EmptyString);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should parse relative time with seconds'), () => {
    const result = parseSinceLogic({ since: TestConstants.Since30s });
    expect(result.success).toBe(true);
    expect(result.timestamp).toBeTypeOf('number');
    const now = Date.now();
    expect(result.timestamp).toBeGreaterThan(now - TestConstants.Since30sMs);
    expect(result.timestamp).toBeLessThanOrEqual(now);
  });

  it(testName('should parse relative time with minutes'), () => {
    const result = parseSinceLogic({ since: TestConstants.Since5m });
    expect(result.success).toBe(true);
    expect(result.timestamp).toBeTypeOf('number');
    const now = Date.now();
    expect(result.timestamp).toBeGreaterThan(now - TestConstants.Since5mMs);
    expect(result.timestamp).toBeLessThanOrEqual(now);
  });

  it(testName('should parse relative time with hours'), () => {
    const result = parseSinceLogic({ since: TestConstants.Since2h });
    expect(result.success).toBe(true);
    expect(result.timestamp).toBeTypeOf('number');
    const now = Date.now();
    expect(result.timestamp).toBeGreaterThan(now - TestConstants.Since2hMs);
    expect(result.timestamp).toBeLessThanOrEqual(now);
  });

  it(testName('should parse relative time with days'), () => {
    const result = parseSinceLogic({ since: TestConstants.Since1d });
    expect(result.success).toBe(true);
    expect(result.timestamp).toBeTypeOf('number');
    const now = Date.now();
    expect(result.timestamp).toBeGreaterThan(now - TestConstants.Since1dMs);
    expect(result.timestamp).toBeLessThanOrEqual(now);
  });

  it(testName('should parse ISO timestamp'), () => {
    const timestamp = TestConstants.SinceIsoTimestamp;
    const result = parseSinceLogic({ since: TestConstants.SinceIso });
    expect(result.success).toBe(true);
    expect(result.timestamp).toBe(timestamp);
  });

  it(testName('should return error for invalid format'), () => {
    const result = parseSinceLogic({ since: TestConstants.SinceInvalid });
    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.InvalidTimestampFormat);
  });

  it(testName('should return error for empty string'), () => {
    const result = parseSinceLogic({ since: TestConstants.SinceEmpty });
    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.SinceParameterRequired);
  });

  it(testName('should return error for invalid date string'), () => {
    const result = parseSinceLogic({ since: TestConstants.SinceNotADate });
    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.InvalidTimestampFormat);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should query logs successfully'), async () => {
    const mockResponse = {
      data: [
        {
          entry: JSON.stringify({
            id: 'log1',
            level: TestConstants.LevelInfo,
            message: 'Test log',
            timestamp: Date.now(),
          }),
        },
      ],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: { level: TestConstants.LevelInfo, limit: TestConstants.Limit10 },
        accountId: TestConstants.TestAccount,
        apiToken: TestConstants.TestToken,
        datasetName: TestConstants.DatasetLogs,
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs?.[0].id).toBe(TestConstants.LogId1);
  });

  it(testName('should handle query errors'), async () => {
    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue(TestConstants.InternalServerError),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: { level: TestConstants.LevelInfo },
        accountId: TestConstants.TestAccount,
        apiToken: TestConstants.TestToken,
        datasetName: TestConstants.DatasetLogs,
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.AnalyticsEngineQueryFailed);
  });

  it(testName('should handle fetch errors'), async () => {
    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockRejectedValue(new Error(TestConstants.NetworkError)),
    };

    const result = await queryLogsLogic(
      {
        query: { level: TestConstants.LevelInfo },
        accountId: TestConstants.TestAccount,
        apiToken: TestConstants.TestToken,
        datasetName: TestConstants.DatasetLogs,
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.NetworkError}`);
  });

  it(testName('should handle parse errors in response'), async () => {
    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(TestConstants.InvalidJson),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: {},
        accountId: 'test-account',
        apiToken: 'test-token',
        datasetName: 'logs',
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.FailedToParseAnalyticsEngineResponse);
  });

  it(testName('should handle errors in response'), async () => {
    const mockResponse = {
      errors: [{ message: TestConstants.SqlError }],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: {},
        accountId: 'test-account',
        apiToken: 'test-token',
        datasetName: 'logs',
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.AnalyticsEngineQueryError);
  });

  it(testName('should handle empty results'), async () => {
    const mockResponse = {
      data: [],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: {},
        accountId: 'test-account',
        apiToken: 'test-token',
        datasetName: 'logs',
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.logs).toEqual([]);
  });

  it(testName('should handle since parameter with relative time'), async () => {
    const mockResponse = {
      data: [],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: { since: '1h' },
        accountId: 'test-account',
        apiToken: 'test-token',
        datasetName: 'logs',
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(mockFetch.fetch).toHaveBeenCalled();
  });

  it(testName('should handle since parameter with numeric value'), async () => {
    const mockResponse = {
      data: [],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: { since: 1234567890 },
        accountId: 'test-account',
        apiToken: 'test-token',
        datasetName: 'logs',
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
  });

  it(testName('should handle since parameter parse failure'), async () => {
    const mockFetch: LogsFetch = {
      fetch: vi.fn(),
    };

    const result = await queryLogsLogic(
      {
        query: { since: TestConstants.SinceInvalid },
        accountId: TestConstants.TestAccount,
        apiToken: TestConstants.TestToken,
        datasetName: TestConstants.DatasetLogs,
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.InvalidTimestampFormat);
    expect(mockFetch.fetch).not.toHaveBeenCalled();
  });

  it(testName('should handle source query parameter'), async () => {
    const mockResponse = {
      data: [],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: { source: TestConstants.TestSource },
        accountId: TestConstants.TestAccount,
        apiToken: TestConstants.TestToken,
        datasetName: TestConstants.DatasetLogs,
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    const call = (mockFetch.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = call[1].body as string;
    expect(body).toContain(TestConstants.TestSource);
  });

  it(testName('should handle source query parameter ending with colon'), async () => {
    const mockResponse = {
      data: [],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: { source: TestConstants.TestSourceColon },
        accountId: TestConstants.TestAccount,
        apiToken: TestConstants.TestToken,
        datasetName: TestConstants.DatasetLogs,
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
  });

  it(testName('should escape single quotes in level and source'), async () => {
    const mockResponse = {
      data: [],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: { level: TestConstants.TestLevel, source: TestConstants.TestSourceEscaped },
        accountId: TestConstants.TestAccount,
        apiToken: TestConstants.TestToken,
        datasetName: TestConstants.DatasetLogs,
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    const call = (mockFetch.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = call[1].body as string;
    expect(body).toContain(TestConstants.TestLevelEscaped);
    expect(body).toContain(TestConstants.TestSourceEscapedDouble);
  });

  it(testName('should limit query results'), async () => {
    const mockResponse = {
      data: [],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: { limit: TestConstants.Limit200 },
        accountId: TestConstants.TestAccount,
        apiToken: TestConstants.TestToken,
        datasetName: TestConstants.DatasetLogs,
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    const call = (mockFetch.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = call[1].body as string;
    expect(body).toContain(`${TestConstants.Limit} ${TestConstants.Limit100}`);
  });

  it(testName('should handle result format with blob1 instead of entry'), async () => {
    const mockResponse = {
      result: [
        {
            blob1: JSON.stringify({
            id: TestConstants.LogId1,
            level: TestConstants.LevelInfo,
            message: TestConstants.TestLog,
            timestamp: Date.now(),
          }),
        },
      ],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: {},
        accountId: 'test-account',
        apiToken: 'test-token',
        datasetName: 'logs',
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs?.[0].id).toBe(TestConstants.LogId1);
  });

  it(testName('should filter out invalid log entries'), async () => {
    const mockResponse = {
      data: [
        {
          entry: JSON.stringify({
            id: 'log1',
            level: TestConstants.LevelInfo,
            message: 'Test log',
            timestamp: Date.now(),
          }),
        },
        {
          entry: 'invalid json',
        },
        {
          entry: null,
        },
      ],
    };

    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      } as unknown as Response),
    };

    const result = await queryLogsLogic(
      {
        query: {},
        accountId: 'test-account',
        apiToken: 'test-token',
        datasetName: 'logs',
        analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since });
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          };
        },
        defaultLimit: TestConstants.Limit50,
        maxLimit: TestConstants.Limit100,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs?.[0].id).toBe(TestConstants.LogId1);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should return sanitized message for Error instance'), () => {
    const error = new Error('Safe error message');
    const result = sanitizeErrorLogic({
      error,
      safeMessages: [TestConstants.SafeErrorMessage],
      separator: TestConstants.SeparatorColonSpace,
      fallbackMessage: TestConstants.InternalError,
      unknownError: TestConstants.UnknownError,
    });

    expect(result.sanitized).toBe(TestConstants.SafeErrorMessage);
  });

  it(testName('should return sanitized message for string error'), () => {
    const result = sanitizeErrorLogic({
      error: TestConstants.SafeErrorMessage,
      safeMessages: [TestConstants.SafeErrorMessage],
      separator: TestConstants.SeparatorColonSpace,
      fallbackMessage: TestConstants.InternalError,
      unknownError: TestConstants.UnknownError,
    });

    expect(result.sanitized).toBe(TestConstants.SafeErrorMessage);
  });

  it(testName('should return fallback for non-safe message'), () => {
    const error = new Error(TestConstants.UnsafeErrorMessage);
    const result = sanitizeErrorLogic({
      error,
      safeMessages: [TestConstants.SafeError],
      separator: TestConstants.SeparatorColonSpace,
      fallbackMessage: TestConstants.InternalError,
      unknownError: TestConstants.UnknownError,
    });

    expect(result.sanitized).toBe(TestConstants.InternalError);
  });

  it(testName('should match message starting with safe message'), () => {
    const error = new Error(TestConstants.SafeErrorAdditional);
    const result = sanitizeErrorLogic({
      error,
      safeMessages: [TestConstants.SafeError],
      separator: TestConstants.SeparatorColonSpace,
      fallbackMessage: TestConstants.InternalError,
      unknownError: TestConstants.UnknownError,
    });

    expect(result.sanitized).toBe(TestConstants.SafeErrorAdditional);
  });

  it(testName('should return unknownError for null/undefined error'), () => {
    const result = sanitizeErrorLogic({
      error: null,
      safeMessages: [TestConstants.SafeError],
      separator: TestConstants.SeparatorColonSpace,
      fallbackMessage: TestConstants.InternalError,
      unknownError: TestConstants.UnknownError,
    });

    expect(result.sanitized).toBe(TestConstants.UnknownError);
  });

  it(testName('should match exact safe message'), () => {
    const result = sanitizeErrorLogic({
      error: TestConstants.SafeError,
      safeMessages: [TestConstants.SafeError],
      separator: TestConstants.SeparatorColonSpace,
      fallbackMessage: TestConstants.InternalError,
      unknownError: TestConstants.UnknownError,
    });

    expect(result.sanitized).toBe(TestConstants.SafeError);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should return true for equal strings'), () => {
    const result = timingSafeEqualLogic({ a: TestConstants.Test, b: TestConstants.Test });
    expect(result.equal).toBe(true);
  });

  it(testName('should return false for different strings'), () => {
    const result = timingSafeEqualLogic({ a: TestConstants.Test1, b: TestConstants.Test2 });
    expect(result.equal).toBe(false);
  });

  it(testName('should return false for strings of different lengths'), () => {
    const result = timingSafeEqualLogic({ a: TestConstants.Test, b: TestConstants.Test1 });
    expect(result.equal).toBe(false);
  });

  it(testName('should handle empty strings'), () => {
    const result = timingSafeEqualLogic({ a: TestConstants.EmptyString, b: TestConstants.EmptyString });
    expect(result.equal).toBe(true);
  });

  it(testName('should handle very long strings'), () => {
    const longString = TestConstants.XRepeat1000;
    const result = timingSafeEqualLogic({ a: longString, b: longString });
    expect(result.equal).toBe(true);
  });

  it(testName('should handle strings with special characters'), () => {
    const special = TestConstants.SpecialChars;
    const result = timingSafeEqualLogic({ a: special, b: special });
    expect(result.equal).toBe(true);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should return false when auth header is missing'), () => {
    const result = validateApiKeyLogic({
      authHeader: null,
      expectedKey: TestConstants.TestKey,
      bearerScheme: TestConstants.Bearer,
      spaceSeparator: TestConstants.Space,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe(TestConstants.NoAuthorizationHeader);
  });

  it(testName('should return false for invalid format'), () => {
    const result = validateApiKeyLogic({
      authHeader: `${TestConstants.InvalidFormat} ${TestConstants.TestKey}`,
      expectedKey: TestConstants.TestKey,
      bearerScheme: TestConstants.Bearer,
      spaceSeparator: TestConstants.Space,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe(TestConstants.InvalidAuthorizationHeaderFormat);
  });

  it(testName('should return false for missing expected key'), () => {
    const result = validateApiKeyLogic({
      authHeader: 'Bearer test-key',
      expectedKey: undefined,
      bearerScheme: 'Bearer',
      spaceSeparator: ' ',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe(TestConstants.LogsApiKeyNotConfigured);
  });

  it(testName('should return true for matching keys'), () => {
    const result = validateApiKeyLogic({
      authHeader: 'Bearer test-key',
      expectedKey: TestConstants.TestKey,
      bearerScheme: TestConstants.Bearer,
      spaceSeparator: TestConstants.Space,
    });

    expect(result.valid).toBe(true);
  });

  it(testName('should return false for non-matching keys'), () => {
    const result = validateApiKeyLogic({
      authHeader: 'Bearer wrong-key',
      expectedKey: TestConstants.TestKey,
      bearerScheme: TestConstants.Bearer,
      spaceSeparator: TestConstants.Space,
    });

    expect(result.valid).toBe(false);
  });

  it(testName('should reject double space in auth header with single space separator'), () => {
    const result = validateApiKeyLogic({
      authHeader: 'Bearer  test-key',
      expectedKey: 'test-key',
      bearerScheme: 'Bearer',
      spaceSeparator: ' ',
    });

    expect(result.valid).toBe(false);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should create client ID from IP and user agent'), () => {
    const result = getClientIdLogic({
      cfConnectingIp: TestConstants.ClientIp192,
      userAgent: 'Mozilla/5.0',
      unknownFallback: TestConstants.Unknown,
      maxUserAgentLength: 100,
    });

    expect(result.clientId).toBe('192.168.1.1:Mozilla/5.0');
  });

  it(testName('should use fallback for missing IP'), () => {
    const result = getClientIdLogic({
      cfConnectingIp: null,
      userAgent: 'Mozilla/5.0',
      unknownFallback: TestConstants.Unknown,
      maxUserAgentLength: 100,
    });

    expect(result.clientId).toBe('unknown:Mozilla/5.0');
  });

  it(testName('should use fallback for missing user agent'), () => {
    const result = getClientIdLogic({
      cfConnectingIp: TestConstants.ClientIp192,
      userAgent: null,
      unknownFallback: TestConstants.Unknown,
      maxUserAgentLength: 100,
    });

    expect(result.clientId).toBe(TestConstants.ClientId192);
  });

  it(testName('should truncate long user agent'), () => {
    const longUserAgent = 'x'.repeat(200);
    const result = getClientIdLogic({
      cfConnectingIp: TestConstants.ClientIp192,
      userAgent: longUserAgent,
      unknownFallback: TestConstants.Unknown,
      maxUserAgentLength: 50,
    });

    expect(result.clientId).toBe('192.168.1.1:' + 'x'.repeat(50));
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should get stats successfully'), async () => {
    const oneDayAgo = Date.now() - TestConstants.OneDayAgoMs;
    const mockFetch: LogsFetch = {
      fetch: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [{ total: 100 }] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [{ level: TestConstants.LevelInfo, count: TestConstants.Limit50 }] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [{ full_index: 'info:source:origin', count: 30 }] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [{ oldest: oneDayAgo, newest: Date.now() }] }),
        } as unknown as Response),
    };

    const result = await getStatsFromAnalyticsEngineLogic({
      accountId: TestConstants.TestAccount,
      apiToken: TestConstants.TestToken,
      datasetName: TestConstants.DatasetLogs,
      analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
      oneDayAgoMs: oneDayAgo,
      separator: TestConstants.Separator,
      fetchImpl: mockFetch,
    });

    expect(result.success).toBe(true);
    expect(result.stats?.total_logs).toBe(TestConstants.Limit100);
    expect(result.stats?.by_level.info).toBe(TestConstants.Limit50);
    expect(result.stats?.by_source.source).toBe(30);
  });

  it(testName('should handle query errors'), async () => {
    const oneDayAgo = Date.now() - TestConstants.OneDayAgoMs;
    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
          json: vi.fn().mockResolvedValue({ errors: [{ message: TestConstants.SqlError }] }),
      } as unknown as Response),
    };

    const result = await getStatsFromAnalyticsEngineLogic({
      accountId: TestConstants.TestAccount,
      apiToken: TestConstants.TestToken,
      datasetName: TestConstants.DatasetLogs,
      analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
      oneDayAgoMs: oneDayAgo,
      separator: TestConstants.Separator,
      fetchImpl: mockFetch,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.StatsQueryError);
  });

  it(testName('should handle fetch errors'), async () => {
    const oneDayAgo = Date.now() - TestConstants.OneDayAgoMs;
    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockRejectedValue(new Error(TestConstants.NetworkError)),
    };

    const result = await getStatsFromAnalyticsEngineLogic({
      accountId: TestConstants.TestAccount,
      apiToken: TestConstants.TestToken,
      datasetName: TestConstants.DatasetLogs,
      analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
      oneDayAgoMs: oneDayAgo,
      separator: TestConstants.Separator,
      fetchImpl: mockFetch,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.NetworkError}`);
  });

  it(testName('should handle result format variations'), async () => {
    const oneDayAgo = Date.now() - TestConstants.OneDayAgoMs;
    const mockFetch: LogsFetch = {
      fetch: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ result: [{ total: '50' }] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ result: [] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ result: [] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ result: [] }),
        } as unknown as Response),
    };

    const result = await getStatsFromAnalyticsEngineLogic({
      accountId: TestConstants.TestAccount,
      apiToken: TestConstants.TestToken,
      datasetName: TestConstants.DatasetLogs,
      analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
      oneDayAgoMs: oneDayAgo,
      separator: TestConstants.Separator,
      fetchImpl: mockFetch,
    });

    expect(result.success).toBe(true);
    expect(result.stats?.total_logs).toBe(50);
  });

  it(testName('should handle multiple source parts'), async () => {
    const oneDayAgo = Date.now() - TestConstants.OneDayAgoMs;
    const mockFetch: LogsFetch = {
      fetch: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [{ total: 0 }] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ full_index: 'info:part1:part2:origin', count: 20 }],
          }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
        } as unknown as Response),
    };

    const result = await getStatsFromAnalyticsEngineLogic({
      accountId: TestConstants.TestAccount,
      apiToken: TestConstants.TestToken,
      datasetName: TestConstants.DatasetLogs,
      analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
      oneDayAgoMs: oneDayAgo,
      separator: TestConstants.Separator,
      fetchImpl: mockFetch,
    });

    expect(result.success).toBe(true);
    expect(result.stats?.by_source['part1:part2']).toBe(20);
  });

  it(testName('should handle null timestamps'), async () => {
    const oneDayAgo = Date.now() - TestConstants.OneDayAgoMs;
    const mockFetch: LogsFetch = {
      fetch: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [{ total: 0 }] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [{ oldest: null, newest: null }] }),
        } as unknown as Response),
    };

    const result = await getStatsFromAnalyticsEngineLogic({
      accountId: TestConstants.TestAccount,
      apiToken: TestConstants.TestToken,
      datasetName: TestConstants.DatasetLogs,
      analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
      oneDayAgoMs: oneDayAgo,
      separator: TestConstants.Separator,
      fetchImpl: mockFetch,
    });

    expect(result.success).toBe(true);
    expect(result.stats?.oldest_timestamp).toBeNull();
    expect(result.stats?.newest_timestamp).toBeNull();
  });

  it(testName('should handle non-ok responses'), async () => {
    const oneDayAgo = Date.now() - TestConstants.OneDayAgoMs;
    const mockFetch: LogsFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as unknown as Response),
    };

    const result = await getStatsFromAnalyticsEngineLogic({
      accountId: TestConstants.TestAccount,
      apiToken: TestConstants.TestToken,
      datasetName: TestConstants.DatasetLogs,
      analyticsEngineSqlUrl: (accountId) => getAnalyticsEngineSqlUrl(accountId),
      oneDayAgoMs: oneDayAgo,
      separator: TestConstants.Separator,
      fetchImpl: mockFetch,
    });

    expect(result.success).toBe(true);
    expect(result.stats?.total_logs).toBe(0);
  });
});
