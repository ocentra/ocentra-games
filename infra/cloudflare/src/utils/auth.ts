import { HashAlgorithm, CryptoAlgorithm, KeyFormat, KeyUsage } from '@/constants/crypto';
import { FirebaseUrl } from '@ocentra/endpoint-domain/constants/firebase';
import { JwtAlgorithm, TestTokenPrefix, TestTokenValue, PemMarker, FirebaseIssuer } from '@ocentra/endpoint-domain/constants/auth';
import { HttpHeader, HttpContentType, HttpAuthScheme } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { Timeout } from '@/constants/time';
import type { Env } from '@/constants/env';
import { alertJWKSFailure } from '@/monitoring/security';
import { consumeResponseBody } from '@/utils/consume-response-body';

export interface VerifiedToken {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  iat: number;
  exp: number;
}

interface FirebaseJWKS {
  [kid: string]: string;
}

let cachedPublicKeys: FirebaseJWKS | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 3600000;

function validateJWKSStructure(keys: FirebaseJWKS): boolean {
  if (!keys || typeof keys !== 'object') {
    return false;
  }

  const keyEntries = Object.entries(keys);
  if (keyEntries.length === 0) {
    return false;
  }

  for (const [kid, pem] of keyEntries) {
    if (!kid || typeof kid !== 'string') {
      return false;
    }
    if (!pem || typeof pem !== 'string') {
      return false;
    }
    if (!pem.includes(PemMarker.BeginCertificate) || !pem.includes(PemMarker.EndCertificate)) {
      return false;
    }
  }

  return true;
}

async function getFirebasePublicKeys(env?: Env): Promise<FirebaseJWKS> {
  const now = Date.now();

  if (cachedPublicKeys && now < cacheExpiry) {
    return cachedPublicKeys;
  }

  try {
    const response = await fetch(
      FirebaseUrl.PublicKeys,
      {
        signal: AbortSignal.timeout(Timeout.JwksFetchMs),
        headers: {
          [HttpHeader.Accept]: HttpContentType.ApplicationJson
        }
      }
    );

    if (!response.ok) {
      await consumeResponseBody(response);
      const errorMsg = `Failed to fetch Firebase public keys: ${response.status}`;
      if (env) {
        await alertJWKSFailure(errorMsg, env);
      }
      throw new Error(errorMsg);
    }

    const keys = await response.json() as FirebaseJWKS;

    if (!validateJWKSStructure(keys)) {
      const errorMsg = 'Invalid JWKS structure received from Firebase';
      if (env) {
        await alertJWKSFailure(errorMsg, env);
      }
      throw new Error(errorMsg);
    }

    cachedPublicKeys = keys;
    cacheExpiry = now + CACHE_TTL;

    return keys;
  } catch (error) {
    const errorMsg = `Failed to fetch Firebase public keys: ${error instanceof Error ? error.message : 'Unknown error'}`;
    if (env) {
      await alertJWKSFailure(errorMsg, env);
    }
    throw new Error(errorMsg);
  }
}

async function pemToCryptoKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(PemMarker.BeginCertificate, '')
    .replace(PemMarker.EndCertificate, '')
    .replace(/\n/g, '');
  const binaryDer = atob(pemContents);
  const derBuffer = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    derBuffer[i] = binaryDer.charCodeAt(i);
  }

  try {
    const cryptoKey = await crypto.subtle.importKey(
      KeyFormat.Spki,
      derBuffer,
      {
        name: CryptoAlgorithm.RsaPkcs1V15,
        hash: HashAlgorithm.Sha256,
      },
      false,
      [KeyUsage.Verify]
    );

    return cryptoKey;
  } catch (error) {
    throw new Error(`Failed to import public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64;
  const binaryStr = atob(paddedBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return bytes;
}

export async function verifyFirebaseToken(
  idToken: string,
  projectId: string,
  env?: Env
): Promise<VerifiedToken> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format: JWT must contain exactly 3 parts');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    let header: { alg?: string; kid?: string };
    try {
      header = JSON.parse(atob(headerB64));
    } catch {
      throw new Error('Invalid token header - not valid base64 JSON');
    }

    if (!header.kid) {
      throw new Error('Token missing kid (key ID) in header');
    }

    if (header.alg !== JwtAlgorithm.Rs256) {
      throw new Error(`Unsupported algorithm: ${header.alg}. Expected ${JwtAlgorithm.Rs256}`);
    }
    const publicKeys = await getFirebasePublicKeys(env);
    const publicKeyPem = publicKeys[header.kid];

    if (!publicKeyPem) {
      throw new Error(`Public key not found for kid: ${header.kid}`);
    }

    const cryptoKey = await pemToCryptoKey(publicKeyPem);
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const isValid = await crypto.subtle.verify(
      CryptoAlgorithm.RsaPkcs1V15,
      cryptoKey,
      signature as unknown as BufferSource,
      signedData as unknown as BufferSource
    );

    if (!isValid) {
      throw new Error('Invalid token signature - token may be forged');
    }

    let payload: {
      user_id?: string;
      sub?: string;
      email?: string;
      email_verified?: boolean;
      iat?: number;
      exp?: number;
      iss?: string;
      aud?: string;
    };

    try {
      payload = JSON.parse(atob(payloadB64));
    } catch {
      throw new Error('Invalid token payload - not valid base64 JSON');
    }

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp) {
      throw new Error('Token missing expiration (exp)');
    }
    if (payload.exp < now) {
      throw new Error(`Token expired at ${new Date(payload.exp * 1000).toISOString()}`);
    }

    if (payload.iat && payload.iat > now + 60) {
      throw new Error('Token issued in the future');
    }

    const expectedIssuer = FirebaseIssuer.Build(projectId);
    if (payload.iss !== expectedIssuer) {
      throw new Error(`Invalid token issuer. Expected: ${expectedIssuer}, got: ${payload.iss}`);
    }

    if (payload.aud !== projectId) {
      throw new Error(`Invalid token audience. Expected: ${projectId}, got: ${payload.aud}`);
    }
    const uid = payload.user_id || payload.sub || '';
    if (!uid) {
      throw new Error('Token missing user_id or sub claim');
    }

    return {
      uid,
      email: payload.email,
      emailVerified: payload.email_verified || false,
      iat: payload.iat || now,
      exp: payload.exp,
    };

  } catch (error) {
    throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== HttpAuthScheme.Bearer) {
    return null;
  }

  return parts[1];
}

export function formatBearerToken(token: string): string {
  return `${HttpAuthScheme.Bearer} ${token}`;
}

export async function verifyAuth(
  request: Request,
  projectId: string,
  env?: { TEST_MODE?: string; ADMIN_USER_IDS?: string }
): Promise<{ userId: string; error?: string }> {
  try {
    const authHeader = request.headers.get(HttpHeader.Authorization);
    const token = extractTokenFromHeader(authHeader);

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return { userId: '', error: ErrorMessage.MissingAuthorizationHeaderOrToken };
    }

    console.log(`[verifyAuth] token=${token ? (token.substring(0, 20) + '...') : 'null'} testMode=${env?.TEST_MODE}`);

    if (env?.TEST_MODE === QueryValue.True) {
      if (token.startsWith(TestTokenPrefix.Test)) {
        const testTokenMatch = token.match(new RegExp(`^${TestTokenPrefix.Test}([^:]+)(?::admin)?$`));
        console.log(`[verifyAuth] testTokenMatch=${testTokenMatch ? 'match' : 'no-match'} userId=${testTokenMatch ? testTokenMatch[1] : 'n/a'}`);
        if (testTokenMatch) {
          const userId = testTokenMatch[1];
          return { userId };
        }
      }
      if (token.startsWith(TestTokenPrefix.Forged) || token.startsWith(TestTokenPrefix.Expired) ||
          token.startsWith(TestTokenPrefix.InvalidIssuer) || token.startsWith(TestTokenPrefix.InvalidAudience) ||
          token === TestTokenValue.InvalidFormat || token === TestTokenValue.NotValidJwt || token === TestTokenValue.InvalidToken) {
        return { userId: '', error: ErrorMessage.InvalidTestTokenFormat };
      }
      return { userId: '', error: ErrorMessage.InvalidTestTokenFormat };
    }

    const verifiedToken = await verifyFirebaseToken(token, projectId, env as Env | undefined);

    if (!verifiedToken.uid) {
      return { userId: '', error: ErrorMessage.InvalidTokenMissingUserId };
    }

    return { userId: verifiedToken.uid };
  } catch (error) {
    return {
      userId: '',
      error: error instanceof Error ? error.message : ErrorMessage.TokenVerificationFailed
    };
  }
}
