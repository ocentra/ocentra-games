import { RateLimitPrefix, KvExpiration } from '@/constants/rate-limit';
import { TimeInSeconds } from '@/constants/time';
import { validateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import type { IdempotencyKey } from '@ocentra/endpoint-domain/constants/idempotency';

export interface IdempotencyKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface IdempotencyResult<T> {
  cached: boolean;
  result: T;
}

export const IdempotencyTtl = {
  DefaultSeconds: TimeInSeconds.Day,
} as const;

export type IdempotencyTtl = typeof IdempotencyTtl[keyof typeof IdempotencyTtl];

export async function checkIdempotencyKey<T>(
  kv: IdempotencyKV | undefined,
  userId: string,
  idempotencyKey: IdempotencyKey
): Promise<IdempotencyResult<T> | null> {
  if (!kv) {
    return null;
  }

  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    return null;
  }

  const validation = validateIdempotencyKey(idempotencyKey);
  if (!validation.valid) {
    return null;
  }

  const key = `${RateLimitPrefix.Idempotency}${userId}:${idempotencyKey}`;

  try {
    const cached = await kv.get(key);

    if (cached) {
      const result = JSON.parse(cached) as T;
      return {
        cached: true,
        result,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function storeIdempotencyResult<T>(
  kv: IdempotencyKV | undefined,
  userId: string,
  idempotencyKey: IdempotencyKey,
  result: T,
  ttlSeconds: number = IdempotencyTtl.DefaultSeconds
): Promise<void> {
  if (!kv) {
    return;
  }

  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    return;
  }

  const validation = validateIdempotencyKey(idempotencyKey);
  if (!validation.valid) {
    return;
  }

  const key = `${RateLimitPrefix.Idempotency}${userId}:${idempotencyKey}`;

  try {
    const ttl = Math.max(KvExpiration.MinTtlSeconds, ttlSeconds);
    await kv.put(key, JSON.stringify(result), {
      expirationTtl: ttl,
    });
  } catch {
    return;
  }
}
