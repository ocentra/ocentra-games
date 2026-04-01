import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
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

log.register(import.meta.url);

const LOG_UI = false;
const LOG_RENDER = false;
const LOG_ERROR = false;

export function useMainAppLogger() {
  return {
    logRender: (data: unknown) => {
      if (LOG_RENDER) {
        logInfo('Component render:', data, LOG_RENDER);
      }
    },
    
    logUI: (message: string, data?: unknown) => {
      if (LOG_UI) {
        logInfo(message, data, LOG_UI);
      }
    },
    
    logError: (message: string, error?: unknown) => {
      if (LOG_ERROR) {
        logError(message, error, LOG_ERROR);
      }
    },
  };
}

