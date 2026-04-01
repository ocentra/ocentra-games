import type { InferenceSettings } from './inference';
import type { QuantStatus } from '@/constants/quant-status';

export type { QuantStatus };

export interface ManifestEntry {
  repo: string;
  files?: string[];
  quants?: Record<string, QuantStatus>;
  [key: string]: unknown;
}

export interface ChunkInfo {
  path: string;
  totalChunks: number;
  chunkIndex: number;
  [key: string]: unknown;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GetInferenceSettingsResult {
  max_new_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  do_sample?: boolean;
  repetition_penalty?: number;
  enabled?: Record<string, boolean | undefined>;
}

export type GetInferenceSettings = (
  modelId: string,
  quantPath: string
) => Promise<GetInferenceSettingsResult | null | undefined>;

export interface LocalInferenceLoadConfig {
  modelId: string;
  quantPath?: string;
  dtype?: string;
  useExternalData?: boolean;
  getInferenceSettings?: GetInferenceSettings;
}

export interface ProgressPayload {
  status: string;
  file?: string;
  progress?: number;
  loadId?: string;
  message?: string;
}

export type ProgressCallback = (payload: ProgressPayload) => void;

export interface ModelCacheAdapter {
  getManifestEntry(repo: string): Promise<ManifestEntry | null>;
  addManifestEntry(repo: string, entry: ManifestEntry): Promise<void>;
  addQuantToManifest(repo: string, quantPath: string, status: QuantStatus): Promise<void>;
  getChunkInfo(repo: string, path: string): Promise<ChunkInfo | null>;
  saveChunkedFileSafe(
    repo: string,
    path: string,
    blob: Blob,
    onUpdate?: () => void
  ): Promise<void>;
  getFromIndexedDB(repo: string, path: string): Promise<ArrayBuffer | null>;
  extractDtypeFromPath(filePath: string): string;
}

export interface InferenceRuntimeAdapter {
  load(
    config: LocalInferenceLoadConfig,
    progress?: ProgressCallback
  ): Promise<void>;
  generate(
    messages: ChatMessage[],
    settings: InferenceSettings,
    stopSignal?: AbortSignal
  ): Promise<string>;
  stop(): void;
  isLoaded(): boolean;
  reset(): void;
}

import type { FetchAdapter } from './adapters';

export interface BrowserLocalAdapters {
  fetch: FetchAdapter;
  inference: InferenceRuntimeAdapter;
  getInferenceSettings?: GetInferenceSettings;
  getManifestEntry: (repo: string) => Promise<ManifestEntry | null>;
}
