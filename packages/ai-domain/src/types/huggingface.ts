export interface HuggingFaceSibling {
  rfilename: string;
  size?: number;
  skip?: boolean;
  [key: string]: unknown;
}

export interface HuggingFaceModelMetadata {
  siblings?: HuggingFaceSibling[];
  pipeline_tag?: string;
  [key: string]: unknown;
}

export interface HuggingFaceTreeFile {
  path?: string;
  [key: string]: unknown;
}

export interface NeededFileEntry {
  id: string;
  type: 'manifest';
  chunkGroupId: string;
  fileName: string;
  folder: string;
  fileType?: string;
  size: number;
  totalChunks: number;
  chunkSizeUsed: number;
  status: string;
  addedAt: number;
}

export interface HuggingFaceRepoInfo {
  siblings: HuggingFaceSibling[];
  task: string;
  pipeline_tag?: string;
}

export interface QuantEntry {
  path: string;
  dtype: string;
}

import type { QuantStatus } from '@/constants/quant-status';

export type { QuantStatus };

export interface QuantInfo {
  files: string[];
  status?: QuantStatus;
  dtype: string;
  hasExternalData: boolean;
  fileSizes?: Record<string, number>;
}

export interface ModelManifestEntry {
  repo: string;
  quants: Record<string, QuantInfo>;
  task: string;
  manifestVersion: number;
}
