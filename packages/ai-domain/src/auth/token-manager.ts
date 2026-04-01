import type { OAuthTokenSet, OAuthConfig } from '@/auth/oauth-types';
import type { FetchAdapter } from '@/types/adapters';
import { refreshAccessToken } from '@/auth/oauth-flow';

export function isTokenExpired(token: OAuthTokenSet, bufferMs = 0): boolean {
  return Date.now() >= token.expiresAt - bufferMs;
}

export function shouldRefresh(token: OAuthTokenSet, bufferMs = 300_000): boolean {
  return Date.now() >= token.expiresAt - bufferMs;
}

export async function getValidToken(
  token: OAuthTokenSet,
  config: OAuthConfig,
  fetchAdapter: FetchAdapter
): Promise<OAuthTokenSet> {
  if (!shouldRefresh(token)) {
    return token;
  }
  if (!token.refreshToken) {
    throw new Error('Token expired and no refresh token available');
  }
  return refreshAccessToken(token.refreshToken, config, fetchAdapter);
}
