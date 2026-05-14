import {
  initializeAnalyticsCache,
  initializeModelCache,
  __setStorageReadyTrue,
} from '@/bootstrap/storageBootstrapShared';
import {
  initContentSliceCache,
  setNativeContentSliceCacheBackend,
  setPreferNativeContentSliceCache,
} from '@/adapters/assets/ContentSliceCache';
import {
  setNativeRawAssetDocumentCacheBackend,
  setPreferNativeRawAssetDocumentCache,
} from '@/adapters/assets/RawAssetDocumentCache';
import { DesktopAssetCache } from '@/adapters/assets/DesktopAssetCache';
import { createTauriContentSliceCacheBackend } from '@/adapters/assets/TauriContentSliceCacheBackend';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_STORAGE = false;

const logInfo = (message: string, data?: unknown) => {
  log.logInfo(`[storageBootstrapDesktop] ${message}`, getStackTrace(), data, LOG_STORAGE);
};

const logError = (message: string, data?: unknown) => {
  log.logError(`[storageBootstrapDesktop] ${message}`, getStackTrace(), data);
};

export async function bootstrapDesktop(): Promise<void> {
  logInfo('Initializing desktop storage (FileSystem)...');
  try {
    const useNativeDesktopStorage = DesktopAssetCache.isAvailable();
    if (useNativeDesktopStorage) {
      const backend = createTauriContentSliceCacheBackend();
      setNativeContentSliceCacheBackend(backend);
      setPreferNativeContentSliceCache(true);
      setNativeRawAssetDocumentCacheBackend(backend);
      setPreferNativeRawAssetDocumentCache(true);
    }

    await Promise.all([initializeAnalyticsCache(), ...(useNativeDesktopStorage ? [] : [initContentSliceCache()])]);

    const {
      createNodeFileSystemBackend,
      getPathResolver,
    } = await import('@ocentra/storage-domain/backends/node-fs-backend');
    const { FileSystemModelCacheAdapter } = await import(
      '@ocentra/storage-domain/model-cache/FileSystemModelCacheAdapter'
    );
    const basePath =
      (typeof process !== 'undefined' && process.env?.OCENTRA_MODELS_PATH) ||
      getPathResolver().getModelsBasePath();
    const backend = createNodeFileSystemBackend(basePath);
    const modelCache = new FileSystemModelCacheAdapter(backend);
    await initializeModelCache(modelCache);
    __setStorageReadyTrue();
    logInfo('Desktop storage initialized');
  } catch (error) {
    logError('Failed to initialize desktop storage', { error });
    throw error;
  }
}
