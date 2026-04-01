import type { LogLevel } from '@/types/logLevel';
import type { StackFrame } from '@/types/stackFrame';

export interface InternalLogEntry {
  level: LogLevel;
  source: string;
  context: string;
  message: string;
  data?: unknown;
  timestamp: number;
  correlationId?: string;
  testName?: string;
  elapsed?: number;
  file?: string;
  filePath?: string;
  line?: number;
  column?: number;
  stack?: string;
  stackFrames?: StackFrame[];
}
