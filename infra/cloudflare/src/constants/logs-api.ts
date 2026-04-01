import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { TimeInMs } from './time';

export const LogsApiLimits = {
  MaxLogSize: 10000,
  MaxBatchSize: 200,
  MaxBlobSize: 50000,
  MaxStackSize: 10000,
  MaxArgsSize: 20000,
  RateLimitWindowMs: TimeInMs.Minute,
  RateLimitMaxRequests: 100,
  DefaultQueryLimit: 100,
  MaxQueryLimit: 1000,
} as const;

export type LogsApiLimits = typeof LogsApiLimits[keyof typeof LogsApiLimits];

export const LogsApiDataset = {
  Logs: 'logs',
} as const;

export type LogsApiDataset = typeof LogsApiDataset[keyof typeof LogsApiDataset];

export const LogsApiSafeErrorMessages = [
  'Not Found',
  'Rate limit exceeded',
  'Invalid request',
  'Missing required field',
  'Authentication failed',
  'Forbidden',
  'Too many requests',
  'Service unavailable',
  'Unauthorized',
  'Internal server error',
] as const;

export const LogsApiAllowedSqlQueries = [
  'select * from logs where',
  'select count(*) from logs',
  'select timestamp, level from logs',
] as const;

export const LogsApiFallback = {
  Unknown: 'unknown',
  InternalError: 'Internal error',
} as const;

export type LogsApiFallback = typeof LogsApiFallback[keyof typeof LogsApiFallback];

export const LogLevel = {
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
  Debug: 'debug',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export const LogsApiSeparator = {
  Colon: ':',
  Space: ' ',
  And: ' AND ',
  DescLimit: ' DESC LIMIT ',
} as const;

export type LogsApiSeparator = typeof LogsApiSeparator[keyof typeof LogsApiSeparator];

export const LogsApiSql = {
  Select: 'select',
  FromLogs: 'from logs',
  Semicolon: ';',
  SingleQuote: "'",
  EscapedSingleQuote: "''",
} as const;

export type LogsApiSql = typeof LogsApiSql[keyof typeof LogsApiSql];

export const LogsApiTimeUnit = {
  Seconds: 's',
  Minutes: 'm',
  Hours: 'h',
  Days: 'd',
} as const;

export type LogsApiTimeUnit = typeof LogsApiTimeUnit[keyof typeof LogsApiTimeUnit];

export const LogsApiTruncation = {
  Suffix: '...',
  Truncated: '[TRUNCATED]',
  TruncatedMessage: '...[TRUNCATED]',
} as const;

export type LogsApiTruncation = typeof LogsApiTruncation[keyof typeof LogsApiTruncation];

export const LogsApiKvKeyPrefix = {
  RateLimit: KvKeyPrefix.LogsRateLimit,
} as const;

export type LogsApiKvKeyPrefix = typeof LogsApiKvKeyPrefix[keyof typeof LogsApiKvKeyPrefix];

export const LogsApiErrorMessage = {
  OnlySelectQueriesAllowed: 'Only SELECT queries on logs table are allowed',
  TestSqlEndpointDisabled: 'Test SQL endpoint disabled in production',
} as const;

export type LogsApiErrorMessage = typeof LogsApiErrorMessage[keyof typeof LogsApiErrorMessage];
