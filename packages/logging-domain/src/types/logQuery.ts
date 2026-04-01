import type { LogLevel } from '@/types/logLevel';
import type { LogSource } from '@/types/logSource';

export interface LogQuery {
  level?: LogLevel;
  context?: string;
  source?: LogSource;
  since?: string;
  until?: string;
  limit?: number;
}
