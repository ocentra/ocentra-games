import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { ILogStorage } from './logStorageInterface';
import { createNdjsonDuckDbLogStorage } from './ndjsonDuckDbLogStorage';
import type { LogStats } from '@ocentra/logging-domain/types/logStats';
import { LogLevel } from '@ocentra/logging-domain/types/logLevel';

const emptyStats: LogStats = {
  total_logs: 0,
  by_level: { [LogLevel.Info]: 0, [LogLevel.Log]: 0, [LogLevel.Warn]: 0, [LogLevel.Error]: 0, [LogLevel.Debug]: 0 },
  by_source: {},
  by_context: {},
  oldest_timestamp: null,
  newest_timestamp: null,
};

const noopStorage: ILogStorage = {
  storeLog: () => {},
  storeLogsBatch: () => {},
  queryLogs: () => Promise.resolve([]),
  getStats: () => Promise.resolve(emptyStats),
  clearLogs: () => Promise.resolve(0),
};

let mainStorage: (ILogStorage & { dispose?(): Promise<void> }) | null = null;
let viteStorage: (ILogStorage & { dispose?(): Promise<void> }) | null = null;

function logStorageInitFailure(error: unknown): void {
  MainAppLogger.instance.logWarn(
    '[logStorageFactory] Failed to initialize DuckDB log storage (missing native binary?), falling back to noop',
    getStackTrace(),
    { error: error instanceof Error ? error.message : String(error) },
  );
}

export function getLogStorage(): ILogStorage {
  if (!mainStorage) {
    try {
      mainStorage = createNdjsonDuckDbLogStorage({ scope: 'main' });
    } catch (error: unknown) {
      logStorageInitFailure(error);
      mainStorage = noopStorage as ILogStorage & { dispose?(): Promise<void> };
    }
  }
  return mainStorage;
}

export function getViteLogStorage(): ILogStorage {
  if (!viteStorage) {
    try {
      viteStorage = createNdjsonDuckDbLogStorage({ scope: 'vite' });
    } catch {
      viteStorage = noopStorage as ILogStorage & { dispose?(): Promise<void> };
    }
  }
  return viteStorage;
}

export async function disposeAllStorage(): Promise<void> {
  if (mainStorage?.dispose) await mainStorage.dispose();
  if (viteStorage?.dispose) await viteStorage.dispose();
  mainStorage = null;
  viteStorage = null;
}

export function setLogStorage(s: ILogStorage): void {
  if (mainStorage?.dispose) mainStorage.dispose().catch(() => {});
  mainStorage = s as ILogStorage & { dispose?(): Promise<void> };
}

export function setTestStorage(_s: ILogStorage | null): void {
  if (mainStorage?.dispose) mainStorage.dispose().catch(() => {});
  if (viteStorage?.dispose) viteStorage.dispose().catch(() => {});
  mainStorage = noopStorage as ILogStorage & { dispose?(): Promise<void> };
  viteStorage = null;
}
