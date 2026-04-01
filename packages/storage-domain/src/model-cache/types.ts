export interface ManifestQuantEntry {
  files?: string[];
  status: string;
  dtype?: string;
  hasExternalData?: boolean;
}

export interface ManifestEntry {
  repo: string;
  files?: string[];
  quants?: Record<string, ManifestQuantEntry>;
  manifestVersion?: number;
  [key: string]: unknown;
}

export interface ChunkInfo {
  path: string;
  totalChunks: number;
  chunkIndex: number;
  totalSize?: number;
  [key: string]: unknown;
}
