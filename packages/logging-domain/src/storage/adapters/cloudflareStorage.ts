import type { CloudflareStorageProvider } from '@ocentra/logging-domain/storage/cloudflareStorageProvider';
import type { InternalLogEntry } from '@ocentra/logging-domain/types/internalLogEntry';

export interface CloudflareStorageFunctions {
  writeToAnalyticsEngine: (entry: InternalLogEntry) => void;
  writeToSQLite: (entry: InternalLogEntry, testName: string | undefined) => Promise<void>;
  flushDebugLogsToR2: (entries: InternalLogEntry[], force?: boolean) => Promise<void>;
  clearDebugLogsFromR2: () => Promise<void>;
  getLogsArray: () => InternalLogEntry[];
}

export class CloudflareStorage implements CloudflareStorageProvider {
  private debugLogBuffer: InternalLogEntry[] = [];
  private readonly DEBUG_LOG_BUFFER_SIZE = 10;
  private lastFlushTime = 0;
  private readonly DEBUG_LOG_FLUSH_INTERVAL = 5000;

  constructor(private storageFunctions: CloudflareStorageFunctions) {}

  writeToAnalyticsEngine(entry: InternalLogEntry): void {
    this.storageFunctions.writeToAnalyticsEngine(entry);
  }

  async writeToSQLite(entry: InternalLogEntry, testName: string | undefined): Promise<void> {
    await this.storageFunctions.writeToSQLite(entry, testName);
  }

  writeToR2DebugBuffer(entry: InternalLogEntry): void {
    this.debugLogBuffer.push(entry);
    if (this.debugLogBuffer.length >= this.DEBUG_LOG_BUFFER_SIZE) {
      this.flushR2DebugLogs().catch((error) => {
        console.error('[Logger] Failed to flush R2 debug logs:', error);
      });
    }
  }

  async flushR2DebugLogs(force?: boolean): Promise<void> {
    if (this.debugLogBuffer.length === 0 && !force) {
      return;
    }

    if (!force) {
      const now = Date.now();
      if (now - this.lastFlushTime < this.DEBUG_LOG_FLUSH_INTERVAL && this.debugLogBuffer.length < this.DEBUG_LOG_BUFFER_SIZE) {
        return;
      }
    }

    const logsToWrite = [...this.debugLogBuffer];
    this.debugLogBuffer = [];
    this.lastFlushTime = Date.now();

    if (logsToWrite.length === 0 && !force) {
      return;
    }

    await this.storageFunctions.flushDebugLogsToR2(logsToWrite, force);
  }

  getLogs(): InternalLogEntry[] {
    return this.storageFunctions.getLogsArray();
  }

  getDebugLogBuffer(): InternalLogEntry[] {
    return [...this.debugLogBuffer];
  }

  async clearDebugLogs(): Promise<void> {
    await this.storageFunctions.clearDebugLogsFromR2();
    this.debugLogBuffer = [];
    this.lastFlushTime = 0;
  }
}
