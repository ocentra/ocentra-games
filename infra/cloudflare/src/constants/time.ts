export const TimeInMs = {
  Second: 1000,
  Minute: 60 * 1000,
  Hour: 60 * 60 * 1000,
  Day: 24 * 60 * 60 * 1000,
} as const;

export type TimeInMs = typeof TimeInMs[keyof typeof TimeInMs];

export const TimeInSeconds = {
  Second: 1,
  Minute: 60,
  Hour: 3600,
  Day: 86400,
} as const;

export type TimeInSeconds = typeof TimeInSeconds[keyof typeof TimeInSeconds];

export const Timeout = {
  TxTimeoutMs: 30000,
  JwksFetchMs: 10000,
  TokenTtlSeconds: 300,
} as const;

export type Timeout = typeof Timeout[keyof typeof Timeout];

export const CacheSize = {
  MaxInMemoryRateLimit: 10000,
} as const;

export type CacheSize = typeof CacheSize[keyof typeof CacheSize];
