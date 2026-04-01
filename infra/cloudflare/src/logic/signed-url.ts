export interface SignedUrlCrypto {
  importKey(
    format: string,
    keyData: Uint8Array,
    algorithm: { name: string; hash: string },
    extractable: boolean,
    keyUsages: string[]
  ): Promise<CryptoKey>;
  sign(algorithm: string, key: CryptoKey, data: Uint8Array): Promise<ArrayBuffer>;
}

import type { MatchId } from '@ocentra/endpoint-domain/constants/match';

import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';

export interface GenerateSignedUrlInput {
  matchId: MatchId;
  secret: string;
  baseUrl: string;
  expiresIn: number;
  maxExpiration: number;
}

export interface GenerateSignedUrlResult {
  success: boolean;
  matchId: MatchId;
  signedUrl?: string;
  expiresIn?: number;
  expiresAt?: string;
  error?: string;
}

export async function generateSignedUrlLogic(
  input: GenerateSignedUrlInput,
  cryptoImpl: SignedUrlCrypto
): Promise<GenerateSignedUrlResult> {
  try {
    if (!input.secret) {
      return {
        success: false,
        matchId: input.matchId,
        error: 'Signed URL secret not configured',
      };
    }

    const expiresIn = Math.min(input.expiresIn, input.maxExpiration);
    const expiresAt = Date.now() + (expiresIn * 1000);

    const tokenData = {
      matchId: input.matchId,
      expiresAt,
    };

    const tokenString = JSON.stringify(tokenData);
    const tokenBytes = new TextEncoder().encode(tokenString);

    const secretKey = await cryptoImpl.importKey(
      'raw',
      new TextEncoder().encode(input.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await cryptoImpl.sign('HMAC', secretKey, tokenBytes);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const signedTokenData = {
      ...tokenData,
      signature: signatureHex,
    };

    const token = btoa(JSON.stringify(signedTokenData));

    const url = new URL(input.baseUrl);
    url.pathname = ApiEndpoint.Matches.ById(input.matchId);
    url.searchParams.set('token', token);
    const signedUrl = url.toString();

    return {
      success: true,
      matchId: input.matchId,
      signedUrl,
      expiresIn,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      matchId: input.matchId,
      error: String(error),
    };
  }
}
