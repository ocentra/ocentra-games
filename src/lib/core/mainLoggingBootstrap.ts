import { Buffer } from 'buffer';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { initLogging } from '@/lib/logging/init';

export type LogInfo = (
  message: string,
  dataOrEnabled?: unknown | boolean,
  enabled?: boolean
) => void;
export type LogError = (
  message: string,
  dataOrEnabled?: unknown | boolean,
  enabled?: boolean
) => void;

export function initMainLogging(moduleUrl: string): { logInfo: LogInfo; logError: LogError } {
  initLogging();

  if (!(globalThis as unknown as { Buffer?: unknown }).Buffer) {
    (globalThis as unknown as { Buffer?: unknown }).Buffer = Buffer;
  }
  if (typeof window !== 'undefined' && !(window as unknown as { Buffer?: unknown }).Buffer) {
    (window as unknown as { Buffer?: unknown }).Buffer = Buffer;
  }

  const log = MainAppLogger.instance;
  log.register(moduleUrl);

  const logInfo: LogInfo = (message, dataOrEnabled?, enabled?) => {
    if (typeof dataOrEnabled === 'boolean') {
      log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
    } else {
      log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
    }
  };
  const logError: LogError = (message, dataOrEnabled?, enabled?) => {
    if (typeof dataOrEnabled === 'boolean') {
      log.logError(message, getStackTrace(), undefined, dataOrEnabled);
    } else {
      log.logError(message, getStackTrace(), dataOrEnabled, enabled);
    }
  };

  return { logInfo, logError };
}
