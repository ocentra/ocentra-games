import type { AnalyticsEngineDataset } from '@cloudflare/workers-types';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  LogsApiLimits,
  LogsApiSeparator,
  LogsApiTruncation,
  LogLevel,
} from '@/constants/logs-api';

const PER_REQUEST_CAP = 5;
const ORIGIN_WORKER = 'worker';

let analyticsBinding: AnalyticsEngineDataset | null = null;
let sourceUrl = '';
let requestCount = 0;
let errorSampleRate = 1;
let warnSampleRate = 0.1;
let loggingDisabled = false;

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

function parseSampleRate(val: string | undefined, defaultVal: number): number {
  if (val === undefined || val === '') return defaultVal;
  const n = parseFloat(val);
  if (Number.isNaN(n) || n < 0 || n > 1) return defaultVal;
  return n;
}

function writeToAnalytics(level: string, message: string, stack: string | undefined, data: unknown): void {
  if (!analyticsBinding || loggingDisabled) return;
  if (requestCount >= PER_REQUEST_CAP) return;

  if (level === LogLevel.Warn && Math.random() > warnSampleRate) return;
  if (level === LogLevel.Error && Math.random() > errorSampleRate) return;

  requestCount++;

  try {
    let stackStr = stack;
    if (data instanceof Error && data.stack && !stackStr) {
      stackStr = data.stack;
    }
    if (stackStr) {
      stackStr = truncateString(stackStr, LogsApiLimits.MaxStackSize);
    }

    const truncatedArgs =
      data && !(data instanceof Error)
        ? truncateArgs([data], LogsApiLimits.MaxArgsSize)
        : undefined;

    const logEntry = {
      id: crypto.randomUUID(),
      level,
      context: '',
      message: message.substring(0, LogsApiLimits.MaxLogSize),
      source: sourceUrl || 'Worker',
      origin: ORIGIN_WORKER,
      timestamp: Date.now(),
      args: truncatedArgs,
      stack: stackStr,
    };

    let entryJson = JSON.stringify(logEntry);
    if (entryJson.length > LogsApiLimits.MaxBlobSize) {
      const ratio = LogsApiLimits.MaxBlobSize / entryJson.length;
      (logEntry as { message: string }).message = logEntry.message.substring(
        0,
        Math.max(100, Math.floor(logEntry.message.length * ratio * 0.5))
      );
      (logEntry as { stack?: string }).stack = stackStr
        ? truncateString(stackStr, Math.floor(LogsApiLimits.MaxStackSize * ratio))
        : undefined;
      (logEntry as { args?: unknown[] }).args = truncatedArgs
        ? truncateArgs(truncatedArgs, Math.floor(LogsApiLimits.MaxArgsSize * ratio))
        : undefined;
      entryJson = JSON.stringify(logEntry);
      if (entryJson.length > LogsApiLimits.MaxBlobSize) {
        (logEntry as { message: string }).message = logEntry.message.substring(0, 100) + LogsApiTruncation.TruncatedMessage;
        (logEntry as { stack?: string }).stack = undefined;
        (logEntry as { args?: unknown[] }).args = undefined;
        entryJson = JSON.stringify(logEntry);
      }
    }

    const sourceForIndex = logEntry.source.includes(':') ? logEntry.source : `Worker:${logEntry.source}`;
    analyticsBinding.writeDataPoint({
      blobs: [entryJson],
      doubles: [logEntry.timestamp, 0, 0],
      indexes: [`${level}${LogsApiSeparator.Colon}${sourceForIndex}${LogsApiSeparator.Colon}${ORIGIN_WORKER}`],
    });
  } catch {
    requestCount--;
  }
}

const noop = (): void => {};
const noopAsync = (): Promise<void> => Promise.resolve();

const stubLogger = {
  register: (url: string): void => {
    sourceUrl = url;
  },
  logInfo: noop,
  logWarn: (message: string, stackTrace: StackTrace, data?: unknown): void => {
    writeToAnalytics(LogLevel.Warn, message, stackTrace as string, data);
  },
  logError: (message: string, stackTrace: StackTrace, data?: unknown): void => {
    writeToAnalytics(LogLevel.Error, message, stackTrace as string, data);
  },
  logDebug: noop,
  flushLogQueue: noopAsync,
  flushAllBatches: noop,
  getPendingBridgeSendPromise: (): Promise<void> => Promise.resolve(),
  registerBatchContext: noop,
};

export const Logger = {
  get instance() {
    return stubLogger;
  },
};

export function getStackTrace(): StackTrace {
  try {
    return (new Error().stack || '') as StackTrace;
  } catch {
    return '' as StackTrace;
  }
}

export function resetRequestCount(): void {
  requestCount = 0;
}

export function initLogger(
  analytics?: AnalyticsEngineDataset,
  _bucket?: unknown,
  _env?: string,
  _testMode?: string,
  _logLevel?: string,
  fullEnv?: { ERROR_LOG_SAMPLE_RATE?: string; WARN_LOG_SAMPLE_RATE?: string; ERROR_LOGGING_DISABLED?: string }
): void {
  analyticsBinding = analytics || null;
  errorSampleRate = parseSampleRate(fullEnv?.ERROR_LOG_SAMPLE_RATE, 1);
  warnSampleRate = parseSampleRate(fullEnv?.WARN_LOG_SAMPLE_RATE, 0.1);
  loggingDisabled = fullEnv?.ERROR_LOGGING_DISABLED === 'true' || fullEnv?.ERROR_LOGGING_DISABLED === '1';
}

export const flushDebugLogs = noopAsync;
export const clearDebugLogs = noop;
export const flushAllBatchesAndTestLogs = noopAsync;

export function getLogs(): never[] {
  return [];
}

export function getDebugLogBuffer(): never[] {
  return [];
}

export function getPendingBridgeSendPromise(): Promise<void> {
  return Promise.resolve();
}
