import type { StorageDomainLogger } from '@/types/logger';

const noop = (_message: string, _data?: unknown): void => {};

export const noopLogger: StorageDomainLogger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
};
