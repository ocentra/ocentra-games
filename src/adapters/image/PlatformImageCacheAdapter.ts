import { getPlatformRuntime, PlatformRuntime } from '@ocentra/app-core/platform';
import {
  ImageCache,
  type CachedImage,
  type ImageVariant,
  type ProcessingState,
} from '@ocentra/storage-domain/caches/ImageCacheService';
import { DesktopAssetCache } from '@/adapters/assets/DesktopAssetCache';

export type PlatformImageCacheMode = 'indexeddb' | 'desktop-native' | 'mobile-native';

interface ImageCacheAdapterLike {
  getCachedImageByHash(hash: string, variant?: ImageVariant): Promise<CachedImage | null>;
  cacheImage(
    hash: string,
    blob: Blob,
    variant: ImageVariant,
    etag?: string,
    contentType?: string,
    processingState?: ProcessingState,
    path?: string
  ): Promise<void>;
  calculateImageHash(blob: Blob): Promise<string>;
}

function createLazyAdapter(loader: () => Promise<ImageCacheAdapterLike>): ImageCacheAdapterLike {
  let adapter: ImageCacheAdapterLike | null = null;
  let loadPromise: Promise<ImageCacheAdapterLike> | null = null;
  const getAdapter = async (): Promise<ImageCacheAdapterLike> => {
    if (adapter) return adapter;
    if (!loadPromise) loadPromise = loader();
    adapter = await loadPromise;
    return adapter;
  };
  return {
    getCachedImageByHash: (hash, variant) =>
      getAdapter().then((a) => a.getCachedImageByHash(hash, variant)),
    cacheImage: (hash, blob, variant, etag, contentType, processingState, path) =>
      getAdapter().then((a) =>
        a.cacheImage(hash, blob, variant, etag, contentType, processingState, path)
      ),
    calculateImageHash: (blob) => getAdapter().then((a) => a.calculateImageHash(blob)),
  };
}

export function getPlatformImageCacheAdapter(): ImageCacheAdapterLike {
  const runtime = getPlatformRuntime();
  if (DesktopAssetCache.isAvailable()) {
    return createLazyAdapter(async () => {
      const { TauriImageCacheAdapter } = await import('@/adapters/image/TauriImageCacheAdapter');
      return TauriImageCacheAdapter;
    });
  }
  if (runtime === PlatformRuntime.Mobile) {
    return createLazyAdapter(async () => {
      const { MobileImageCacheAdapter } = await import('@/adapters/image/MobileImageCacheAdapter');
      return MobileImageCacheAdapter;
    });
  }
  return ImageCache.getInstance();
}

export function getPlatformImageCacheMode(): PlatformImageCacheMode {
  const runtime = getPlatformRuntime();
  if (DesktopAssetCache.isAvailable()) {
    return 'desktop-native';
  }
  if (runtime === PlatformRuntime.Mobile) {
    return 'mobile-native';
  }
  return 'indexeddb';
}
