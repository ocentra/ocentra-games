import type { AssetEntry } from './asset-entry';

export interface ImageEntry {
  hash: string;
  path: string;
  metaPath: string | null;
  mimeType: string;
  fileSize: number;
  gameId: string | null;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string;
}

export interface FileEntry {
  checksum: string;
  path: string;
  metaPath: string | null;
  mimeType: string;
  fileSize: number;
  gameId: string | null;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string;
}

export interface ScanResponse {
  scanId: string;
  timestamp: string;
  stats: {
    totalAssets: number;
    assetsWithMeta: number;
    assetsNeedingMeta: number;
    imagesWithMeta: number;
    imagesNeedingMeta: number;
  };
  assets: AssetEntry[];
  images: ImageEntry[];
  files: FileEntry[];
  needsMeta: {
    assets: unknown[];
    files: unknown[];
  };
  hasMore: boolean;
  cursor: string | null;
}
