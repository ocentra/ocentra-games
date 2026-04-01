import type { Env } from '@/constants/env';
import type { RateLimiter } from './rate-limiter-interface';

export class CloudflareRateLimiter implements RateLimiter {
  constructor(private env: Env) {}

  async check({ key }: {
    key: string;
    limit: number;
    windowSeconds: number;
  }): Promise<{
    allowed: boolean;
    remaining?: number;
    resetAt?: number;
  }> {
    if (!this.env.RATE_LIMITER) {
      throw new Error('RATE_LIMITER binding not configured');
    }

    const res = await this.env.RATE_LIMITER.limit({
      key,
    });

    return {
      allowed: res.success,
      remaining: undefined,
      resetAt: undefined,
    };
  }
}
