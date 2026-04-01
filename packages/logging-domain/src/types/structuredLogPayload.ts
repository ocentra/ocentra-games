export const LogOriginValue = {
  Test: 'test',
  Worker: 'worker',
} as const;

export type LogOriginValue = (typeof LogOriginValue)[keyof typeof LogOriginValue];

export interface StructuredLogPayload {
  runId?: string;
  suite?: string;
  testName?: string;
  worker?: string;
  functionName?: string;
  level: string;
  tags?: string[];
  message: string;
  stackTrace?: string[];
  source?: LogOriginValue;
  correlationId?: string;
  context?: string;
  moduleSource?: string;
  data?: unknown;
  file?: string;
  filePath?: string;
  line?: number;
  column?: number;
  timestamp?: number;
  elapsed?: number;
}
