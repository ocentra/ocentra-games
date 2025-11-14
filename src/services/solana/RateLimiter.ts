/**
 * Rate limiter per spec Section 2.1, lines 276-282.
 * Implements per-user_id rate limiting (not per wallet) to prevent abuse.
 * 
 * Spec requirements:
 * - Max 100 moves per minute per user
 * - Uses Redis/KV for distributed rate limiting
 * - Works across multiple coordinator instances
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp when limit resets
}

export interface RateLimitConfig {
  maxRequests: number; // Max requests per window (default: 100)
  windowSeconds: number; // Time window in seconds (default: 60)
}

/**
 * Rate limiter using in-memory storage (for single-instance deployment).
 * For multi-instance, use RateLimiterKV with Cloudflare KV or Redis.
 */
export class RateLimiter {
  private storage: Map<string, { count: number; resetAt: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 100, windowSeconds: 60 }) {
    this.config = config;
  }

  /**
   * Checks if request is allowed for user_id.
   * Per spec: Rate limit per user_id, not coordinator wallet.
   */
  async checkRateLimit(userId: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `rate:${userId}`;
    const stored = this.storage.get(key);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      this.cleanup(now);
    }

    if (!stored || stored.resetAt <= now) {
      // No existing entry or expired, create new window
      const resetAt = now + this.config.windowSeconds * 1000;
      this.storage.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: Math.floor(resetAt / 1000),
      };
    }

    // Check if limit exceeded
    if (stored.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.floor(stored.resetAt / 1000),
      };
    }

    // Increment count
    stored.count++;
    this.storage.set(key, stored);

    return {
      allowed: true,
      remaining: this.config.maxRequests - stored.count,
      resetAt: Math.floor(stored.resetAt / 1000),
    };
  }

  /**
   * Cleans up expired rate limit entries.
   */
  private cleanup(now: number): void {
    for (const [key, value] of this.storage.entries()) {
      if (value.resetAt <= now) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Resets rate limit for specific user (for testing/admin).
   */
  async resetRateLimit(userId: string): Promise<void> {
    const key = `rate:${userId}`;
    this.storage.delete(key);
  }

  /**
   * Gets current rate limit status for user.
   */
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

/**
 * Cloudflare KV namespace type definition.
 * This is only available in Cloudflare Workers environment.
 */
interface KVNamespace {
  get(key: string, type?: 'text'): Promise<string | null>;
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Rate limiter using Cloudflare KV for distributed rate limiting.
 * Per spec: Works across multiple coordinator instances.
 */
export class RateLimiterKV {
  private kv: KVNamespace;
  private config: RateLimitConfig;

  constructor(kv: KVNamespace, config: RateLimitConfig = { maxRequests: 100, windowSeconds: 60 }) {
    this.kv = kv;
    this.config = config;
  }

  /**
   * Checks if request is allowed for user_id using KV storage.
   */
  async checkRateLimit(userId: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `rate:${userId}`;
    
    try {
      const stored = await this.kv.get(key, 'json') as { count: number; resetAt: number } | null;

      if (!stored || stored.resetAt <= now) {
        // Create new window
        const resetAt = now + this.config.windowSeconds * 1000;
        await this.kv.put(key, JSON.stringify({ count: 1, resetAt }), {
          expirationTtl: this.config.windowSeconds,
        });

        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetAt: Math.floor(resetAt / 1000),
        };
      }

      // Check if limit exceeded
      if (stored.count >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: Math.floor(stored.resetAt / 1000),
        };
      }

      // Increment count atomically (KV doesn't support atomic increment, so use get-modify-put with expiration)
      stored.count++;
      await this.kv.put(key, JSON.stringify(stored), {
        expirationTtl: Math.ceil((stored.resetAt - now) / 1000),
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - stored.count,
        resetAt: Math.floor(stored.resetAt / 1000),
      };
    } catch (error) {
      console.error('Rate limit check failed, allowing request:', error);
      // On error, allow request (fail open)
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: Math.floor((now + this.config.windowSeconds * 1000) / 1000),
      };
    }
  }

  /**
   * Resets rate limit for specific user.
   */
  async resetRateLimit(userId: string): Promise<void> {
    await this.kv.delete(`rate:${userId}`);
  }

  /**
   * Gets current rate limit status for user.
   */
  async getRateLimitStatus(userId: string): Promise<RateLimitResult> {
    const key = `rate:${userId}`;
    const stored = await this.kv.get(key, 'json') as { count: number; resetAt: number } | null;
    const now = Date.now();

    if (!stored || stored.resetAt <= now) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: Math.floor((now + this.config.windowSeconds * 1000) / 1000),
      };
    }

    return {
      allowed: stored.count < this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - stored.count),
      resetAt: Math.floor(stored.resetAt / 1000),
    };
  }
}

