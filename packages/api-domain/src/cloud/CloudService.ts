import type { ScanResponse } from '@ocentra/network-domain/router-types';
import type { AssetMetadata } from '@ocentra/boundary-domain/types/asset-metadata';

export interface CloudServiceConfig {
  workerUrl: string;
  bucketName: string;
  enabled: boolean;
}

export interface CloudService {
  getAsset(guid: string, options?: { type?: 'asset' | 'meta' }): Promise<ArrayBuffer>;
  getAssetByType(assetType: string): Promise<ArrayBuffer>;
  getImage(hash: string, options?: { type?: 'image' | 'meta' }): Promise<ArrayBuffer>;
  getFile(checksum: string): Promise<ArrayBuffer>;
  getAssetInfo(guid: string): Promise<AssetMetadata>;
  getImageInfo(hash: string): Promise<ImageMetadata>;
  uploadAsset(guid: string, content: ArrayBuffer | Blob | string, metadata: AssetMetadata): Promise<string>;
  uploadImage(hash: string, imageData: ArrayBuffer | Blob, metadata: ImageMetadata): Promise<string>;
  uploadFile(checksum: string, fileData: ArrayBuffer | Blob, metadata: FileMetadata): Promise<string>;
  batchGetAssets(guids: string[]): Promise<Map<string, ArrayBuffer>>;
  scanAssets(options?: ScanOptions): Promise<ScanResponse>;
  deleteAsset(guid: string): Promise<void>;
  deleteImage(hash: string): Promise<void>;
  deleteFile(checksum: string): Promise<void>;
  ping(): Promise<boolean>;
}

export type { AssetMetadata };

export interface ImageMetadata {
  hash: string;
  gameId?: string | null;
  category?: string | null;
  mimeType?: string;
  fileSize?: number;
}

export interface FileMetadata {
  fileName: string;
  checksum: string;
  gameId?: string | null;
  category?: string | null;
  mimeType?: string;
  fileSize?: number;
}

export interface ScanOptions {
  incremental?: boolean;
  since?: string;
  gameId?: string;
  createMeta?: boolean;
  limit?: number;
  cursor?: string;
}
