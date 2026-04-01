import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  generateSecureTokenLogic,
  validateSecureTokenLogic,
  validateSimpleTokenLogic,
  type SecureTokenCrypto,
  type SecureTokenKV,
  type SecureTokenAnalytics,
} from '@/logic/secure-token';
import { TokenAction } from '@/constants/token-actions';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { asMatchId } from '@ocentra/endpoint-domain/constants/match';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const TestConstants = {
  WalletId1: 'wallet1',
  UserId1: 'user1',
  Guid1: 'guid1',
  Path1: 'path1',
  TestSecret: 'test-secret',
  EmptySecret: '',
  TtlSeconds3600: 3600,
  Nonce123: 'nonce-123',
  HashedIp: 'hashed-ip',
  ClientIp: '127.0.0.1',
  TestSignature: 'test-signature',
  InvalidSignature: 'invalid-signature',
  MatchId1: asMatchId('550e8400-e29b-41d4-a716-446655440005'),
  MatchId2: asMatchId('550e8400-e29b-41d4-a716-446655440006'),
  Pending: 'pending',
  Used: 'used',
  NotConfigured: 'not configured',
  Expired: 'expired',
  InvalidSignatureError: 'Invalid signature',
  ReplayAttack: 'Token already used (replay attack detected)',
  SignedUrlExpired: 'Signed URL expired',
  TokenMatchIdMismatch: 'Token matchId mismatch',
  InvalidSignedUrlTokenFormat: 'Invalid signed URL token format',
  NonceReplayAttempt: 'NonceReplayAttempt',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should generate secure token successfully'), async () => {
    logInfo('[TEST] Testing generateSecureTokenLogic', getStackTrace(), { walletId: TestConstants.WalletId1 }, LOG_TEST_OPERATIONS);
    if (!TestConstants.WalletId1 || !TestConstants.TestSecret) {
      logError('[TEST] Missing test constants for secure token generation', getStackTrace(), { hasWalletId: !!TestConstants.WalletId1, hasSecret: !!TestConstants.TestSecret });
    }
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      verify: vi.fn(),
    };

    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await generateSecureTokenLogic({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      secret: TestConstants.TestSecret,
      ttlSeconds: TestConstants.TtlSeconds3600,
      getClientIp: () => TestConstants.ClientIp,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      generateNonce: () => TestConstants.Nonce123,
      crypto: mockCrypto,
      kv: mockKv,
    });

    expect(result.success).toBe(true);
    expect(result.token).toBeTypeOf('string');
    expect(result.token?.length).toBeGreaterThan(0);
    expect(result.nonce).toBe(TestConstants.Nonce123);
    expect(result.expiresAt).toBeGreaterThan(Date.now());
    expect(mockKv.put).toHaveBeenCalled();
  });

  it(testName('should fail when secret is not configured'), async () => {
    const result = await generateSecureTokenLogic({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      secret: TestConstants.EmptySecret,
      ttlSeconds: TestConstants.TtlSeconds3600,
      getClientIp: () => TestConstants.ClientIp,
      hashString: vi.fn(),
      generateNonce: () => TestConstants.Nonce123,
      crypto: {} as SecureTokenCrypto,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.NotConfigured);
  });

  it(testName('should work without KV storage'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      verify: vi.fn(),
    };

    const result = await generateSecureTokenLogic({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      secret: TestConstants.TestSecret,
      ttlSeconds: TestConstants.TtlSeconds3600,
      getClientIp: () => TestConstants.ClientIp,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      generateNonce: () => TestConstants.Nonce123,
      crypto: mockCrypto,
    });

    expect(result.success).toBe(true);
    expect(result.token).toBeTypeOf('string');
    expect(result.token?.length).toBeGreaterThan(0);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should validate valid token'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    let savedTimestamp: number | undefined;
    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn()
        .mockResolvedValueOnce({
          value: JSON.stringify({
            status: TestConstants.Pending,
            walletId: TestConstants.WalletId1,
            userId: TestConstants.UserId1,
            guid: TestConstants.Guid1,
            action: TokenAction.Download,
            createdAt: Date.now(),
          }),
          metadata: null,
        })
        .mockImplementation(async () => {
          return {
            value: savedTimestamp
              ? JSON.stringify({
                  status: TestConstants.Used,
                  walletId: TestConstants.WalletId1,
                  userId: TestConstants.UserId1,
                  guid: TestConstants.Guid1,
                  action: TokenAction.Download,
                  createdAt: Date.now(),
                  usedAt: savedTimestamp,
                })
              : null,
            metadata: null,
          };
        }),
      put: vi.fn().mockImplementation(async (key, value) => {
        const data = JSON.parse(value);
        savedTimestamp = data.usedAt;
      }),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => TestConstants.WalletId1,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: mockKv,
    });

    expect(result.valid).toBe(true);
    expect(result.tokenData).not.toBeUndefined();
    expect(result.tokenData?.walletId).toBe(TestConstants.WalletId1);
    expect(result.tokenData?.userId).toBe(TestConstants.UserId1);
    expect(result.tokenData?.guid).toBe(TestConstants.Guid1);
  });

  it(testName('validateSecureTokenLogic: should reject expired token'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() - 1000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain(TestConstants.Expired);
  });

  it(testName('validateSecureTokenLogic: should reject token with invalid signature'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(false),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.InvalidSignature,
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe(TestConstants.InvalidSignatureError);
  });

  it(testName('should detect replay attack'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn().mockResolvedValue({
        value: JSON.stringify({
          status: TestConstants.Used,
          walletId: TestConstants.WalletId1,
          userId: TestConstants.UserId1,
          guid: TestConstants.Guid1,
          action: TokenAction.Download,
          createdAt: Date.now(),
          usedAt: Date.now(),
        }),
        metadata: null,
      }),
      put: vi.fn(),
    };

    const mockAnalytics: SecureTokenAnalytics = {
      writeDataPoint: vi.fn(),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const logSecurityEvent = vi.fn().mockResolvedValue(undefined);

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: mockKv,
      analytics: mockAnalytics,
      logSecurityEvent,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe(TestConstants.ReplayAttack);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: TestConstants.NonceReplayAttempt,
        walletId: TestConstants.WalletId1,
        nonce: TestConstants.Nonce123,
      })
    );
  });

  it(testName('should reject token when secret is not configured'), async () => {
    const result = await validateSecureTokenLogic({
      token: 'test-token',
      secret: TestConstants.EmptySecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn(),
      crypto: {} as SecureTokenCrypto,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Server configuration error');
  });

  it(testName('should reject token with missing signature'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn(),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Missing signature in token');
  });

  it(testName('should reject token with wallet ID mismatch'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => 'different-wallet',
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Wallet ID mismatch');
  });

  it(testName('should log warning on IP hash mismatch'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const logWarning = vi.fn();

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue('different-hash'),
      crypto: mockCrypto,
      logWarning,
    });

    expect(result.valid).toBe(true);
    expect(logWarning).toHaveBeenCalledWith('IP hash mismatch', expect.any(Object));
  });

  it(testName('should validate token without KV storage'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const logWarning = vi.fn();

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      logWarning,
    });

    expect(result.valid).toBe(true);
    expect(logWarning).toHaveBeenCalledWith('MANIFEST_CACHE_KV not configured - replay protection disabled', {});
  });

  it(testName('should reject token with nonce data mismatch'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn().mockResolvedValue({
        value: JSON.stringify({
          status: TestConstants.Pending,
          walletId: 'different-wallet',
          userId: TestConstants.UserId1,
          guid: TestConstants.Guid1,
          action: TokenAction.Download,
          createdAt: Date.now(),
        }),
        metadata: null,
      }),
      put: vi.fn(),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: mockKv,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nonce data mismatch');
  });

  it(testName('should reject token when nonce is missing'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn().mockResolvedValue({
        value: null,
        metadata: null,
      }),
      put: vi.fn(),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: mockKv,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token already used or expired (nonce missing)');
  });

  it(testName('should detect nonce race condition'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    // Use a fixed timestamp from the past that will never match the function's Date.now()
    // This simulates a race condition where another process updated the nonce with a different timestamp
    const differentTimestamp = 1000000000000; // Jan 2001 - definitely different from current time
    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn()
        .mockResolvedValueOnce({
          value: JSON.stringify({
            status: TestConstants.Pending,
            walletId: TestConstants.WalletId1,
            userId: TestConstants.UserId1,
            guid: TestConstants.Guid1,
            action: TokenAction.Download,
            createdAt: Date.now(),
          }),
          metadata: null,
        })
        .mockResolvedValueOnce({
          // Second read returns a different timestamp than what the function wrote,
          // simulating another process winning the race
          value: JSON.stringify({
            status: TestConstants.Used,
            walletId: TestConstants.WalletId1,
            userId: TestConstants.UserId1,
            guid: TestConstants.Guid1,
            action: TokenAction.Download,
            createdAt: Date.now(),
            usedAt: differentTimestamp,
          }),
          metadata: null,
        }),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const logSecurityEvent = vi.fn().mockResolvedValue(undefined);

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: mockKv,
      logSecurityEvent,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Concurrent nonce usage detected');
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'NonceRaceDetected',
      })
    );
  });

  it(testName('should handle nonce check failure'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn().mockRejectedValue(new Error('KV error')),
      put: vi.fn(),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const logWarning = vi.fn();

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: mockKv,
      logWarning,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nonce verification failed');
    expect(logWarning).toHaveBeenCalledWith('Nonce check failed', expect.any(Error));
  });

  it(testName('should use calculateKvExpirationTtl when provided'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    let savedTimestamp: number | undefined;
    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn()
        .mockResolvedValueOnce({
          value: JSON.stringify({
            status: TestConstants.Pending,
            walletId: TestConstants.WalletId1,
            userId: TestConstants.UserId1,
            guid: TestConstants.Guid1,
            action: TokenAction.Download,
            createdAt: Date.now(),
          }),
          metadata: null,
        })
        .mockImplementation(async () => {
          return {
            value: savedTimestamp
              ? JSON.stringify({
                  status: TestConstants.Used,
                  walletId: TestConstants.WalletId1,
                  userId: TestConstants.UserId1,
                  guid: TestConstants.Guid1,
                  action: TokenAction.Download,
                  createdAt: Date.now(),
                  usedAt: savedTimestamp,
                })
              : null,
            metadata: null,
          };
        }),
      put: vi.fn().mockImplementation(async (key, value) => {
        const data = JSON.parse(value);
        savedTimestamp = data.usedAt;
      }),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const calculateKvExpirationTtl = vi.fn().mockReturnValue(1800);

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: mockKv,
      calculateKvExpirationTtl,
    });

    expect(result.valid).toBe(true);
    expect(calculateKvExpirationTtl).toHaveBeenCalled();
    expect(mockKv.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        expirationTtl: 1800,
      })
    );
  });

  it(testName('should log security event on successful validation'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    let savedTimestamp: number | undefined;
    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn()
        .mockResolvedValueOnce({
          value: JSON.stringify({
            status: TestConstants.Pending,
            walletId: TestConstants.WalletId1,
            userId: TestConstants.UserId1,
            guid: TestConstants.Guid1,
            action: TokenAction.Download,
            createdAt: Date.now(),
          }),
          metadata: null,
        })
        .mockImplementation(async () => {
          return {
            value: savedTimestamp
              ? JSON.stringify({
                  status: TestConstants.Used,
                  walletId: TestConstants.WalletId1,
                  userId: TestConstants.UserId1,
                  guid: TestConstants.Guid1,
                  action: TokenAction.Download,
                  createdAt: Date.now(),
                  usedAt: savedTimestamp,
                })
              : null,
            metadata: null,
          };
        }),
      put: vi.fn().mockImplementation(async (key, value) => {
        const data = JSON.parse(value);
        savedTimestamp = data.usedAt;
      }),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const logSecurityEvent = vi.fn().mockResolvedValue(undefined);

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: mockKv,
      logSecurityEvent,
    });

    expect(result.valid).toBe(true);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'TokenValidated',
        walletId: TestConstants.WalletId1,
        userId: TestConstants.UserId1,
      })
    );
  });

  it(testName('should handle validation errors in catch block'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockRejectedValue(new Error('Crypto error')),
      sign: vi.fn(),
      verify: vi.fn(),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Token validation failed');
    expect(result.error).toContain('Crypto error');
  });

  it(testName('should handle non-Error in catch block'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockRejectedValue('String error'),
      sign: vi.fn(),
      verify: vi.fn(),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Token validation failed');
    expect(result.error).toContain('Unknown error');
  });

  it(testName('should handle generateSecureTokenLogic errors in catch block'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockRejectedValue(new Error('Crypto error')),
      sign: vi.fn(),
      verify: vi.fn(),
    };

    const result = await generateSecureTokenLogic({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      secret: TestConstants.TestSecret,
      ttlSeconds: TestConstants.TtlSeconds3600,
      getClientIp: () => TestConstants.ClientIp,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      generateNonce: () => TestConstants.Nonce123,
      crypto: mockCrypto,
      kv: {
        getWithMetadata: vi.fn(),
        put: vi.fn(),
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Crypto error');
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should validate valid simple token'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const token = btoa(JSON.stringify({
      matchId: TestConstants.MatchId1,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSimpleTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      expectedMatchId: TestConstants.MatchId1,
      crypto: mockCrypto,
      hexToBytes: (hex: string) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      },
    });

    expect(result.success).toBe(true);
  });

  it(testName('should reject when secret is not configured'), async () => {
    const result = await validateSimpleTokenLogic({
      token: 'test-token',
      secret: TestConstants.EmptySecret,
      expectedMatchId: TestConstants.MatchId1,
      crypto: {} as SecureTokenCrypto,
      hexToBytes: vi.fn(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Signed URL secret not configured');
  });

  it(testName('validateSimpleTokenLogic: should reject expired token'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const token = btoa(JSON.stringify({
      matchId: TestConstants.MatchId1,
      expiresAt: Date.now() - 1000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSimpleTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      expectedMatchId: TestConstants.MatchId1,
      crypto: mockCrypto,
      hexToBytes: vi.fn(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.SignedUrlExpired);
  });

  it(testName('should accept token without expiresAt'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const token = btoa(JSON.stringify({
      matchId: TestConstants.MatchId1,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSimpleTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      expectedMatchId: TestConstants.MatchId1,
      crypto: mockCrypto,
      hexToBytes: (hex: string) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      },
    });

    expect(result.success).toBe(true);
  });

  it(testName('validateSimpleTokenLogic: should reject token with invalid signature'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(false),
    };

    const token = btoa(JSON.stringify({
      matchId: TestConstants.MatchId1,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.InvalidSignature,
    }));

    const result = await validateSimpleTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      expectedMatchId: TestConstants.MatchId1,
      crypto: mockCrypto,
      hexToBytes: (hex: string) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid signed URL token');
  });

  it(testName('should reject token with mismatched matchId'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const token = btoa(JSON.stringify({
      matchId: TestConstants.MatchId1,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSimpleTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      expectedMatchId: TestConstants.MatchId2,
      crypto: mockCrypto,
      hexToBytes: (hex: string) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.TokenMatchIdMismatch);
  });

  it(testName('should reject invalid token format'), async () => {
    const result = await validateSimpleTokenLogic({
      token: 'invalid-token',
      secret: TestConstants.TestSecret,
      expectedMatchId: TestConstants.MatchId1,
      crypto: {
        importKey: vi.fn(),
        sign: vi.fn(),
        verify: vi.fn(),
      },
      hexToBytes: vi.fn(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid signed URL token format');
  });

  it(testName('should handle non-Error in catch block for validateSimpleTokenLogic'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockRejectedValue('String error'),
      sign: vi.fn(),
      verify: vi.fn(),
    };

    const token = btoa(JSON.stringify({
      matchId: TestConstants.MatchId1,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const result = await validateSimpleTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      expectedMatchId: TestConstants.MatchId1,
      crypto: mockCrypto,
      hexToBytes: (hex: string) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid signed URL token format');
    expect(result.error).toContain('String error');
  });

  it(testName('should handle signature that does not match regex pattern'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(false),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: 'x',
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: {
        getWithMetadata: vi.fn(),
        put: vi.fn(),
      },
    });

    expect(result.valid).toBe(false);
  });

  it(testName('should handle signature with empty match result using fallback'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(false),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: ' ',
    }));

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: {
        getWithMetadata: vi.fn(),
        put: vi.fn(),
      },
    });

    expect(result.valid).toBe(false);
  });

  it(testName('should handle verify.value being null in concurrent nonce check'), async () => {
    const mockCrypto: SecureTokenCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };

    const mockKv: SecureTokenKV = {
      getWithMetadata: vi.fn()
        .mockResolvedValueOnce({
          value: JSON.stringify({
            status: TestConstants.Pending,
            walletId: TestConstants.WalletId1,
            userId: TestConstants.UserId1,
            guid: TestConstants.Guid1,
            action: TokenAction.Download,
            createdAt: Date.now(),
          }),
          metadata: null,
        })
        .mockResolvedValueOnce({
          value: null,
          metadata: null,
        }),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const token = btoa(JSON.stringify({
      walletId: TestConstants.WalletId1,
      userId: TestConstants.UserId1,
      guid: TestConstants.Guid1,
      path: TestConstants.Path1,
      action: TokenAction.Download,
      nonce: TestConstants.Nonce123,
      ipHash: TestConstants.HashedIp,
      expiresAt: Date.now() + 3600000,
      signature: TestConstants.TestSignature,
    }));

    const logSecurityEvent = vi.fn().mockResolvedValue(undefined);

    const result = await validateSecureTokenLogic({
      token,
      secret: TestConstants.TestSecret,
      getClientIp: () => TestConstants.ClientIp,
      getWalletId: () => null,
      hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
      crypto: mockCrypto,
      kv: mockKv,
      logSecurityEvent,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Concurrent nonce usage detected');
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'NonceRaceDetected',
      })
    );
  });
});
