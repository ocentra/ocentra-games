import type { TokenAction } from '@/constants/token-actions';

export interface SecureTokenData {
  walletId: string;
  userId: string;
  guid: string;
  path: string;
  action: TokenAction;
  nonce: string;
  ipHash: string;
  expiresAt: number;
  signature?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  error?: string;
  tokenData?: SecureTokenData;
}

export interface SecureTokenCrypto {
  importKey(
    format: string,
    keyData: Uint8Array,
    algorithm: { name: string; hash: string },
    extractable: boolean,
    keyUsages: string[]
  ): Promise<CryptoKey>;
  sign(algorithm: string, key: CryptoKey, data: Uint8Array): Promise<ArrayBuffer>;
  verify(algorithm: string, key: CryptoKey, signature: ArrayBuffer, data: ArrayBuffer): Promise<boolean>;
}

export interface SecureTokenKV {
  getWithMetadata(key: string): Promise<{
    value: string | null;
    metadata: { usedAt?: string; ip?: string } | null;
  }>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number; metadata?: { usedAt?: string; ip?: string } }
  ): Promise<void>;
}

export interface SecureTokenAnalytics {
  writeDataPoint(data: {
    blobs: string[];
    doubles: number[];
    indexes: string[];
  }): void;
}

export interface GenerateSecureTokenInput {
  walletId: string;
  userId: string;
  guid: string;
  path: string;
  action: TokenAction;
  secret: string;
  ttlSeconds: number;
  getClientIp: () => string;
  hashString: (input: string) => Promise<string>;
  generateNonce: () => string;
  crypto: SecureTokenCrypto;
  kv?: SecureTokenKV;
  getNow?: () => number;
}

export interface GenerateSecureTokenResult {
  success: boolean;
  token?: string;
  nonce?: string;
  expiresAt?: number;
  error?: string;
}

export async function generateSecureTokenLogic(
  input: GenerateSecureTokenInput
): Promise<GenerateSecureTokenResult> {
  try {
    if (!input.secret) {
      return {
        success: false,
        error: 'SIGNED_URL_SECRET not configured',
      };
    }

    const getNow = input.getNow ?? (() => Date.now());
    const now = getNow();
    const nonce = input.generateNonce();
    const ip = input.getClientIp();
    const ipHash = await input.hashString(ip);
    const expiresAt = now + (input.ttlSeconds * 1000);

    const tokenData: SecureTokenData = {
      walletId: input.walletId,
      userId: input.userId,
      guid: input.guid,
      path: input.path,
      action: input.action,
      nonce,
      ipHash,
      expiresAt,
    };

    const tokenString = JSON.stringify(tokenData);
    const tokenBytes = new TextEncoder().encode(tokenString);

    const secretKey = await input.crypto.importKey(
      'raw',
      new TextEncoder().encode(input.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await input.crypto.sign('HMAC', secretKey, tokenBytes);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const tokenWithSignature = { ...tokenData, signature: signatureHex };
    const token = btoa(JSON.stringify(tokenWithSignature));

    if (input.kv) {
      await input.kv.put(
        `nonce:${nonce}`,
        JSON.stringify({
          status: 'pending',
          walletId: input.walletId,
          userId: input.userId,
          guid: input.guid,
          action: input.action,
          createdAt: getNow(),
        }),
        { expirationTtl: input.ttlSeconds }
      );
    }

    return {
      success: true,
      token,
      nonce,
      expiresAt,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export interface ValidateSecureTokenInput {
  token: string;
  secret: string;
  getClientIp: () => string;
  getWalletId: () => string | null;
  hashString: (input: string) => Promise<string>;
  crypto: SecureTokenCrypto;
  kv?: SecureTokenKV;
  analytics?: SecureTokenAnalytics;
  logWarning?: (message: string, data: unknown) => void;
  logSecurityEvent?: (event: {
    event: string;
    walletId: string;
    userId: string;
    guid?: string;
    action?: string;
    nonce?: string;
    ip?: string;
    [key: string]: unknown;
  }) => Promise<void>;
  calculateKvExpirationTtl?: (ms: number) => number;
  getNow?: () => number;
}

export async function validateSecureTokenLogic(
  input: ValidateSecureTokenInput
): Promise<TokenValidationResult> {
  try {
    if (!input.secret) {
      return { valid: false, error: 'Server configuration error' };
    }

    const decoded = JSON.parse(atob(input.token));
    const { signature, ...tokenData } = decoded as SecureTokenData;

    const tokenString = JSON.stringify(tokenData);
    const tokenBytes = new TextEncoder().encode(tokenString);

    const secretKey = await input.crypto.importKey(
      'raw',
      new TextEncoder().encode(input.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    if (!signature) {
      return {
        valid: false,
        error: 'Missing signature in token',
      };
    }

    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    const signatureBuffer = signatureBytes.buffer as ArrayBuffer;
    const tokenBuffer = tokenBytes.buffer as ArrayBuffer;

    const isValid = await input.crypto.verify(
      'HMAC',
      secretKey,
      signatureBuffer,
      tokenBuffer
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    const getNow = input.getNow ?? (() => Date.now());
    const now = getNow();

    if (now > tokenData.expiresAt) {
      return { valid: false, error: 'Token expired' };
    }

    const requestWalletId = input.getWalletId();
    if (requestWalletId && tokenData.walletId !== requestWalletId) {
      return { valid: false, error: 'Wallet ID mismatch' };
    }

    const currentIp = input.getClientIp();
    const currentIpHash = await input.hashString(currentIp);
    if (tokenData.ipHash !== currentIpHash) {
      input.logWarning?.('IP hash mismatch', {
        expected: tokenData.ipHash,
        actual: currentIpHash,
        walletId: tokenData.walletId,
      });
    }

    if (!input.kv) {
      input.logWarning?.('MANIFEST_CACHE_KV not configured - replay protection disabled', {});
      return { valid: true, tokenData };
    }

    const nonceKey = `nonce:${tokenData.nonce}`;
    const timestamp = now.toString();

    try {
      const existing = await input.kv.getWithMetadata(nonceKey);

      if (existing.value !== null) {
        const nonceData = JSON.parse(existing.value) as {
          status: 'pending' | 'used';
          walletId: string;
          userId: string;
          guid: string;
          action: string;
          createdAt: number;
          usedAt?: number;
        };

        if (nonceData.status === 'used') {
          await input.logSecurityEvent?.({
            event: 'NonceReplayAttempt',
            walletId: tokenData.walletId,
            userId: tokenData.userId,
            guid: tokenData.guid,
            nonce: tokenData.nonce,
            ip: currentIp,
          });
          return { valid: false, error: 'Token already used (replay attack detected)' };
        }

        if (
          nonceData.walletId !== tokenData.walletId ||
          nonceData.userId !== tokenData.userId ||
          nonceData.guid !== tokenData.guid ||
          nonceData.action !== tokenData.action
        ) {
          return { valid: false, error: 'Nonce data mismatch' };
        }

        const updatedNonceData = {
          ...nonceData,
          status: 'used' as const,
          usedAt: Number(timestamp),
        };

        await input.kv.put(
          nonceKey,
          JSON.stringify(updatedNonceData),
          {
            expirationTtl: input.calculateKvExpirationTtl
              ? input.calculateKvExpirationTtl(tokenData.expiresAt - now)
              : undefined,
            metadata: { usedAt: timestamp, ip: currentIp },
          }
        );

        const verify = await input.kv.getWithMetadata(nonceKey);
        const verifyData = verify.value ? JSON.parse(verify.value) : null;

        if (!verifyData || verifyData.usedAt !== Number(timestamp)) {
          await input.logSecurityEvent?.({
            event: 'NonceRaceDetected',
            walletId: tokenData.walletId,
            userId: tokenData.userId,
            guid: tokenData.guid,
            nonce: tokenData.nonce,
            ip: currentIp,
          });
          return { valid: false, error: 'Concurrent nonce usage detected' };
        }
      } else {
        return { valid: false, error: 'Token already used or expired (nonce missing)' };
      }
    } catch (error) {
      input.logWarning?.('Nonce check failed', error);
      return { valid: false, error: 'Nonce verification failed' };
    }

    await input.logSecurityEvent?.({
      event: 'TokenValidated',
      walletId: tokenData.walletId,
      userId: tokenData.userId,
      guid: tokenData.guid,
      action: tokenData.action,
    });

    return { valid: true, tokenData };
  } catch (error) {
    return {
      valid: false,
      error: `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

import type { MatchId } from '@ocentra/endpoint-domain/constants/match';

export interface ValidateSimpleTokenInput {
  token: string;
  secret: string;
  expectedMatchId: MatchId;
  crypto: SecureTokenCrypto;
  hexToBytes: (hex: string) => Uint8Array;
}

export interface ValidateSimpleTokenResult {
  success: boolean;
  error?: string;
}

export async function validateSimpleTokenLogic(
  input: ValidateSimpleTokenInput
): Promise<ValidateSimpleTokenResult> {
  try {
    if (!input.secret) {
      return {
        success: false,
        error: 'Signed URL secret not configured',
      };
    }

    const tokenData = JSON.parse(atob(input.token));

    if (tokenData.expiresAt && Date.now() > tokenData.expiresAt) {
      return {
        success: false,
        error: 'Signed URL expired',
      };
    }

    const { signature, ...dataWithoutSig } = tokenData;
    const tokenString = JSON.stringify(dataWithoutSig);
    const tokenBytes = new TextEncoder().encode(tokenString);

    const secretKey = await input.crypto.importKey(
      'raw',
      new TextEncoder().encode(input.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = input.hexToBytes(signature);
    const signatureBuffer = new ArrayBuffer(signatureBytes.byteLength);
    new Uint8Array(signatureBuffer).set(signatureBytes);
    const tokenBuffer = new ArrayBuffer(tokenBytes.byteLength);
    new Uint8Array(tokenBuffer).set(tokenBytes);

    const isValid = await input.crypto.verify(
      'HMAC',
      secretKey,
      signatureBuffer,
      tokenBuffer
    );

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid signed URL token',
      };
    }

    if (tokenData.matchId !== input.expectedMatchId) {
      return {
        success: false,
        error: 'Token matchId mismatch',
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    return {
      success: false,
      error: `Invalid signed URL token format: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
