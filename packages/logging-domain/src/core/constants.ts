import type { BatchConfig } from '@/types/batchConfig';
import type { InitPhaseConfig } from '@/types/initPhaseConfig';
import type { LoggerConfig } from '@/types/loggerConfig';
import { LogLevel } from '@/types/logLevel';

export const CACHE_SIZE_LIMIT = 500;

export const UNKNOWN_CONTEXT = 'Unknown';
export const UNKNOWN_FILE = 'Unknown';
export const UNKNOWN_MODULE = 'Unknown';

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  enabled: false,
  batchSize: 20,
  flushInterval: 500,
};

export const DEFAULT_INIT_PHASE_CONFIG: Required<InitPhaseConfig> = {
  enabled: false,
  logInitializationInfo: false,
  logInitializationWarn: false,
  logInitializationError: false,
  logInitializationDebug: false,
  batchSize: 100,
  flushInterval: 3000,
};

export const BRIDGE_PORT = 8765 as const;
export const DEFAULT_BRIDGE_URL = `http://127.0.0.1:${BRIDGE_PORT}`;

export const PUBLIC_TUNNEL_BRIDGE_URL = 'https://ocentra-log-bridge.ocentra.ca';

export const DEFAULT_CONFIG: Required<LoggerConfig> = {
  consoleEnabled: false,
  minLogLevel: LogLevel.Debug,
  maxRegistrations: 1000,
  includeTimestamps: false,
  batchConfig: DEFAULT_BATCH_CONFIG,
  initPhaseConfig: DEFAULT_INIT_PHASE_CONFIG,
  bridgeEndpoint: PUBLIC_TUNNEL_BRIDGE_URL,
  bridgeConsumer: '',
};
