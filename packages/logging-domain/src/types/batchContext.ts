import type { BatchConfig } from '@/types/batchConfig';
import type { BatchEntry } from '@/types/batchEntry';

export interface BatchContext {
  key: string;
  config: BatchConfig;
  entries: BatchEntry[];
  flushTimeout: ReturnType<typeof setTimeout> | null;
}
