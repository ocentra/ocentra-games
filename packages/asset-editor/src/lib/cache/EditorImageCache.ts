import { TauriImageCacheAdapter } from '@/adapters/image/TauriImageCacheAdapter';
import { ImageVariant, type CachedImage, type ProcessingState } from './editorImageTypes';

export const EditorImageCache = {
  getInstance(): EditorImageCacheInstance {
    if (!EditorImageCache._instance) {
      EditorImageCache._instance = new EditorImageCacheInstance();
    }
    return EditorImageCache._instance;
  },
  _instance: null as EditorImageCacheInstance | null,
};

class EditorImageCacheInstance {
  getCachedImageByHash(
    hash: string,
    variant: ImageVariant = ImageVariant.Full
  ): Promise<CachedImage | null> {
    return TauriImageCacheAdapter.getCachedImageByHash(hash, variant);
  }

  cacheImage(
    hash: string,
    blob: Blob,
    variant: ImageVariant,
    _etag?: string,
    _contentType?: string,
    _processingState?: ProcessingState,
    _path?: string
  ): Promise<void> {
    return TauriImageCacheAdapter.cacheImage(
      hash,
      blob,
      variant,
      _etag,
      _contentType,
      _processingState,
      _path
    );
  }

  calculateImageHash(blob: Blob): Promise<string> {
    return TauriImageCacheAdapter.calculateImageHash(blob);
  }
}
