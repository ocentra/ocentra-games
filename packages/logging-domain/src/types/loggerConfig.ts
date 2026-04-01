import type { LogLevel } from '@/types/logLevel';
import type { BatchConfig } from '@/types/batchConfig';
import type { InitPhaseConfig } from '@/types/initPhaseConfig';

export interface LoggerConfig {
  consoleEnabled?: boolean;
  minLogLevel?: LogLevel;
  maxRegistrations?: number;
  includeTimestamps?: boolean;
  batchConfig?: Partial<BatchConfig>;
  initPhaseConfig?: Partial<InitPhaseConfig>;
  bridgeEndpoint?: string;
  bridgeConsumer?: string;
}
