import type { Env } from '@/constants/env';
import type { RateLimiter } from './rate-limiter-interface';
import { CloudflareRateLimiter } from './rate-limiter-cloudflare';
import { InMemoryRateLimiter } from './rate-limiter-in-memory';

// Singleton instance for test mode to ensure rate limits persist across requests
let testRateLimiterInstance: InMemoryRateLimiter | null = null;

export function createRateLimiter(env: Env, testMode?: boolean): RateLimiter {
  if (testMode || env.TEST_MODE === 'true') {
    if (!testRateLimiterInstance) {
      testRateLimiterInstance = new InMemoryRateLimiter();
    }
    return testRateLimiterInstance;
  }

  if (!env.RATE_LIMITER) {
    throw new Error('RATE_LIMITER binding not configured');
  }

  return new CloudflareRateLimiter(env);
}

// Reset the singleton (useful for test cleanup between test suites)
export function resetTestRateLimiter(): void {
  testRateLimiterInstance = null;
}
