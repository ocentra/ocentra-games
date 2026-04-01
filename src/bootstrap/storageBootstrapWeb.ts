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

export async function bootstrapWeb(): Promise<void> {
  pushBoot('storageBootstrapWeb: start');
  logInfo('Initializing web storage (IndexedDB)...');
  try {
    await warmUpIndexedDB();
    pushBoot('storageBootstrapWeb: warmUpIndexedDB done');
    await Promise.all([
      initializeImageCache(),
      initializeAnalyticsCache(),
      bootstrapModelCacheWithIDB(),
      initContentSliceCache(),
    ]);
    pushBoot('storageBootstrapWeb: caches done');
    __setStorageReadyTrue();
    logInfo('Web storage initialized');
  } catch (error) {
    logError('Failed to initialize web storage', { error });
    throw error;
  }
}
