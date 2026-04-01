import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getEntryIndexUrl, getStorageConfig } from '@/services/storage/StorageConfig';

export function logStorageConfigAtStartup(pushBoot: (label: string) => void): void {
  const log = MainAppLogger.instance;
  const storageConfig = getStorageConfig();
  log.logInfo(
    'StorageConfig at startup',
    getStackTrace(),
    {
      assetsPublicUrl: storageConfig.assetsPublicUrl || '(empty)',
      entryIndexUrl: getEntryIndexUrl(storageConfig) || '(empty)',
      r2AssetsEnabled: !!storageConfig.r2Assets,
      workerUrl: storageConfig.r2Assets?.workerUrl || '(none)',
    },
    true
  );
  pushBoot('post storageConfig');
}
