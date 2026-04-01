export const QUANT_STATUS = {
  AVAILABLE: 'available',
  DOWNLOADED: 'downloaded',
  FAILED: 'failed',
  NOT_FOUND: 'not_found',
  UNAVAILABLE: 'unavailable',
  UNSUPPORTED: 'unsupported',
  SERVER_ONLY: 'server_only',
} as const;

export type QuantStatus = (typeof QUANT_STATUS)[keyof typeof QUANT_STATUS];
