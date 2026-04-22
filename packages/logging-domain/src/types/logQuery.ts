import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import type { LogSource } from '@ocentra/logging-domain/types/logSource';

export interface LogQuery {
  level?: LogLevel;
  context?: string;
  source?: LogSource;
  since?: string;
  until?: string;
  limit?: number;
}
