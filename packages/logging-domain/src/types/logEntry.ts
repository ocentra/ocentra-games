import type { LogLevel } from '@/types/logLevel';
import type { LogSource } from '@/types/logSource';
import type { LogOrigin } from '@/types/logOrigin';
import type { StackFrame } from '@/types/stackFrame';

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
