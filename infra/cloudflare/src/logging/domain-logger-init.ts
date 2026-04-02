import type { AnalyticsEngineDataset, R2Bucket } from '@cloudflare/workers-types';
import { CloudflareLogger } from '@ocentra/logging-domain/core/cloudflareLogger';
import { CloudflarePathResolver } from '@ocentra/logging-domain/core/adapters/cloudflarePathResolver';
import { CloudflareRequestContextProvider } from '@ocentra/logging-domain/core/adapters/cloudflareRequestContextProvider';
import { CloudflareLogDecisionProvider } from '@ocentra/logging-domain/core/adapters/cloudflareLogDecisionProvider';
import { CloudflareStorage } from '@ocentra/logging-domain/storage/adapters/cloudflareStorage';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  flushDebugLogs,
  clearDebugLogs,
  getLogs as getDomainLogs,
  getDebugLogBuffer,
} from '@ocentra/logging-domain/core/cloudflareLoggerHelpers';
import { LogConsumer } from '@ocentra/logging-domain/transport/bridgeLogPayload';
import type { InternalLogEntry } from '@ocentra/logging-domain/types/internalLogEntry';
import { initLogConfig, shouldLog, shouldLogToConsole, shouldStoreLog, isDevOrTestEnvironment } from './log-config';
import { getCurrentContext } from './request-context';
import { TestLogOrigin } from '@ocentra/logging-domain/test-log/types';
import {
  LogsApiLimits,
  LogsApiSeparator,
  LogsApiTruncation,
  LogLevel,
} from '@/constants/logs-api';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';

let analyticsBinding: AnalyticsEngineDataset | null = null;
let r2Bucket: R2Bucket | null = null;
const DEBUG_LOG_FILE_NAME = 'test.json';

const loggerBackendFailureBuffer: { message: string; error: unknown; at: number }[] = [];
const LoggerBackendFailureBufferMax = 50;

function loggerBackendFailureFallback(message: string, error: unknown): void {
  loggerBackendFailureBuffer.push({ message, error, at: Date.now() });
  if (loggerBackendFailureBuffer.length > LoggerBackendFailureBufferMax) {
    loggerBackendFailureBuffer.shift();
  }
}

export function getLoggerBackendFailures(): readonly { message: string; error: unknown; at: number }[] {
  return loggerBackendFailureBuffer;
}

function getFilePathFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    if (pathname.includes('/src/')) {
      return pathname.split('/src/')[1] || pathname;
    }
    return pathname.startsWith('/') ? pathname.substring(1) : pathname;
  } catch {
    return url;
  }
}

function truncateString(str: string, maxSize: number): string {
  if (str.length <= maxSize) return str;
  return str.substring(0, maxSize - LogsApiTruncation.Truncated.length) + LogsApiTruncation.Truncated;
}

function truncateArgs(args: unknown[] | undefined, maxSize: number): unknown[] | undefined {
  if (!args || args.length === 0) return undefined;
  try {
    const jsonStr = JSON.stringify(args);
    if (jsonStr.length <= maxSize) return args;
    const truncated: unknown[] = [];
    let currentSize = 2;
    for (const arg of args) {
      const argStr = JSON.stringify(arg);
      if (currentSize + argStr.length + 1 > maxSize) break;
      truncated.push(arg);
      currentSize += argStr.length + 1;
    }
    return truncated;
  } catch {
    return undefined;
  }
}

async function writeToSQLite(): Promise<void> {
  if (!isDevOrTestEnvironment()) {
    return;
  }
}

function writeToAnalyticsEngine(entry: InternalLogEntry): void {
  if (!analyticsBinding) return;

  try {
    const isErrorOrWarn = entry.level === LogLevel.Error || entry.level === LogLevel.Warn;

    let stack: string | undefined = entry.stack;
    if (!stack && isErrorOrWarn && entry.data instanceof Error && entry.data.stack) {
      stack = entry.data.stack;
    }

    if (stack) {
      stack = truncateString(stack, LogsApiLimits.MaxStackSize);
    }

    const truncatedArgs =
      entry.data && !(entry.data instanceof Error)
        ? truncateArgs([entry.data], LogsApiLimits.MaxArgsSize)
        : undefined;

    const logEntry = {
      id: entry.correlationId || crypto.randomUUID(),
      level: entry.level,
      context: entry.context,
      message: entry.message.substring(0, LogsApiLimits.MaxLogSize),
      source: entry.source,
      origin: TestLogOrigin.Worker,
      timestamp: entry.timestamp,
      args: truncatedArgs,
      stack: stack,
      stackFrames: entry.stackFrames,
      file: entry.file,
      filePath: entry.filePath,
      line: entry.line,
      column: entry.column,
      testName: entry.testName,
      elapsed: entry.elapsed,
    };

    let entryJson = JSON.stringify(logEntry);

    if (entryJson.length > LogsApiLimits.MaxBlobSize) {
      const ratio = LogsApiLimits.MaxBlobSize / entryJson.length;
      const newMessageSize = Math.floor(entryJson.length * ratio * 0.5);
      logEntry.message = logEntry.message.substring(0, Math.max(100, newMessageSize));

      if (logEntry.stack) {
        logEntry.stack = truncateString(logEntry.stack, Math.floor(LogsApiLimits.MaxStackSize * ratio));
      }

      if (logEntry.args) {
        logEntry.args = truncateArgs(logEntry.args, Math.floor(LogsApiLimits.MaxArgsSize * ratio));
      }

      entryJson = JSON.stringify(logEntry);

      if (entryJson.length > LogsApiLimits.MaxBlobSize) {
        logEntry.message = logEntry.message.substring(0, 100) + LogsApiTruncation.TruncatedMessage;
        logEntry.stack = undefined;
        logEntry.stackFrames = undefined;
        logEntry.args = undefined;
        entryJson = JSON.stringify(logEntry);
      }
    }

    const sourceForIndex = entry.source.includes(':') ? entry.source : `Worker:${entry.source}`;
    analyticsBinding.writeDataPoint({
      blobs: [entryJson],
      doubles: [entry.timestamp, entry.line || 0, entry.column || 0],
      indexes: [`${entry.level}${LogsApiSeparator.Colon}${sourceForIndex}${LogsApiSeparator.Colon}worker`],
    });
  } catch (error) {
    loggerBackendFailureFallback('[Logger] Failed to write to Analytics Engine', error);
  }
}

async function flushDebugLogsToR2(entries: InternalLogEntry[], force?: boolean): Promise<void> {
  if (!isDevOrTestEnvironment()) {
    return;
  }

  if (entries.length === 0 && !force) {
    return;
  }
  if (!r2Bucket) {
    return;
  }

  try {
    const key = `${BucketPath.DebugLogs}${DEBUG_LOG_FILE_NAME}`;

    const existingLogs = await r2Bucket.get(key);
    let existingEntries: InternalLogEntry[] = [];

    if (existingLogs) {
      try {
        const existingText = await existingLogs.text();
        const existingData = JSON.parse(existingText);
        existingEntries = Array.isArray(existingData.logs) ? existingData.logs : [];
      } catch {
        existingEntries = [];
      }
    }

    const allLogs = [...existingEntries, ...entries];
    const logData = {
      timestamp: Date.now(),
      logs: allLogs,
    };

    await r2Bucket.put(key, JSON.stringify(logData, null, 2), {
      httpMetadata: {
        contentType: HttpContentType.ApplicationJson,
      },
    });
  } catch (error) {
    if (isDevOrTestEnvironment()) {
      loggerBackendFailureFallback('[Logger] Failed to write debug logs to R2', error);
    }
  }
}

async function clearDebugLogsFromR2(): Promise<void> {
  if (!r2Bucket) return;

  if (!isDevOrTestEnvironment()) return;

  try {
    const key = `${BucketPath.DebugLogs}${DEBUG_LOG_FILE_NAME}`;
    await r2Bucket.delete(key).catch(() => { });
  } catch (error) {
    loggerBackendFailureFallback('[Logger] Failed to clear debug logs', error);
  }
}

// In-memory logs not used - logs go to Analytics Engine (prod), SQLite (test), R2 (debug)
function getLogsArray(): InternalLogEntry[] {
  return [];
}

export function resetRequestCount(): void { }

export function initLogger(
  analytics?: AnalyticsEngineDataset,
  bucket?: R2Bucket,
  env?: string,
  testModeEnv?: string,
  logLevel?: string,
  _fullEnv?: { ERROR_LOG_SAMPLE_RATE?: string; WARN_LOG_SAMPLE_RATE?: string; ERROR_LOGGING_DISABLED?: string }
): void {
  analyticsBinding = analytics || null;
  r2Bucket = bucket || null;
  initLogConfig({
    LOG_LEVEL: logLevel,
    ENVIRONMENT: env,
    TEST_MODE: testModeEnv,
  });

  const pathResolver = new CloudflarePathResolver({
    getFilePathFromUrl,
  });

  const requestContextProvider = new CloudflareRequestContextProvider({
    getCurrentContext,
  });

  const logDecisionProvider = new CloudflareLogDecisionProvider({
    shouldLog,
    shouldLogToConsole,
    shouldStoreLog,
    isDevOrTestEnvironment,
  });

  const cloudflareStorage = new CloudflareStorage({
    writeToAnalyticsEngine,
    writeToSQLite,
    flushDebugLogsToR2,
    clearDebugLogsFromR2,
    getLogsArray,
  });

  CloudflareLogger.initLogger(
    pathResolver,
    requestContextProvider,
    logDecisionProvider,
    cloudflareStorage,
    {
      batchConfig: {
        enabled: true,
        batchSize: 30,
        flushInterval: 100,
      },
      bridgeConsumer: LogConsumer.Cloudflare,
    }
  );

  CloudflareLogger.instance.registerBatchContext('Router.match', {
    enabled: true,
    batchSize: 30,
    flushInterval: 50,
  });
}

function createTestLogger(): void {
  try {
    void CloudflareLogger.instance;
    return;
  } catch {
    // Logger not initialized, continue with initialization
  }

  const pathResolver = new CloudflarePathResolver({
    getFilePathFromUrl: (url: string) => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        if (pathname.includes('/src/')) {
          return pathname.split('/src/')[1] || pathname;
        }
        return pathname.startsWith('/') ? pathname.substring(1) : pathname;
      } catch {
        return url;
      }
    }
  });

  const requestContextProvider = new CloudflareRequestContextProvider({
    getCurrentContext
  });

  const logDecisionProvider = new CloudflareLogDecisionProvider({
    shouldLog,
    shouldLogToConsole,
    shouldStoreLog,
    isDevOrTestEnvironment
  });

  const cloudflareStorage = new CloudflareStorage({
    writeToAnalyticsEngine,
    writeToSQLite,
    flushDebugLogsToR2,
    clearDebugLogsFromR2,
    getLogsArray
  });

  CloudflareLogger.initLogger(
    pathResolver,
    requestContextProvider,
    logDecisionProvider,
    cloudflareStorage,
    {
      consoleEnabled: true,
      includeTimestamps: false,
      initPhaseConfig: { enabled: false },
      batchConfig: {
        enabled: true,
        batchSize: 30,
        flushInterval: 100,
      },
      bridgeConsumer: LogConsumer.Cloudflare,
    }
  );

  CloudflareLogger.instance.registerBatchContext('Router.match', {
    enabled: true,
    batchSize: 30,
    flushInterval: 50,
  });
}

const LoggerProxy = new Proxy(CloudflareLogger, {
  get(target, prop) {
    if (prop === 'instance') {
      if (isDevOrTestEnvironment()) {
        try {
          void target.instance;
        } catch {
          createTestLogger();
        }
      }
    }
    return Reflect.get(target, prop);
  }
});

export async function flushTestLogs(): Promise<void> {
  try {
    await CloudflareLogger.instance.flushLogQueue();
  } catch {
    // Silently ignore if logger not initialized
  }
  try {
    const { flushReporterQueue } = await import('@ocentra/logging-domain/transport/bridgeTransport');
    await flushReporterQueue();
  } catch {
    // Silently ignore if reporter queue flush fails
  }
}

export async function flushAllBatchesAndTestLogs(): Promise<void> {
  try {
    CloudflareLogger.instance.flushAllBatches();
    await flushDebugLogs();
    await flushTestLogs();
  } catch {
    // Silently ignore if logger not initialized
  }
}

export function getPendingBridgeSendPromise(): Promise<void> {
  try {
    return CloudflareLogger.instance.getPendingBridgeSendPromise();
  } catch {
    return Promise.resolve();
  }
}

export {
  LoggerProxy as Logger,
  getStackTrace,
  flushDebugLogs,
  clearDebugLogs,
  getDomainLogs as getLogs,
  getDebugLogBuffer,
};
