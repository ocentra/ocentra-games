import type { NativeStorageBackend } from '@ocentra/storage-domain/backends/in-memory-native-backend';
import type { CachedImage, ImageVariant, ProcessingState } from '@ocentra/storage-domain/caches/ImageCacheService';

interface NativeCachedImageRecord {
  contentType: string;
  cachedAt: number;
  size: number;
  path?: string;
}

const KEY_PREFIX = 'image-cache:';
const CHUNK_SIZE = 256 * 1024;

let nativeBackend: NativeStorageBackend | null = null;

function buildPrefix(hash: string, variant: ImageVariant): string {
  return `${KEY_PREFIX}${variant}:${hash}`;
}

function buildMetaKey(hash: string, variant: ImageVariant): string {
  return `${buildPrefix(hash, variant)}:meta`;
}

function buildChunkKey(hash: string, variant: ImageVariant, index: number): string {
  return `${buildPrefix(hash, variant)}:chunk:${index}`;
}

function buildChunkCountKey(hash: string, variant: ImageVariant): string {
  return `${buildPrefix(hash, variant)}:count`;
}

function getDefaultContentType(variant: ImageVariant): string {
  return variant === 'icon' ? 'image/webp' : 'image/png';
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function readChunkedBytes(hash: string, variant: ImageVariant): Promise<Uint8Array | null> {
  if (!nativeBackend) return null;
  const countRaw = await nativeBackend.get(buildChunkCountKey(hash, variant));
  if (countRaw === null) {
    return null;
  }
  const chunkCount = Number(typeof countRaw === 'string' ? countRaw : new TextDecoder().decode(countRaw));
  if (!Number.isFinite(chunkCount) || chunkCount <= 0) {
    return null;
  }

  const chunks: Uint8Array[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = await nativeBackend.get(buildChunkKey(hash, variant, index));
    if (!(chunk instanceof Uint8Array)) {
      return null;
    }
    chunks.push(chunk);
  }
  return concatChunks(chunks);
}

async function writeChunkedBytes(hash: string, variant: ImageVariant, bytes: Uint8Array): Promise<void> {
  if (!nativeBackend) return;
  const chunkCount = Math.max(1, Math.ceil(bytes.byteLength / CHUNK_SIZE));
  const writes: Promise<void>[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, bytes.byteLength);
    writes.push(nativeBackend.set(buildChunkKey(hash, variant, index), bytes.slice(start, end)));
  }
  writes.push(nativeBackend.set(buildChunkCountKey(hash, variant), String(chunkCount)));
  await Promise.all(writes);
}

export function setMobileImageCacheBackend(backend: NativeStorageBackend): void {
  nativeBackend = backend;
}

export const MobileImageCacheAdapter = {
  getCachedImageByHash,
  cacheImage,
  calculateImageHash,
};

async function getCachedImageByHash(
  hash: string,
  variant: ImageVariant = 'full'
): Promise<CachedImage | null> {
  if (!nativeBackend) return null;
  try {
    const metaRaw = await nativeBackend.get(buildMetaKey(hash, variant));
    if (typeof metaRaw !== 'string') {
      return null;
    }
    const meta = JSON.parse(metaRaw) as NativeCachedImageRecord;
    const bytes = await readChunkedBytes(hash, variant);
    if (!bytes) {
      return null;
    }
    const blobPart = bytes as unknown as BlobPart;
    const blob = new Blob([blobPart], { type: meta.contentType || getDefaultContentType(variant) });
    return {
      id: `${hash}:${variant}`,
      variant,
      blob,
      hash,
      cachedAt: meta.cachedAt,
      size: meta.size,
      contentType: meta.contentType || getDefaultContentType(variant),
      processingState: 'processed' as ProcessingState,
      path: meta.path,
    };
  } catch {
    return null;
  }
}

async function cacheImage(
  hash: string,
  blob: Blob,
  variant: ImageVariant,
  _etag?: string,
  contentType?: string,
  _processingState?: ProcessingState,
  path?: string
): Promise<void> {
  if (!nativeBackend) return;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const meta: NativeCachedImageRecord = {
    contentType: contentType || blob.type || getDefaultContentType(variant),
    cachedAt: Date.now(),
    size: blob.size,
    path,
  };
  await writeChunkedBytes(hash, variant, bytes);
  await nativeBackend.set(buildMetaKey(hash, variant), JSON.stringify(meta));
}

async function calculateImageHash(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((value) => value.toString(16).padStart(2, '0')).join('');
}
