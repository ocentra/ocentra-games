import { invoke } from '@tauri-apps/api/core';
import type { ImageVariant, CachedImage, ProcessingState } from '@/lib/cache/editorImageTypes';

export const TauriImageCacheAdapter = {
  getCachedImageByHash,
  cacheImage,
  calculateImageHash,
};

async function getCachedImageByHash(
  hash: string,
  variant: ImageVariant = 'full'
): Promise<CachedImage | null> {
  try {
    const bytes = await invoke<number[]>('read_cached_image', { hash, variant });
    const contentType = variant === 'icon' ? 'image/webp' : 'image/png';
    const blob = new Blob([new Uint8Array(bytes)], { type: contentType });
    return {
      id: `${hash}:${variant}`,
      variant,
      blob,
      hash,
      cachedAt: Date.now(),
      size: blob.size,
      contentType,
      processingState: 'processed' as ProcessingState,
    };
  } catch {
    return null;
  }
}

export async function cacheImage(
  hash: string,
  blob: Blob,
  variant: ImageVariant,
  _etag?: string,
  _contentType?: string,
  _processingState?: ProcessingState,
  _path?: string
): Promise<void> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await invoke('write_cached_image', {
    hash,
    variant,
    content: Array.from(bytes),
  });
}

export async function calculateImageHash(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
