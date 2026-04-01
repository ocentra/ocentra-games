import type { RunType } from '@/test-log/types';

export interface RequestContext {
  correlationId: string;
  testName?: string;
  runId?: string;
  testLogServerUrl?: string;
  userId?: string;
  startTime: number;
  debugModules: string[];
  suitePath?: string;
  suiteType?: string;
  runType?: RunType;
  origin?: string;
  worker?: string;
  tags?: string[];
  environment?: string;
}

export interface RequestContextProvider {
  getCurrentContext(): RequestContext | null;
}
