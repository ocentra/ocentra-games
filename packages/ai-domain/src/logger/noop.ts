import type { AiDomainLogger } from '@/types/logger';

const noop = (_message: string, _data?: unknown): void => {};

export const noopLogger: AiDomainLogger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
};
