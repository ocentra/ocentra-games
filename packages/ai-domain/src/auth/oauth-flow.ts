import type { OAuthConfig, OAuthTokenSet, PKCEChallenge } from '@/auth/oauth-types';
import type { FetchAdapter } from '@/types/adapters';

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const maxUnbiased = 256 - (256 % chars.length); // 256 - (256 % 66) = 256 - 58 = 198
  const result: string[] = [];
  while (result.length < length) {
    const array = new Uint8Array(length * 2); // oversample to reduce iterations
    crypto.getRandomValues(array);
    for (let i = 0; i < array.length && result.length < length; i++) {
      if (array[i] < maxUnbiased) {
        result.push(chars[array[i] % chars.length]);
      }
    }
  }
  return result.join('');
}

export async function generatePKCE(): Promise<PKCEChallenge> {
  const codeVerifier = randomString(64);
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const codeChallenge = base64UrlEncode(digest);
  return {
    codeVerifier,
    codeChallenge,
    challengeMethod: 'S256',
  };
}

export function buildAuthorizationUrl(
  config: OAuthConfig,
  pkce: PKCEChallenge,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.challengeMethod,
  });
  return `${config.authorizationEndpoint}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
  config: OAuthConfig,
  fetchAdapter: FetchAdapter
): Promise<OAuthTokenSet> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  });

  const response = await fetchAdapter.fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Token exchange failed: ${errText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  const expiresAt = data.expires_in
    ? Date.now() + data.expires_in * 1000
    : Date.now() + 3600 * 1000;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    tokenType: data.token_type ?? 'Bearer',
    scope: data.scope,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  config: OAuthConfig,
  fetchAdapter: FetchAdapter
): Promise<OAuthTokenSet> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetchAdapter.fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Token refresh failed: ${errText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  const expiresAt = data.expires_in
    ? Date.now() + data.expires_in * 1000
    : Date.now() + 3600 * 1000;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt,
    tokenType: data.token_type ?? 'Bearer',
    scope: data.scope,
  };
}

export function generateState(): string {
  return randomString(32);
}
