import type { RateLimiter } from './rate-limiter-interface';

export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  private queue: Promise<void> = Promise.resolve();

  async check({ key, limit, windowSeconds }: {
    key: string;
    limit: number;
    windowSeconds: number;
  }): Promise<{
    allowed: boolean;
    remaining?: number;
    resetAt?: number;
  }> {
    return new Promise((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const now = Date.now();
          const bucket = this.buckets.get(key);

          if (!bucket || now > bucket.resetAt) {
            this.buckets.set(key, {
              count: 1,
              resetAt: now + windowSeconds * 1000,
            });
            resolve({ allowed: true, remaining: limit - 1, resetAt: Math.floor((now + windowSeconds * 1000) / 1000) });
            return;
          }

          if (bucket.count >= limit) {
            resolve({ allowed: false, remaining: 0, resetAt: Math.floor(bucket.resetAt / 1000) });
            return;
          }

          bucket.count++;
          resolve({ allowed: true, remaining: limit - bucket.count, resetAt: Math.floor(bucket.resetAt / 1000) });
        } catch (error) {
          reject(error);
        }
      }).catch((error) => {
        reject(error);
      });
    });
  }
}
