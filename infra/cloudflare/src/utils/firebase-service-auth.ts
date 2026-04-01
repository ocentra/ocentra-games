import type { Env } from '@/constants/env';
import { HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const TOKEN_URL_DEFAULT = 'https://oauth2.googleapis.com/token';
const TOKEN_EARLY_REFRESH_MS = 60_000;

type CachedToken = {
  token: string;
  expiresAtMs: number;
};

let cachedToken: CachedToken | null = null;

function toBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeJsonBase64Url(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

const PKCS8_PEM_BEGIN = `${'-----BEGIN'} PRIVATE KEY-----`;
const PKCS8_PEM_END = `${'-----END'} PRIVATE KEY-----`;

function decodePemPrivateKey(pem: string): Uint8Array {
  const normalized = pem
    .replace(/\\n/g, '\n')
    .replace(PKCS8_PEM_BEGIN, '')
    .replace(PKCS8_PEM_END, '')
    .replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

type ServiceAccount = {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
};

function getServiceAccount(env: Env): ServiceAccount | null {
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as {
        client_email?: string;
        private_key?: string;
        token_uri?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
          tokenUri: parsed.token_uri ?? TOKEN_URL_DEFAULT,
        };
      }
    } catch {
      return null;
    }
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL && env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return {
      clientEmail: env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
      privateKey: env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY,
      tokenUri: TOKEN_URL_DEFAULT,
    };
  }

  return null;
}

async function mintAccessToken(account: ServiceAccount): Promise<CachedToken | null> {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: account.clientEmail,
    sub: account.clientEmail,
    aud: account.tokenUri,
    iat: nowSec,
    exp: nowSec + 3600,
    scope: FIRESTORE_SCOPE,
  };

  const jwtUnsigned = `${encodeJsonBase64Url(header)}.${encodeJsonBase64Url(payload)}`;
  const keyBytes = decodePemPrivateKey(account.privateKey);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(jwtUnsigned)
  );
  const signature = toBase64Url(new Uint8Array(signatureBuffer));
  const assertion = `${jwtUnsigned}.${signature}`;

  const tokenResponse = await fetch(account.tokenUri, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationXWwwFormUrlencoded,
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    return null;
  }

  const tokenData = await tokenResponse.json() as {
    access_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    return null;
  }

  const ttlSec = tokenData.expires_in ?? 3600;
  return {
    token: tokenData.access_token,
    expiresAtMs: Date.now() + ttlSec * 1000,
  };
}

export async function getFirestoreAuthHeader(env: Env): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - now > TOKEN_EARLY_REFRESH_MS) {
    return `Bearer ${cachedToken.token}`;
  }

  const account = getServiceAccount(env);
  if (!account) {
    return null;
  }

  const minted = await mintAccessToken(account);
  if (!minted) {
    return null;
  }

  cachedToken = minted;
  return `Bearer ${minted.token}`;
}
