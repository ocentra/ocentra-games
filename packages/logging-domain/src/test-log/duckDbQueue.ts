import type { TestLog, RunType } from '@/test-log/types';
import { TestLogDuckDb, getDefaultDbPath, ingestFilesOnly, LOG_DB_DOMAIN_ENV } from '@/test-log/testLogDuckDb';
import { getChangedFiles, updateManifest } from '@/test-log/ingestManifest';

function getDomain(): string | undefined {
  return process.env[LOG_DB_DOMAIN_ENV];
}

export function enqueueIngest(
  runType: RunType,
  logs: TestLog[]
): Promise<{ runsInserted: number; logsInserted: number }> {
  return withDb(async (db) => db.ingestFromMemory(runType, logs));
}

export function enqueueRead<T>(fn: (db: TestLogDuckDb) => Promise<T>): Promise<T> {
  return withDb(fn);
}

async function withDb<T>(fn: (db: TestLogDuckDb) => Promise<T>): Promise<T> {
  const dbPath = getDefaultDbPath(getDomain());
  const db = await TestLogDuckDb.create({ dbPath });
  try {
    return await fn(db);
  } finally {
    await db.close().catch(() => {});
  }
}

export async function closeDbQueue(): Promise<void> {}

export function getQueueStatus(): {
  pendingWrites: number;
  pendingReads: number;
  activeWriters: number;
  activeReaders: number;
} {
  return {
    pendingWrites: 0,
    pendingReads: 0,
    activeWriters: 0,
    activeReaders: 0,
  };
}

export async function lazyIngestIfNeeded(logsDir: string, runType: RunType): Promise<{ ingested: boolean; files: number }> {
  const domain = getDomain();
  const { newFiles, changedFiles } = getChangedFiles(logsDir, domain);
  const filesToIngest = [...newFiles, ...changedFiles];

  if (filesToIngest.length === 0) {
    return { ingested: false, files: 0 };
  }

  await ingestFilesOnly(getDefaultDbPath(domain), filesToIngest, runType);
  updateManifest(logsDir, domain);
  return { ingested: true, files: filesToIngest.length };
}

export async function queryWithLazyIngest<T>(
  logsDir: string,
  runType: RunType,
  queryFn: (db: TestLogDuckDb) => Promise<T>
): Promise<T> {
  await lazyIngestIfNeeded(logsDir, runType);
  return enqueueRead(queryFn);
}
