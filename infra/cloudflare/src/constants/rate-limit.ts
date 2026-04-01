import { TimeInMs } from '@/constants/time';
import {
  RateLimitKeyPrefix,
  KvKeyPrefix as BoundaryKvKeyPrefix,
} from '@ocentra/boundary-domain/constants/kv-key-prefixes';

export const RateLimitPrefix = RateLimitKeyPrefix;

export type RateLimitPrefix = (typeof RateLimitKeyPrefix)[keyof typeof RateLimitKeyPrefix];

export const RateLimitFallback = {
  Unknown: 'unknown',
} as const;

export type RateLimitFallback = (typeof RateLimitFallback)[keyof typeof RateLimitFallback];

export const KvKeyPrefix = BoundaryKvKeyPrefix;

export type KvKeyPrefix = (typeof BoundaryKvKeyPrefix)[keyof typeof BoundaryKvKeyPrefix];

export const CacheLimits = {
  AdminCacheMaxSize: 1000,
  AdminCacheTtlSeconds: 300,
} as const;

export type CacheLimits = typeof CacheLimits[keyof typeof CacheLimits];

export const CreditsRateLimit = {
  PurchaseLimit: 10,
  PurchaseWindowMs: TimeInMs.Minute,
  ConsumeLimit: 100,
  ConsumeWindowMs: TimeInMs.Minute,
  EarnLimit: 50,
  EarnWindowMs: TimeInMs.Minute,
} as const;

export type CreditsRateLimit = typeof CreditsRateLimit[keyof typeof CreditsRateLimit];

export const KvExpiration = {
  MinTtlSeconds: 60,
} as const;

export type KvExpiration = typeof KvExpiration[keyof typeof KvExpiration];
