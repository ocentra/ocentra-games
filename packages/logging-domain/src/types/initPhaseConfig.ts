export interface InitPhaseConfig {
  enabled?: boolean;
  logInitializationInfo?: boolean;
  logInitializationWarn?: boolean;
  logInitializationError?: boolean;
  logInitializationDebug?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

export interface InitPhaseOptions {
  executionOrderThreshold?: number;
  expectedServices?: Array<{ name: string; executionOrder: number }>;
}
