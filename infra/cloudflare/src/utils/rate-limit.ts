import { HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { RateLimitPrefix, RateLimitFallback, KvExpiration } from '@/constants/rate-limit';

export function calculateKvExpirationTtl(remainingMs: number): number {
  return Math.max(KvExpiration.MinTtlSeconds, Math.floor(remainingMs / 1000));
}

export async function getRateLimitIdentifier(request: Request): Promise<string> {
  const walletId = request.headers.get(HttpHeader.XWalletId);
  if (walletId) {
    return `${RateLimitPrefix.Wallet}${walletId}`;
  }

  const cfConnectingIp = request.headers.get(HttpHeader.CFConnectingIP);
  return `${RateLimitPrefix.Ip}${cfConnectingIp || RateLimitFallback.Unknown}`;
}

export function addRateLimitHeaders(
  headers: Record<string, string>,
  rateLimit: { remaining: number; resetAt: number }
): void {
  headers[HttpHeader.XRateLimitRemaining] = String(rateLimit.remaining);
  headers[HttpHeader.XRateLimitReset] = String(Math.floor(rateLimit.resetAt / 1000));
}
