import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import type { BatchConfig } from '@ocentra/logging-domain/types/batchConfig';
import type { InitPhaseConfig } from '@ocentra/logging-domain/types/initPhaseConfig';

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
