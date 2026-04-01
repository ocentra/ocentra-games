import type { InferenceSettings } from '@/types/inference-settings';
import type { QuantStatus } from '@/constants/quant-status';

export interface QuantInfo {
  files: string[];
  status: QuantStatus;
  dtype: string;
  hasExternalData: boolean;
  inferenceSettings?: InferenceSettings;
}

export interface ManifestEntry {
  repo: string;
  quants: Record<string, QuantInfo>;
  task?: string;
  manifestVersion: number;
}

export interface CachedModelInfo {
  modelId: string;
  modelPath: string;
  totalSize: number;
  numChunks: number;
  chunkSize: number;
  downloadDate: string;
  cacheKey: string;
  metadataKey: string;
  chunkKeys: string[];
}

export interface IndexedDBFileEntry {
  url: string;
  blob: Blob;
}
