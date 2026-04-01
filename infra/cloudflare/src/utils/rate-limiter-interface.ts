export interface RateLimiter {
  check(input: {
    key: string;
    limit: number;
    windowSeconds: number;
  }): Promise<{
    allowed: boolean;
    remaining?: number;
    resetAt?: number;
  }>;
}
