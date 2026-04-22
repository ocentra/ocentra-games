import type { BatchConfig } from '@ocentra/logging-domain/types/batchConfig';
import type { BatchEntry } from '@ocentra/logging-domain/types/batchEntry';

export interface BatchContext {
  key: string;
  config: BatchConfig;
  entries: BatchEntry[];
  flushTimeout: ReturnType<typeof setTimeout> | null;
}
