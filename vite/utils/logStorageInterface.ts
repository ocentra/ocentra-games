import type { LogEntry } from '@ocentra/logging-domain/types/logEntry';
import type { LogQuery } from '@ocentra/logging-domain/types/logQuery';
import type { LogStats } from '@ocentra/logging-domain/types/logStats';

export interface ILogStorage {
  storeLog(entry: LogEntry | Omit<LogEntry, 'id' | 'origin'>): Promise<void> | void;
  storeLogsBatch(entries: Array<LogEntry | Omit<LogEntry, 'id' | 'origin'>>): Promise<void> | void;
  queryLogs(query?: LogQuery): Promise<LogEntry[]> | LogEntry[];
  getStats(sourcePrefix?: string): Promise<LogStats> | LogStats;
  clearLogs(query?: LogQuery): Promise<number> | number;
  flush?(): Promise<void> | void;
}
