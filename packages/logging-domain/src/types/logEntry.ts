import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import type { LogSource } from '@ocentra/logging-domain/types/logSource';
import type { LogOrigin } from '@ocentra/logging-domain/types/logOrigin';
import type { StackFrame } from '@ocentra/logging-domain/types/stackFrame';

export interface LogEntry {
  id: string;
  level: LogLevel;
  context: string;
  message: string;
  source: LogSource;
  origin: LogOrigin;
  timestamp: number;
  args?: unknown[];
  stack?: string;
  stackFrames?: StackFrame[];
  file?: string;
  filePath?: string;
  line?: number;
  column?: number;
}
