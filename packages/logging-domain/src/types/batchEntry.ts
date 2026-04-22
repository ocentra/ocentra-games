import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { RequestContext } from '@ocentra/logging-domain/core/requestContextProvider';

export interface BatchEntry {
  message: string;
  data?: unknown;
  level: LogLevel;
  stackTrace: StackTrace;
  timestamp: number;
  requestContext?: RequestContext | null;
}
