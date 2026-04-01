import {
  initializeModelCache,
  getMobileBackendFactory,
  __setStorageReadyTrue,
} from '@/bootstrap/storageBootstrapShared';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { NativeModelCacheAdapter } from '@ocentra/storage-domain/model-cache/NativeModelCacheAdapter';
import { createInMemoryNativeBackend } from '@ocentra/storage-domain/backends/in-memory-native-backend';
import { setNativeContentSliceCacheBackend, setPreferNativeContentSliceCache } from '@/adapters/assets/ContentSliceCache';
import { setMobileImageCacheBackend } from '@/adapters/image/MobileImageCacheAdapter';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_STORAGE = false;

const logInfo = (message: string, data?: unknown) => {
  log.logInfo(`[storageBootstrapMobile] ${message}`, getStackTrace(), data, LOG_STORAGE);
};

const logError = (message: string, data?: unknown) => {
  log.logError(`[storageBootstrapMobile] ${message}`, getStackTrace(), data);
};

export async function bootstrapMobile(): Promise<void> {
  logInfo('Initializing mobile storage (Native)...');
  try {
    const factory = getMobileBackendFactory();
    let backend;
    if (factory) {
      backend = await factory();
    } else {
      backend = createInMemoryNativeBackend();
      logInfo('Using in-memory backend (dev only)');
    }

    setNativeContentSliceCacheBackend(backend);
    setPreferNativeContentSliceCache(true);
    setMobileImageCacheBackend(backend);

    const modelCache = new NativeModelCacheAdapter(backend);
    await initializeModelCache(modelCache);
    __setStorageReadyTrue();
    logInfo('Mobile storage initialized');
  } catch (error) {
    logError('Failed to initialize mobile storage', { error });
    throw error;
  }
}
