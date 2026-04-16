import {
  warmUpIndexedDB,
  initializeImageCache,
  initializeAnalyticsCache,
  bootstrapModelCacheWithIDB,
  __setStorageReadyTrue,
} from '@/bootstrap/storageBootstrapShared';
import { initContentSliceCache } from '@/adapters/assets/ContentSliceCache';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const pushBoot = (label: string) => (globalThis as { __OCENTRA_BOOT_PUSH?: (l: string) => void }).__OCENTRA_BOOT_PUSH?.(label);

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_STORAGE = false;

const logInfo = (message: string, data?: unknown) => {
  log.logInfo(`[storageBootstrapWeb] ${message}`, getStackTrace(), data, LOG_STORAGE);
};

const logError = (message: string, data?: unknown) => {
  log.logError(`[storageBootstrapWeb] ${message}`, getStackTrace(), data);
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => {
      MainAppLogger.instance.logWarn(`[storageBootstrapWeb] ${name} timed out after ${timeoutMs}ms`, getStackTrace());
      resolve(null);
    }, timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

export async function bootstrapWeb(): Promise<void> {
  pushBoot('storageBootstrapWeb: start');
  logInfo('Initializing web storage (IndexedDB)...');
  try {
    await withTimeout(warmUpIndexedDB(), 3000, 'warmUpIndexedDB');
    pushBoot('storageBootstrapWeb: warmUpIndexedDB done');
    
    pushBoot('storageBootstrapWeb: initImageCache start');
    await withTimeout(initializeImageCache(), 3000, 'initializeImageCache');
    pushBoot('storageBootstrapWeb: initImageCache done');

    pushBoot('storageBootstrapWeb: initAnalyticsCache start');
    await withTimeout(initializeAnalyticsCache(), 3000, 'initializeAnalyticsCache');
    pushBoot('storageBootstrapWeb: initAnalyticsCache done');

    pushBoot('storageBootstrapWeb: bootstrapModelCache start');
    await withTimeout(bootstrapModelCacheWithIDB(), 3000, 'bootstrapModelCache');
    pushBoot('storageBootstrapWeb: bootstrapModelCache done');

    pushBoot('storageBootstrapWeb: initContentSliceCache start');
    await withTimeout(initContentSliceCache(), 3000, 'initContentSliceCache');
    pushBoot('storageBootstrapWeb: initContentSliceCache done');

    pushBoot('storageBootstrapWeb: caches done');
    __setStorageReadyTrue();
    logInfo('Web storage initialized');
  } catch (error) {
    logError('Failed to initialize web storage', { error });
    throw error;
  }
}
