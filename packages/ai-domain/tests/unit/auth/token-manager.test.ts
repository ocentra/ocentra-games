import { describe, it, expect } from 'vitest';
import { isTokenExpired, shouldRefresh } from '@/auth/token-manager';
import type { OAuthTokenSet } from '@/auth/oauth-types';

describe('token-manager', () => {
  it('isTokenExpired: returns false when token not expired', () => {
    const token: OAuthTokenSet = {
      accessToken: 'at',
      expiresAt: Date.now() + 60_000,
      tokenType: 'Bearer',
    };
    expect(isTokenExpired(token)).toBe(false);
  });

  it('isTokenExpired: returns true when token expired', () => {
    const token: OAuthTokenSet = {
      accessToken: 'at',
      expiresAt: Date.now() - 1000,
      tokenType: 'Bearer',
    };
    expect(isTokenExpired(token)).toBe(true);
  });

  it('shouldRefresh: returns true when within buffer of expiry', () => {
    const token: OAuthTokenSet = {
      accessToken: 'at',
      expiresAt: Date.now() + 60_000,
      tokenType: 'Bearer',
    };
    expect(shouldRefresh(token, 120_000)).toBe(true);
  });

  it('shouldRefresh: returns false when well before expiry', () => {
    const token: OAuthTokenSet = {
      accessToken: 'at',
      expiresAt: Date.now() + 600_000,
      tokenType: 'Bearer',
    };
    expect(shouldRefresh(token, 300_000)).toBe(false);
  });
});
