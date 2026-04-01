import type { InternalLogEntry } from '@/types/internalLogEntry';

export interface CloudflareStorageProvider {
  writeToAnalyticsEngine(entry: InternalLogEntry): void;
  writeToSQLite(entry: InternalLogEntry, testName: string | undefined): Promise<void>;
  writeToR2DebugBuffer(entry: InternalLogEntry): void;
  flushR2DebugLogs(force?: boolean): Promise<void>;
  getLogs(): InternalLogEntry[];
  getDebugLogBuffer(): InternalLogEntry[];
  clearDebugLogs?(): Promise<void>;
}
