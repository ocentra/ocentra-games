import type { LogLevel } from '@/types/logLevel';
import type { StackTrace } from '@/core/stackTrace';
import type { RequestContext } from '@/core/requestContextProvider';

export interface BatchEntry {
  message: string;
  data?: unknown;
  level: LogLevel;
  stackTrace: StackTrace;
  timestamp: number;
  requestContext?: RequestContext | null;
}
