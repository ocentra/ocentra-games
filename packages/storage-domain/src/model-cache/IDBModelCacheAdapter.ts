import type { IndexedDBService } from '@/core/IndexedDBService';
import type { ModelCacheAdapter } from '@/model-cache/ModelCacheAdapter';
import type { ManifestEntry, ChunkInfo } from '@/model-cache/types';
import {
  MODEL_STORE_NAMES,
  CHUNK_SIZE,
  buildCacheUrl,
  extractDtypeFromPath,
  CURRENT_MANIFEST_VERSION,
} from '@/model-cache/model-store-config';
import {
  CHUNK_INTEGRITY_VERSION,
  computeChunkChecksum,
  parseChecksums,
  verifyChunkChecksum,
} from '@/model-cache/chunk-integrity';

const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_OCTET_STREAM = 'application/octet-stream';

function extractCleanDtype(filePath: string): string {
  const nameWithoutExt = filePath.replace(/\.onnx$/i, '');
  if (nameWithoutExt.includes('q4f16')) return 'q4f16';
  if (nameWithoutExt.includes('uint8')) return 'uint8';
  if (nameWithoutExt.includes('int8')) return 'int8';
  if (nameWithoutExt.includes('bnb4')) return 'bnb4';
  if (nameWithoutExt.includes('q4')) return 'q4';
  if (nameWithoutExt.includes('q8')) return 'q8';
  if (nameWithoutExt.includes('fp16')) return 'fp16';
  if (nameWithoutExt.includes('fp32')) return 'fp32';
  return extractDtypeFromPath(filePath) || 'fp32';
}

interface IndexedDBFileEntry {
  url: string;
  blob: Blob;
}

interface ChunkGroupManifest {
  id: string;
  type: 'manifest';
  chunkGroupId: string;
  fileName: string;
  totalChunks: number;
  chunkSizeUsed: number;
  size: number;
  status: 'writing' | 'present' | 'corrupt';
  integrityVersion: number;
  checksums: string[];
}

export class IDBModelCacheAdapter implements ModelCacheAdapter {
  constructor(private readonly service: IndexedDBService) {}

  async getManifestEntry(repo: string): Promise<ManifestEntry | null> {
    const entry = await this.service.get<ManifestEntry>(
      MODEL_STORE_NAMES.MANIFEST,
      repo
    );
    return entry ?? null;
  }

  async getAllManifestEntries(): Promise<ManifestEntry[]> {
    return await this.service.getAll<ManifestEntry>(MODEL_STORE_NAMES.MANIFEST);
  }

  async deleteManifestEntry(repo: string): Promise<void> {
    await this.service.delete(MODEL_STORE_NAMES.MANIFEST, repo);
  }

  async addManifestEntry(repo: string, entry: ManifestEntry): Promise<void> {
    if (!entry || typeof entry !== 'object' || entry.repo !== repo) {
      throw new Error(
        `[addManifestEntry] Invalid entry: must be an object with repo === ${repo}`
      );
    }
    const toSave: ManifestEntry & { manifestVersion: number } = {
      ...entry,
      manifestVersion: entry.manifestVersion ?? CURRENT_MANIFEST_VERSION,
    };
    if (toSave.manifestVersion !== CURRENT_MANIFEST_VERSION) {
      toSave.manifestVersion = CURRENT_MANIFEST_VERSION;
    }
    await this.service.set<ManifestEntry & { manifestVersion: number }>(
      MODEL_STORE_NAMES.MANIFEST,
      toSave
    );
  }

  async addQuantToManifest(
    repo: string,
    quantPath: string,
    status: string,
    files?: string[]
  ): Promise<void> {
    let manifest = await this.getManifestEntry(repo);
    if (!manifest) {
      manifest = {
        repo,
        quants: {},
        manifestVersion: CURRENT_MANIFEST_VERSION,
      } as ManifestEntry & { manifestVersion: number };
    }
    const quants: Record<
      string,
      { files?: string[]; status: string; dtype?: string; hasExternalData?: boolean }
    > = (manifest.quants ??= {});
    if (!quants[quantPath]) {
      quants[quantPath] = {
        files: files?.length ? files : [quantPath],
        status,
        dtype: extractCleanDtype(quantPath),
        hasExternalData: false,
      };
    } else {
      quants[quantPath].status = status;
      if (files?.length) quants[quantPath].files = files;
      if (!quants[quantPath].dtype) {
        quants[quantPath].dtype = extractCleanDtype(quantPath);
      }
      if (quants[quantPath].hasExternalData === undefined) {
        quants[quantPath].hasExternalData = false;
      }
    }
    (manifest as { manifestVersion?: number }).manifestVersion ??=
      CURRENT_MANIFEST_VERSION;
    await this.addManifestEntry(repo, manifest);
  }

  async getChunkInfo(repo: string, path: string): Promise<ChunkInfo | null> {
    const manifestKey = `${repo}/${path}:manifest`;
    const manifestBlob = await this.service.get<IndexedDBFileEntry>(
      MODEL_STORE_NAMES.FILES,
      manifestKey
    );
    if (!manifestBlob?.blob) return null;
    const text = await manifestBlob.blob.text();
    const obj = JSON.parse(text) as {
      type?: string;
      totalChunks?: number;
      size?: number;
      checksums?: unknown;
      status?: string;
    };
    if (obj.type === 'manifest' && (obj.totalChunks ?? 0) > 0) {
      const checksums = parseChecksums(obj.checksums);
      if (obj.status === 'corrupt') {
        return null;
      }
      return {
        path,
        totalChunks: obj.totalChunks!,
        chunkIndex: 0,
        totalSize: obj.size,
        checksums: checksums ?? undefined,
      };
    }
    return null;
  }

  async saveChunkedFileSafe(
    repo: string,
    path: string,
    blob: Blob,
    onUpdate?: () => void
  ): Promise<void> {
    const url = buildCacheUrl(repo, path);
    const urlParts = url.split('/');
    const fileName = urlParts.slice(urlParts.indexOf('main') + 1).join('/');
    if (!repo) throw new Error('No model ID available for chunked storage');
    const fileSize = blob.size;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    const manifest: ChunkGroupManifest = {
      id: `${repo}/${fileName}:manifest`,
      type: 'manifest',
      chunkGroupId: `${repo}/${fileName}`,
      fileName,
      totalChunks,
      chunkSizeUsed: CHUNK_SIZE,
      size: fileSize,
      status: 'writing',
      integrityVersion: CHUNK_INTEGRITY_VERSION,
      checksums: [],
    };
    await this.service.set<IndexedDBFileEntry>(
      MODEL_STORE_NAMES.FILES,
      {
        url: `${repo}/${fileName}:manifest`,
        blob: new Blob([JSON.stringify(manifest)], {
          type: CONTENT_TYPE_JSON,
        }),
      }
    );
    const stream = blob.stream();
    const reader = stream.getReader();
    let chunkIndex = 0;
    const currentChunkBuffer = new Uint8Array(CHUNK_SIZE);
    let currentChunkOffset = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkData = new Uint8Array(value);
        let dataOffset = 0;
        while (dataOffset < chunkData.length) {
          const remainingInChunk = CHUNK_SIZE - currentChunkOffset;
          const remainingInData = chunkData.length - dataOffset;
          const bytesToCopy = Math.min(remainingInChunk, remainingInData);
          currentChunkBuffer.set(
            chunkData.slice(dataOffset, dataOffset + bytesToCopy),
            currentChunkOffset
          );
          currentChunkOffset += bytesToCopy;
          dataOffset += bytesToCopy;
          if (currentChunkOffset === CHUNK_SIZE) {
            const chunkKey = `${repo}/${fileName}_chunk_${chunkIndex}`;
            const finalChunk = currentChunkBuffer.slice(0, currentChunkOffset);
            manifest.checksums.push(await computeChunkChecksum(finalChunk));
            await this.service.set<IndexedDBFileEntry>(
              MODEL_STORE_NAMES.FILES,
              {
                url: chunkKey,
                blob: new Blob([finalChunk], { type: CONTENT_TYPE_OCTET_STREAM }),
              }
            );
            chunkIndex++;
            currentChunkOffset = 0;
            onUpdate?.();
          }
        }
      }
      if (currentChunkOffset > 0) {
        const chunkKey = `${repo}/${fileName}_chunk_${chunkIndex}`;
        const finalChunk = currentChunkBuffer.slice(0, currentChunkOffset);
        manifest.checksums.push(await computeChunkChecksum(finalChunk));
        await this.service.set<IndexedDBFileEntry>(MODEL_STORE_NAMES.FILES, {
          url: chunkKey,
          blob: new Blob([finalChunk], { type: CONTENT_TYPE_OCTET_STREAM }),
        });
        onUpdate?.();
      }
      manifest.status = 'present';
      await this.service.set<IndexedDBFileEntry>(
        MODEL_STORE_NAMES.FILES,
        {
          url: `${repo}/${fileName}:manifest`,
          blob: new Blob([JSON.stringify(manifest)], {
            type: CONTENT_TYPE_JSON,
          }),
        }
      );
    } finally {
      reader.releaseLock();
    }
  }

  async getFromIndexedDB(repo: string, path: string): Promise<ArrayBuffer | null> {
    const url = buildCacheUrl(repo, path);
    const entry = await this.service.get<IndexedDBFileEntry>(
      MODEL_STORE_NAMES.FILES,
      url
    );
    if (!entry?.blob) return null;
    return entry.blob.arrayBuffer();
  }

  async saveBlobByKey(key: string, blob: Blob): Promise<void> {
    await this.service.set<IndexedDBFileEntry>(
      MODEL_STORE_NAMES.FILES,
      { url: key, blob }
    );
  }

  async getByKey(key: string): Promise<ArrayBuffer | null> {
    const blob = await this.getBlobByKey(key);
    return blob ? blob.arrayBuffer() : null;
  }

  async getBlobByKey(key: string): Promise<Blob | null> {
    const entry = await this.service.get<IndexedDBFileEntry>(
      MODEL_STORE_NAMES.FILES,
      key
    );
    return entry?.blob ?? null;
  }

  async deleteBlobByKey(key: string): Promise<void> {
    await this.service.delete(MODEL_STORE_NAMES.FILES, key);
  }

  async getAllFileEntries(): Promise<Array<{ url: string; size: number }>> {
    const all = await this.service.getAll<IndexedDBFileEntry>(MODEL_STORE_NAMES.FILES);
    return all.map((e) => ({ url: e.url, size: e.blob?.size ?? 0 }));
  }

  async getInferenceSettings(id: string): Promise<Record<string, unknown> | null> {
    const result = await this.service.get<Record<string, unknown> & { id: string }>(
      MODEL_STORE_NAMES.INFERENCE_SETTINGS,
      id
    );
    if (result) {
      const { id: _id, ...settings } = result;
      return settings;
    }
    return null;
  }

  async saveInferenceSettings(id: string, settings: Record<string, unknown>): Promise<void> {
    await this.service.set(MODEL_STORE_NAMES.INFERENCE_SETTINGS, { id, ...settings });
  }

  extractDtypeFromPath(filePath: string): string {
    return extractCleanDtype(filePath);
  }

  private async purgeCorruptChunkGroup(
    repo: string,
    fileName: string,
    totalChunks: number
  ): Promise<void> {
    try {
      await this.deleteBlobByKey(`${repo}/${fileName}:manifest`);
      for (let i = 0; i < totalChunks; i++) {
        await this.deleteBlobByKey(`${repo}/${fileName}_chunk_${i}`);
      }
    } catch {
      // best effort cleanup
    }
  }

  async tryServeFromCache(url: string, modelId: string): Promise<Response | null> {
    let chunkGroup:
      | {
          repo: string;
          fileName: string;
          totalChunks: number;
        }
      | null = null;
    try {
      const urlParts = url.split('/');
      const mainIdx = urlParts.indexOf('main');
      const fileName = mainIdx >= 0 ? urlParts.slice(mainIdx + 1).join('/') : url;

      if (modelId) {
        const chunkInfo = await this.getChunkInfo(modelId, fileName);
        if (
          chunkInfo?.totalChunks &&
          chunkInfo.totalChunks > 0 &&
          (chunkInfo.totalSize ?? 0) > 0
        ) {
          const totalSize = chunkInfo.totalSize!;
          const totalChunks = chunkInfo.totalChunks;
          const checksums = parseChecksums(
            (chunkInfo as { checksums?: unknown }).checksums
          );
          chunkGroup = { repo: modelId, fileName, totalChunks };
          if (totalSize > 100 * 1024 * 1024) {
            const stream = new ReadableStream({
              start: async (controller) => {
                try {
                  for (let i = 0; i < totalChunks; i++) {
                    const chunkKey = `${modelId}/${fileName}_chunk_${i}`;
                    const blob = await this.getBlobByKey(chunkKey);
                    if (!blob) throw new Error(`Missing chunk ${i}`);
                    const arr = new Uint8Array(await blob.arrayBuffer());
                    if (!(await verifyChunkChecksum(arr, checksums?.[i]))) {
                      throw new Error(`Checksum mismatch for chunk ${i}`);
                    }
                    controller.enqueue(arr);
                  }
                  controller.close();
                } catch (e) {
                  controller.error(e);
                }
              },
            });
            const headers = new Headers();
            headers.set('Content-Type', url.endsWith('.json') ? CONTENT_TYPE_JSON : CONTENT_TYPE_OCTET_STREAM);
            headers.set('Content-Length', totalSize.toString());
            return new Response(stream, { headers });
          }
          const chunks: ArrayBuffer[] = [];
          for (let i = 0; i < totalChunks; i++) {
            const chunkKey = `${modelId}/${fileName}_chunk_${i}`;
            const buf = await this.getByKey(chunkKey);
            if (!buf) throw new Error(`Missing chunk ${i}`);
            const arr = new Uint8Array(buf);
            if (!(await verifyChunkChecksum(arr, checksums?.[i]))) {
              throw new Error(`Checksum mismatch for chunk ${i}`);
            }
            chunks.push(buf);
          }
          const combined = new Uint8Array(totalSize);
          let offset = 0;
          for (const buf of chunks) {
            combined.set(new Uint8Array(buf), offset);
            offset += buf.byteLength;
          }
          const headers = new Headers();
          headers.set('Content-Type', url.endsWith('.json') ? CONTENT_TYPE_JSON : CONTENT_TYPE_OCTET_STREAM);
          headers.set('Content-Length', combined.byteLength.toString());
          return new Response(combined.buffer, { headers });
        }
      }

      const blob = await this.getBlobByKey(url);
      if (blob) {
        const headers = new Headers();
        if (blob.type) headers.set('Content-Type', blob.type);
        else if (url.endsWith('.json')) headers.set('Content-Type', CONTENT_TYPE_JSON);
        else headers.set('Content-Type', CONTENT_TYPE_OCTET_STREAM);
        headers.set('Content-Length', blob.size.toString());
        return new Response(blob, { headers });
      }
      return null;
    } catch {
      if (chunkGroup) {
        await this.purgeCorruptChunkGroup(
          chunkGroup.repo,
          chunkGroup.fileName,
          chunkGroup.totalChunks
        );
      }
      return null;
    }
  }
}
