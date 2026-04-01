import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export class RateLimiter {
  static { log.register(import.meta.url); }

  private storage: Map<string, { count: number; resetAt: number }> = new Map();
  private config: RateLimitConfig;
  private queue: Promise<void> = Promise.resolve();

  constructor(config: RateLimitConfig = { maxRequests: 100, windowSeconds: 60 }) {
    this.config = config;
  }

  async checkRateLimit(userId: string): Promise<RateLimitResult> {
    return new Promise((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const now = Date.now();
          const key = `rate:${userId}`;
          const stored = this.storage.get(key);

          if (Math.random() < 0.01) this.cleanup(now);

          if (!stored || stored.resetAt <= now) {
            const resetAt = now + this.config.windowSeconds * 1000;
            this.storage.set(key, { count: 1, resetAt });
            resolve({ allowed: true, remaining: this.config.maxRequests - 1, resetAt: Math.floor(resetAt / 1000) });
            return;
          }

          if (stored.count >= this.config.maxRequests) {
            resolve({ allowed: false, remaining: 0, resetAt: Math.floor(stored.resetAt / 1000) });
            return;
          }

          stored.count++;
          this.storage.set(key, stored);
          resolve({ allowed: true, remaining: this.config.maxRequests - stored.count, resetAt: Math.floor(stored.resetAt / 1000) });
        } catch (error) {
          reject(error);
        }
      }).catch((error) => reject(error));
    });
  }

  private cleanup(now: number): void {
    for (const [key, value] of this.storage.entries()) {
      if (value.resetAt <= now) this.storage.delete(key);
    }
  }

  async resetRateLimit(userId: string): Promise<void> {
    this.storage.delete(`rate:${userId}`);
  }

  async getRateLimitStatus(userId: string): Promise<RateLimitResult> {
    const stored = this.storage.get(`rate:${userId}`);
    if (!stored || stored.resetAt <= Date.now()) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: Math.floor((Date.now() + this.config.windowSeconds * 1000) / 1000),
      };
    }
    return {
      allowed: stored.count < this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - stored.count),
      resetAt: Math.floor(stored.resetAt / 1000),
    };
  }
}

interface KVNamespace {
  get(key: string, type?: 'text'): Promise<string | null>;
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export class RateLimiterKV {
  private kv: KVNamespace;
  private config: RateLimitConfig;

  constructor(kv: KVNamespace, config: RateLimitConfig = { maxRequests: 100, windowSeconds: 60 }) {
    this.kv = kv;
    this.config = config;
  }

  async checkRateLimit(userId: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `rate:${userId}`;
    try {
      const stored = await this.kv.get(key, 'json') as { count: number; resetAt: number } | null;

      if (!stored || stored.resetAt <= now) {
        const resetAt = now + this.config.windowSeconds * 1000;
        await this.kv.put(key, JSON.stringify({ count: 1, resetAt }), { expirationTtl: this.config.windowSeconds });
        return { allowed: true, remaining: this.config.maxRequests - 1, resetAt: Math.floor(resetAt / 1000) };
      }

      if (stored.count >= this.config.maxRequests) {
        return { allowed: false, remaining: 0, resetAt: Math.floor(stored.resetAt / 1000) };
      }

      stored.count++;
      await this.kv.put(key, JSON.stringify(stored), { expirationTtl: Math.ceil((stored.resetAt - now) / 1000) });
      return { allowed: true, remaining: this.config.maxRequests - stored.count, resetAt: Math.floor(stored.resetAt / 1000) };
    } catch (error) {
      logError('Rate limit check failed, denying request for safety', { data: error });
      return { allowed: false, remaining: 0, resetAt: Math.floor((now + this.config.windowSeconds * 1000) / 1000) };
    }
  }

  async resetRateLimit(userId: string): Promise<void> {
    await this.kv.delete(`rate:${userId}`);
  }

  async getRateLimitStatus(userId: string): Promise<RateLimitResult> {
    const stored = await this.kv.get(`rate:${userId}`, 'json') as { count: number; resetAt: number } | null;
    const now = Date.now();
    if (!stored || stored.resetAt <= now) {
      return { allowed: true, remaining: this.config.maxRequests, resetAt: Math.floor((now + this.config.windowSeconds * 1000) / 1000) };
    }
    return {
      allowed: stored.count < this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - stored.count),
      resetAt: Math.floor(stored.resetAt / 1000),
    };
  }
}
