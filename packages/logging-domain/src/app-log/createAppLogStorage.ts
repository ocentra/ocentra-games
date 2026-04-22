import type { ILogStorage } from '@ocentra/logging-domain/storage/storageInterface';
import type { LogEntry } from '@ocentra/logging-domain/types/logEntry';
import type { LogQuery } from '@ocentra/logging-domain/types/logQuery';
import type { LogStats } from '@ocentra/logging-domain/types/logStats';
import type { LogOrigin } from '@ocentra/logging-domain/types/logOrigin';
import { AppLogDuckDb, getDefaultAppDbPath } from '@ocentra/logging-domain/app-log/appLogDuckDb';
import { appendLogEntries, deleteAppNdjsonFiles } from '@ocentra/logging-domain/app-log/appNdjsonWriter';
import {
  createIngestState,
  getNewEntries,
  hasPendingEntries,
  type IngestState,
} from '@ocentra/logging-domain/app-log/appLogIngest';

const DEFAULT_ORIGIN: LogOrigin = 'browser';

function normalizeEntry(
  entry: LogEntry | Omit<LogEntry, 'id' | 'origin'>,
  defaultOrigin: LogOrigin = DEFAULT_ORIGIN
): LogEntry {
  const id = 'id' in entry && entry.id ? entry.id : `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const origin = 'origin' in entry && entry.origin ? entry.origin : defaultOrigin;
  return { ...entry, id, origin } as LogEntry;
}

export interface CreateAppLogStorageOptions {
  scope: string;
  dbDir?: string;
  ingestIntervalMs?: number;
}

export function createAppLogStorage(
  options: CreateAppLogStorageOptions
): ILogStorage & { dispose(): Promise<void> } {
  const { scope, dbDir, ingestIntervalMs = 1000 } = options;
  let ingestState: IngestState = createIngestState();
  let ingestLock: Promise<void> = Promise.resolve();
  let ingestTimer: ReturnType<typeof setInterval> | null = null;

  const dbPath = getDefaultAppDbPath(scope, dbDir);

  async function ingestPendingLines(): Promise<void> {
    ingestLock = ingestLock.then(async () => {
      if (!hasPendingEntries(scope, ingestState, dbDir)) return;
      const { entries, updatedState } = getNewEntries(scope, ingestState, dbDir);
      ingestState = updatedState;
      if (entries.length === 0) return;
      const db = await AppLogDuckDb.create(dbPath);
      try {
        await db.insertBatch(entries);
      } finally {
        await db.close();
      }
    });
    await ingestLock;
  }

  async function withDb<T>(fn: (db: Awaited<ReturnType<typeof AppLogDuckDb.create>>) => Promise<T>): Promise<T> {
    if (hasPendingEntries(scope, ingestState, dbDir)) {
      await ingestPendingLines();
    }
    const db = await AppLogDuckDb.create(dbPath);
    try {
      return await fn(db);
    } finally {
      await db.close();
    }
  }

  const storage: ILogStorage & { dispose(): Promise<void> } = {
    storeLog(entry: LogEntry | Omit<LogEntry, 'id' | 'origin'>): void {
      const normalized = normalizeEntry(entry);
      appendLogEntries(scope, [normalized], dbDir);
    },

    storeLogsBatch(entries: Array<LogEntry | Omit<LogEntry, 'id' | 'origin'>>): void {
      if (entries.length === 0) return;
      const normalized = entries.map((e) => normalizeEntry(e));
      appendLogEntries(scope, normalized, dbDir);
    },

    async queryLogs(query?: LogQuery): Promise<LogEntry[]> {
      return withDb((db) => db.queryLogs(query));
    },

    async getStats(sourcePrefix?: string): Promise<LogStats> {
      return withDb((db) => db.getStats(sourcePrefix));
    },

    async clearLogs(): Promise<number> {
      deleteAppNdjsonFiles(scope, 0, dbDir);
      ingestState = createIngestState();
      return withDb((db) => db.clearLogs());
    },

    async flush(): Promise<void> {
      await ingestPendingLines();
    },

    async dispose(): Promise<void> {
      if (ingestTimer) {
        clearInterval(ingestTimer);
        ingestTimer = null;
      }
      await ingestPendingLines();
    },
  };

  ingestTimer = setInterval(() => {
    if (!hasPendingEntries(scope, ingestState, dbDir)) return;
    ingestPendingLines().catch(() => { });
  }, ingestIntervalMs);

  return storage;
}
