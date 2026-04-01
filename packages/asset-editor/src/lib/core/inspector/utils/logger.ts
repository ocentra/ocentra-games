import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

export function createInspectorLogger(_moduleName: string) {
  const log = AssetEditorLogger.instance;
  log.register(import.meta.url);

  const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
    if (typeof dataOrEnabled === 'boolean') {
      log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
    } else {
      log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
    }
  };

  const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
    if (typeof dataOrEnabled === 'boolean') {
      log.logError(message, getStackTrace(), undefined, dataOrEnabled);
    } else {
      log.logError(message, getStackTrace(), dataOrEnabled, enabled);
    }
  };

  const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
    if (typeof dataOrEnabled === 'boolean') {
      log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
    } else {
      log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
    }
  };

  return { logInfo, logError, logWarn };
}

