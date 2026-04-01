import type { StorageDomainLogger, InitLoggerOptions } from '@/types/logger';
import { noopLogger } from '@/logger/noop';

let logger: StorageDomainLogger = noopLogger;

export function initLogger(options: InitLoggerOptions): void {
  logger = {
    info: options.info,
    warn: options.warn,
    error: options.error,
    debug: options.debug,
  };
}

export function setLogger(instance: StorageDomainLogger): void {
  logger = instance;
}

export function getLogger(): StorageDomainLogger {
  return logger;
}

export function resetLogger(): void {
  logger = noopLogger;
}
