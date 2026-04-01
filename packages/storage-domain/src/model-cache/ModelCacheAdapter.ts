import type { ManifestEntry, ChunkInfo } from './types';

/**
 * Model cache adapter for manifest, chunks, blobs, and inference settings.
 *
 * Required methods (fail-fast at setup):
 * - getManifestEntry, addManifestEntry, addQuantToManifest
 * - getChunkInfo, saveChunkedFileSafe, getFromIndexedDB
 * - extractDtypeFromPath
 *
 * Optional methods (graceful fallback when absent):
 * - getAllManifestEntries, deleteManifestEntry
 * - getByKey, getBlobByKey, saveBlobByKey, deleteBlobByKey
 * - getAllFileEntries, getInferenceSettings, saveInferenceSettings
 * - tryServeFromCache
 *
 * @see setupStorageDomainEventHandlers – validates required methods at registration
 */
export interface ModelCacheAdapter {
  getManifestEntry(repo: string): Promise<ManifestEntry | null>;
  getAllManifestEntries?(): Promise<ManifestEntry[]>;
  addManifestEntry(repo: string, entry: ManifestEntry): Promise<void>;
  deleteManifestEntry?(repo: string): Promise<void>;
  addQuantToManifest(
    repo: string,
    quantPath: string,
    status: string,
    files?: string[]
  ): Promise<void>;
  getChunkInfo(repo: string, path: string): Promise<ChunkInfo | null>;
  saveChunkedFileSafe(
    repo: string,
    path: string,
    blob: Blob,
    onUpdate?: () => void
  ): Promise<void>;
  getFromIndexedDB(repo: string, path: string): Promise<ArrayBuffer | null>;
  getByKey?(key: string): Promise<ArrayBuffer | null>;
  getBlobByKey?(key: string): Promise<Blob | null>;
  saveBlobByKey?(key: string, blob: Blob): Promise<void>;
  deleteBlobByKey?(key: string): Promise<void>;
  getAllFileEntries?(): Promise<Array<{ url: string; size: number }>>;
  getInferenceSettings?(id: string): Promise<Record<string, unknown> | null>;
  saveInferenceSettings?(id: string, settings: Record<string, unknown>): Promise<void>;
  extractDtypeFromPath(filePath: string): string;
  tryServeFromCache?(url: string, modelId: string): Promise<Response | null>;
}
