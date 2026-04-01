import type { AiDomainLogger, InitLoggerOptions } from '@/types/logger';
import { noopLogger } from '@/logger/noop';

let logger: AiDomainLogger = noopLogger;

export function initLogger(options: InitLoggerOptions): void {
  logger = {
    info: options.info,
    warn: options.warn,
    error: options.error,
    debug: options.debug,
  };
}

export function setLogger(instance: AiDomainLogger): void {
  logger = instance;
}

export function getLogger(): AiDomainLogger {
  return logger;
}

export function resetLogger(): void {
  logger = noopLogger;
}
