import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';

export interface LogStats {
  total_logs: number;
  by_level: Record<LogLevel, number>;
  by_source: Record<string, number>;
  by_context: Record<string, number>;
  oldest_timestamp: number | null;
  newest_timestamp: number | null;
}
