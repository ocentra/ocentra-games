import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { MainAppPathResolver } from '@ocentra/logging-domain/core/adapters/mainAppPathResolver';
import type { ILogStorage } from '@ocentra/logging-domain/storage/storageInterface';
import type { LogEntry } from '@ocentra/logging-domain/types/logEntry';
import type { LogStats } from '@ocentra/logging-domain/types/logStats';
import { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import { LogConsumer } from '@ocentra/logging-domain/transport/bridgeLogPayload';
import { BridgeTransport } from '@ocentra/logging-domain/transport/bridgeTransport';
import { TauriTransport } from '@ocentra/logging-domain/transport/tauriTransport';
import { deleteAppNdjsonFiles } from '@ocentra/logging-domain/app-log/appNdjsonWriter';
import { getFilePathFromUrl, getSourceFromFilePath } from '@ocentra/app-core/path';
import { isLocalHostname } from '@ocentra/endpoint-domain/constants/hostname';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { SaveLogsEvent } from '@ocentra/eventing-domain/events/logs/SaveLogsEvent';
import { createRequestContextProvider } from '@/lib/logging/requestContext';

const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 2000;

const logBuffer: unknown[] = [];

async function flushBuffer(): Promise<void> {
  if (logBuffer.length === 0) return;
  const batch = logBuffer.splice(0, logBuffer.length);
  const deferred = new OperationDeferred<void>();
  await EventBus.instance.publishAsync(new SaveLogsEvent(batch, deferred));
  await deferred.promise.catch(() => {});
}

const eventBusStorage: ILogStorage = {
  storeLog(entry: Omit<LogEntry, 'id' | 'origin'>): void {
    logBuffer.push({ ...entry, id: crypto.randomUUID?.() ?? `log-${Date.now()}`, origin: 'browser' });
    if (logBuffer.length >= BATCH_SIZE) {
      void flushBuffer();
    }
  },
  storeLogsBatch(entries: Array<Omit<LogEntry, 'id' | 'origin'>>): void {
    for (const e of entries) {
      logBuffer.push({ ...e, id: crypto.randomUUID?.() ?? `log-${Date.now()}`, origin: 'browser' });
    }
    if (logBuffer.length >= BATCH_SIZE) {
      void flushBuffer();
    }
  },
  queryLogs(): LogEntry[] {
    return [];
  },
  getStats(): LogStats {
    return {
      total_logs: 0,
      by_level: { error: 0, info: 0, log: 0, debug: 0, warn: 0 } as Record<LogLevel, number>,
      by_source: {},
      by_context: {},
      oldest_timestamp: null,
      newest_timestamp: null,
    };
  },
  clearLogs(): number {
    return 0;
  },
  flush(): Promise<void> {
    return flushBuffer();
  },
};

let initialized = false;

export function initLogging(): void {
  if (initialized) return;
  initialized = true;

  const pathResolver = new MainAppPathResolver({
    getFilePathFromUrl,
    getSourceFromFilePath: (fp) => {
      if (!fp) return 'unknown';
      return getSourceFromFilePath(fp) as ReturnType<typeof getSourceFromFilePath>;
    },
  });

  const requestContextProvider = createRequestContextProvider();

  const bridgeEndpoint = typeof process !== 'undefined' && process.env?.TEST_LOG_SERVER_URL
    ? process.env.TEST_LOG_SERVER_URL
    : undefined;
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const isProductionBuild = typeof import.meta !== 'undefined' && import.meta.env?.PROD === true;
  const isLocalWeb = typeof window !== 'undefined' && isLocalHostname(window.location.hostname);
  const shouldUseBrowserLogStorage = !isProductionBuild || isLocalWeb || isTauri || !!bridgeEndpoint;

  MainAppLogger.initLogger(shouldUseBrowserLogStorage ? eventBusStorage : null, pathResolver, {
    bridgeConsumer: LogConsumer.Main,
    bridgeEndpoint,
    consoleEnabled: shouldUseBrowserLogStorage,
  }, requestContextProvider);

  if (typeof process !== 'undefined' && process.versions?.node) {
    const keepCount = isTauri ? 10 : 5;
    deleteAppNdjsonFiles('main', keepCount);
  }

  if (isTauri) {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      MainAppLogger.instance.addTransport(new TauriTransport(invoke));
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.error('[Logging] Failed to initialize Tauri transport:', err);
    });
  } else if (bridgeEndpoint) {
    MainAppLogger.instance.addTransport(new BridgeTransport(bridgeEndpoint));
  }

  if (shouldUseBrowserLogStorage) {
    setInterval(() => void flushBuffer(), FLUSH_INTERVAL_MS);
  }
}

export async function flushTestLogs(): Promise<void> {
  await MainAppLogger.instance.flushLogQueue();
}
