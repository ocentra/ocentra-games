import type { FileSystemBackend } from '@/model-cache/FileSystemBackend';
import type { ModelCacheAdapter } from '@/model-cache/ModelCacheAdapter';
import type { ManifestEntry, ChunkInfo } from '@/model-cache/types';
import {
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
const MANIFEST_DIR = 'manifest';
const FILES_DIR = 'files';
const INFERENCE_DIR = 'inference';
const MAX_SCAN_ENTRIES = 10_000;

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

function base64UrlEncode(key: string): string {
  const bytes = new TextEncoder().encode(key);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(safe: string): string {
  const base64 = safe.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '===='.slice(0, 4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function sanitizeKey(key: string): string {
  return base64UrlEncode(key);
}

function unsanitizeKey(safe: string): string {
  return base64UrlDecode(safe);
}

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

export class FileSystemModelCacheAdapter implements ModelCacheAdapter {
  constructor(private readonly backend: FileSystemBackend) {}

  private manifestPath(repo: string): string {
    return `${MANIFEST_DIR}/${sanitizeKey(repo)}.json`;
  }

  private filePath(key: string): string {
    return `${FILES_DIR}/${sanitizeKey(key)}`;
  }

  private inferencePath(id: string): string {
    return `${INFERENCE_DIR}/${sanitizeKey(id)}.json`;
  }

  private async ensureDirs(): Promise<void> {
    await this.backend.mkdir(MANIFEST_DIR, { recursive: true });
    await this.backend.mkdir(FILES_DIR, { recursive: true });
    await this.backend.mkdir(INFERENCE_DIR, { recursive: true });
  }

  async getManifestEntry(repo: string): Promise<ManifestEntry | null> {
    const p = this.manifestPath(repo);
    if (!(await this.backend.exists(p))) return null;
    const buf = await this.backend.readFile(p);
    return JSON.parse(new TextDecoder().decode(buf)) as ManifestEntry;
  }

  async getAllManifestEntries(): Promise<ManifestEntry[]> {
    await this.ensureDirs();
    const entries: ManifestEntry[] = [];
    if (!(await this.backend.exists(MANIFEST_DIR))) return entries;
    const files = (await this.backend.readdir(MANIFEST_DIR)).slice(
      0,
      MAX_SCAN_ENTRIES
    );
    for (const f of files) {
      if (f.endsWith('.json')) {
        const repo = unsanitizeKey(f.replace(/\.json$/, ''));
        const entry = await this.getManifestEntry(repo);
        if (entry) entries.push(entry);
      }
    }
    return entries;
  }

  async deleteManifestEntry(repo: string): Promise<void> {
    const p = this.manifestPath(repo);
    if (await this.backend.exists(p)) await this.backend.unlink(p);
  }

  async addManifestEntry(repo: string, entry: ManifestEntry): Promise<void> {
    if (!entry || typeof entry !== 'object' || entry.repo !== repo) {
      throw new Error(
        `[addManifestEntry] Invalid entry: must be an object with repo === ${repo}`
      );
    }
    await this.ensureDirs();
    const toSave: ManifestEntry & { manifestVersion: number } = {
      ...entry,
      manifestVersion: entry.manifestVersion ?? CURRENT_MANIFEST_VERSION,
    };
    const p = this.manifestPath(repo);
    await this.backend.writeFile(p, JSON.stringify(toSave, null, 0));
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
    const p = this.filePath(manifestKey);
    if (!(await this.backend.exists(p))) return null;
    const buf = await this.backend.readFile(p);
    const obj = JSON.parse(new TextDecoder().decode(buf)) as {
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
    await this.ensureDirs();
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
    const manifestKey = `${repo}/${fileName}:manifest`;
    await this.backend.writeFile(
      this.filePath(manifestKey),
      JSON.stringify(manifest, null, 0)
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
            await this.backend.writeFile(
              this.filePath(chunkKey),
              finalChunk
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
        await this.backend.writeFile(
          this.filePath(chunkKey),
          finalChunk
        );
        onUpdate?.();
      }
      manifest.status = 'present';
      await this.backend.writeFile(
        this.filePath(manifestKey),
        JSON.stringify(manifest, null, 0)
      );
    } finally {
      reader.releaseLock();
    }
  }

  async getFromIndexedDB(repo: string, path: string): Promise<ArrayBuffer | null> {
    const url = buildCacheUrl(repo, path);
    const p = this.filePath(url);
    if (!(await this.backend.exists(p))) return null;
    const buf = await this.backend.readFile(p);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }

  async getByKey(key: string): Promise<ArrayBuffer | null> {
    const p = this.filePath(key);
    if (!(await this.backend.exists(p))) return null;
    const buf = await this.backend.readFile(p);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }

  async getBlobByKey(key: string): Promise<Blob | null> {
    const buf = await this.getByKey(key);
    return buf ? new Blob([buf]) : null;
  }

  async saveBlobByKey(key: string, blob: Blob): Promise<void> {
    await this.ensureDirs();
    const buf = new Uint8Array(await blob.arrayBuffer());
    await this.backend.writeFile(this.filePath(key), buf);
  }

  async deleteBlobByKey(key: string): Promise<void> {
    const p = this.filePath(key);
    if (await this.backend.exists(p)) await this.backend.unlink(p);
  }

  async getAllFileEntries(): Promise<Array<{ url: string; size: number }>> {
    await this.ensureDirs();
    const entries: Array<{ url: string; size: number }> = [];
    if (!(await this.backend.exists(FILES_DIR))) return entries;
    const files = (await this.backend.readdir(FILES_DIR)).slice(
      0,
      MAX_SCAN_ENTRIES
    );
    for (const f of files) {
      try {
        const key = unsanitizeKey(f);
        const p = `${FILES_DIR}/${f}`;
        const buf = await this.backend.readFile(p);
        entries.push({ url: key, size: buf.length });
      } catch {
        // skip invalid entries
      }
    }
    return entries;
  }

  async getInferenceSettings(id: string): Promise<Record<string, unknown> | null> {
    const p = this.inferencePath(id);
    if (!(await this.backend.exists(p))) return null;
    const buf = await this.backend.readFile(p);
    const obj = JSON.parse(new TextDecoder().decode(buf)) as Record<string, unknown> & { id?: string };
    const { id: _id, ...settings } = obj;
    return settings;
  }

  async saveInferenceSettings(id: string, settings: Record<string, unknown>): Promise<void> {
    await this.ensureDirs();
    await this.backend.writeFile(
      this.inferencePath(id),
      JSON.stringify({ id, ...settings }, null, 0)
    );
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
            headers.set(
              'Content-Type',
              url.endsWith('.json') ? CONTENT_TYPE_JSON : CONTENT_TYPE_OCTET_STREAM
            );
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
          headers.set(
            'Content-Type',
            url.endsWith('.json') ? CONTENT_TYPE_JSON : CONTENT_TYPE_OCTET_STREAM
          );
          headers.set('Content-Length', combined.byteLength.toString());
          return new Response(combined.buffer, { headers });
        }
      }

      const blob = await this.getBlobByKey(url);
      if (blob) {
        const headers = new Headers();
        if (blob.type) headers.set('Content-Type', blob.type);
        else if (url.endsWith('.json'))
          headers.set('Content-Type', CONTENT_TYPE_JSON);
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
