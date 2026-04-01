import type { LogEntry } from '@/types/logEntry';
import type { LogQuery } from '@/types/logQuery';
import type { LogStats } from '@/types/logStats';
import { LogEntryField } from '@/types/logEntryFields';

type LogEntryWithoutIdAndOrigin = Omit<LogEntry, typeof LogEntryField.Id | typeof LogEntryField.Origin>;

export interface ILogStorage {
  storeLog(entry: LogEntryWithoutIdAndOrigin): Promise<void> | void;
  storeLogsBatch(entries: Array<LogEntryWithoutIdAndOrigin>): Promise<void> | void;
  queryLogs(query?: LogQuery): Promise<LogEntry[]> | LogEntry[];
  getStats(sourcePrefix?: string): Promise<LogStats> | LogStats;
  clearLogs(query?: LogQuery): Promise<number> | number;
  executeSql?(sql: string): Promise<unknown[]> | unknown[];
  flush?(): Promise<void> | void;
}
