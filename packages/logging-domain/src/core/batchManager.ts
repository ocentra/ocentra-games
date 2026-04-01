import type { LogLevel } from '@/types/logLevel';
import type { BatchConfig } from '@/types/batchConfig';
import type { BatchContext } from '@/types/batchContext';
import type { StackTrace } from '@/core/stackTrace';
import type { RequestContext } from '@/core/requestContextProvider';

export function createBatchContext(key: string, config: BatchConfig): BatchContext {
  return {
    key,
    config,
    entries: [],
    flushTimeout: null,
  };
}

export function addToBatch(
  context: BatchContext,
  level: LogLevel,
  message: string,
  stackTrace: StackTrace,
  data: unknown | undefined,
  requestContext?: RequestContext | null
): void {
  context.entries.push({
    message,
    data,
    level,
    stackTrace,
    timestamp: Date.now(),
    requestContext,
  });

  if (context.entries.length >= context.config.batchSize) {
    flushBatchContext(context, true);
  } else {
    if (context.flushTimeout) {
      clearTimeout(context.flushTimeout);
    }
    context.flushTimeout = setTimeout(() => {
      flushBatchContext(context);
    }, context.config.flushInterval);
  }
}

export function flushBatchContext(
  context: BatchContext,
  forceEnabled?: boolean,
  onFlush?: (
    level: LogLevel,
    message: string,
    stackTrace: StackTrace,
    data?: unknown,
    requestContext?: RequestContext | null
  ) => void
): void {
  if (!context || context.entries.length === 0) return;

  if (!context.config.enabled && !forceEnabled) {
    context.entries = [];
    return;
  }

  if (context.flushTimeout) {
    clearTimeout(context.flushTimeout);
    context.flushTimeout = null;
  }

  const totalCount = context.entries.length;
  const samples = context.entries.slice(0, 10).map((e) => ({
    message: e.message,
    data: e.data,
  }));

  const firstEntry = context.entries[0];
  if (!firstEntry) {
    context.entries = [];
    return;
  }

  if (totalCount === 1) {
    if (onFlush) {
      onFlush(firstEntry.level, firstEntry.message, firstEntry.stackTrace, firstEntry.data, firstEntry.requestContext);
    }
  } else {
    const batchData = {
      total: totalCount,
      samples,
      allMessages: context.entries.map((e) => e.message),
    };
    const batchMessage = `[${context.key}] Batched ${totalCount} log entries`;
    if (onFlush) {
      onFlush(firstEntry.level, batchMessage, firstEntry.stackTrace, batchData, firstEntry.requestContext);
    }
  }

  context.entries = [];
}
