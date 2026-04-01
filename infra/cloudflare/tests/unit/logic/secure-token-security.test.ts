import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  generateSecureTokenLogic,
  validateSecureTokenLogic,
  type SecureTokenCrypto,
  type SecureTokenKV,
} from '@/logic/secure-token';
import { TokenAction } from '@/constants/token-actions';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

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
  WalletId2: 'wallet2',
  UserId1: 'user1',
  Guid1: 'guid1',
  Guid2: 'guid2',
  Path1: 'path1',
  TestSecret: 'test-secret',
  TtlSeconds3600: 3600,
  Nonce123: 'nonce-123',
  HashedIp: 'hashed-ip',
  HashedIp127: 'hashed-ip-127.0.0.1',
  ClientIp: '127.0.0.1',
  TestSignature: 'test-signature',
  TamperedSignature: 'tampered-signature',
  Used: 'used',
  Pending: 'pending',
  ReplayAttack: 'Token already used (replay attack detected)',
  ConcurrentNonceUsage: 'Concurrent nonce usage detected',
  NonceMissing: 'Token already used or expired (nonce missing)',
  TokenExpired: 'Token expired',
  WalletIdMismatch: 'Wallet ID mismatch',
  NonceDataMismatch: 'Nonce data mismatch',
  InvalidSignature: 'Invalid signature',
  NonceReplayAttempt: 'NonceReplayAttempt',
  NonceRaceDetected: 'NonceRaceDetected',
  Signature: 'signature',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('replay attack protection: rejects token with used nonce'), async () => {
    logInfo('[TEST] Testing replay attack protection', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    if (!TestConstants.WalletId1 || !TestConstants.TestSecret) {
      logError('[TEST] Missing test constants for replay attack test', getStackTrace(), { hasWalletId: !!TestConstants.WalletId1, hasSecret: !!TestConstants.TestSecret });
    }
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
            usedAt: Date.now() - 1000,
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
      expect(result.error).toBe(TestConstants.ReplayAttack);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: TestConstants.NonceReplayAttempt,
          nonce: TestConstants.Nonce123,
        })
      );
    });

  it(testName('replay attack protection: detects concurrent nonce usage race condition'), async () => {
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
        calculateKvExpirationTtl: () => TestConstants.TtlSeconds3600,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe(TestConstants.ConcurrentNonceUsage);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: TestConstants.NonceRaceDetected,
          nonce: TestConstants.Nonce123,
        })
      );
    });

  it(testName('replay attack protection: rejects token with missing nonce in KV'), async () => {
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
      expect(result.error).toBe(TestConstants.NonceMissing);
    });

  it(testName('token expiration security: rejects token that expired exactly at boundary'), async () => {
      const mockCrypto: SecureTokenCrypto = {
        importKey: vi.fn().mockResolvedValue({} as CryptoKey),
        sign: vi.fn(),
        verify: vi.fn().mockResolvedValue(true),
      };

      const expiredTime = Date.now() - 1;
      const token = btoa(JSON.stringify({
        walletId: TestConstants.WalletId1,
        userId: TestConstants.UserId1,
        guid: TestConstants.Guid1,
        path: TestConstants.Path1,
        action: TokenAction.Download,
        nonce: TestConstants.Nonce123,
        ipHash: TestConstants.HashedIp,
        expiresAt: expiredTime,
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
      expect(result.error).toBe(TestConstants.TokenExpired);
    });

  it(testName('token expiration security: accepts token with far future expiration within allowed bounds'), async () => {
      const mockCrypto: SecureTokenCrypto = {
        importKey: vi.fn().mockResolvedValue({} as CryptoKey),
        sign: vi.fn(),
        verify: vi.fn().mockResolvedValue(true),
      };

      const farFuture = Date.now() + (365 * 24 * 60 * 60 * 1000);
      const token = btoa(JSON.stringify({
        walletId: TestConstants.WalletId1,
        userId: TestConstants.UserId1,
        guid: TestConstants.Guid1,
        path: TestConstants.Path1,
        action: TokenAction.Download,
        nonce: TestConstants.Nonce123,
        ipHash: TestConstants.HashedIp,
        expiresAt: farFuture,
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

      expect(result.valid).toBe(true);
  });

  it(testName('Rule 15.3.3: clock skew abuse - validate with getNow past expiresAt returns Token expired'), async () => {
      const mockCrypto: SecureTokenCrypto = {
        importKey: vi.fn().mockResolvedValue({} as CryptoKey),
        sign: vi.fn(),
        verify: vi.fn().mockResolvedValue(true),
      };

      const expiresAt = 10000;
      const token = btoa(JSON.stringify({
        walletId: TestConstants.WalletId1,
        userId: TestConstants.UserId1,
        guid: TestConstants.Guid1,
        path: TestConstants.Path1,
        action: TokenAction.Download,
        nonce: TestConstants.Nonce123,
        ipHash: TestConstants.HashedIp,
        expiresAt,
        signature: TestConstants.TestSignature,
      }));

      const result = await validateSecureTokenLogic({
        token,
        secret: TestConstants.TestSecret,
        getClientIp: () => TestConstants.ClientIp,
        getWalletId: () => null,
        hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
        crypto: mockCrypto,
        getNow: () => expiresAt + 1,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe(TestConstants.TokenExpired);
  });

  it(testName('Rule 15.3.4: replay just before expiry - valid at T-1ms, expired at T+1ms'), async () => {
      const mockCrypto: SecureTokenCrypto = {
        importKey: vi.fn().mockResolvedValue({} as CryptoKey),
        sign: vi.fn(),
        verify: vi.fn().mockResolvedValue(true),
      };

      const T = 20000;
      const token = btoa(JSON.stringify({
        walletId: TestConstants.WalletId1,
        userId: TestConstants.UserId1,
        guid: TestConstants.Guid1,
        path: TestConstants.Path1,
        action: TokenAction.Download,
        nonce: TestConstants.Nonce123,
        ipHash: TestConstants.HashedIp,
        expiresAt: T,
        signature: TestConstants.TestSignature,
      }));

      const validResult = await validateSecureTokenLogic({
        token,
        secret: TestConstants.TestSecret,
        getClientIp: () => TestConstants.ClientIp,
        getWalletId: () => null,
        hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
        crypto: mockCrypto,
        getNow: () => T - 1,
      });
      expect(validResult.valid).toBe(true);

      const expiredResult = await validateSecureTokenLogic({
        token,
        secret: TestConstants.TestSecret,
        getClientIp: () => TestConstants.ClientIp,
        getWalletId: () => null,
        hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
        crypto: mockCrypto,
        getNow: () => T + 1,
      });
      expect(expiredResult.valid).toBe(false);
      expect(expiredResult.error).toBe(TestConstants.TokenExpired);
  });

  it(testName('Rule 15.3.5: race at boundary T - consistent behavior when getNow returns exactly T'), async () => {
      const mockCrypto: SecureTokenCrypto = {
        importKey: vi.fn().mockResolvedValue({} as CryptoKey),
        sign: vi.fn(),
        verify: vi.fn().mockResolvedValue(true),
      };

      const T = 30000;
      const token = btoa(JSON.stringify({
        walletId: TestConstants.WalletId1,
        userId: TestConstants.UserId1,
        guid: TestConstants.Guid1,
        path: TestConstants.Path1,
        action: TokenAction.Download,
        nonce: TestConstants.Nonce123,
        ipHash: TestConstants.HashedIp,
        expiresAt: T,
        signature: TestConstants.TestSignature,
      }));

      const result = await validateSecureTokenLogic({
        token,
        secret: TestConstants.TestSecret,
        getClientIp: () => TestConstants.ClientIp,
        getWalletId: () => null,
        hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
        crypto: mockCrypto,
        getNow: () => T,
      });
      expect(result.valid).toBe(true);
  });

  it(testName('validateSecureTokenLogic: wallet ID validation rejects token when wallet ID mismatch'), async () => {
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
        getWalletId: () => TestConstants.WalletId2,
        hashString: vi.fn().mockResolvedValue(TestConstants.HashedIp),
        crypto: mockCrypto,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe(TestConstants.WalletIdMismatch);
  });

  it(testName('validateSecureTokenLogic: nonce data integrity rejects token when nonce walletId mismatch'), async () => {
      const mockCrypto: SecureTokenCrypto = {
        importKey: vi.fn().mockResolvedValue({} as CryptoKey),
        sign: vi.fn(),
        verify: vi.fn().mockResolvedValue(true),
      };

      const mockKv: SecureTokenKV = {
        getWithMetadata: vi.fn().mockResolvedValue({
          value: JSON.stringify({
            status: TestConstants.Pending,
            walletId: TestConstants.WalletId2,
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
      expect(result.error).toBe(TestConstants.NonceDataMismatch);
  });

  it(testName('validateSecureTokenLogic: nonce data integrity rejects token when nonce guid mismatch'), async () => {
      const mockCrypto: SecureTokenCrypto = {
        importKey: vi.fn().mockResolvedValue({} as CryptoKey),
        sign: vi.fn(),
        verify: vi.fn().mockResolvedValue(true),
      };

      const mockKv: SecureTokenKV = {
        getWithMetadata: vi.fn().mockResolvedValue({
          value: JSON.stringify({
            status: TestConstants.Pending,
            walletId: TestConstants.WalletId1,
            userId: TestConstants.UserId1,
            guid: TestConstants.Guid2,
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
      expect(result.error).toBe(TestConstants.NonceDataMismatch);
  });

  it(testName('validateSecureTokenLogic: signature validation security rejects token with tampered signature'), async () => {
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
        signature: TestConstants.TamperedSignature,
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
      expect(result.error).toBe(TestConstants.InvalidSignature);
  });

  it(testName('validateSecureTokenLogic: signature validation security rejects token with missing signature'), async () => {
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
      expect(result.error).toContain(TestConstants.Signature);
  });

  it(testName('generateSecureTokenLogic: token generation security generates unique nonces for each token'), async () => {
      const mockCrypto: SecureTokenCrypto = {
        importKey: vi.fn().mockResolvedValue({} as CryptoKey),
        sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        verify: vi.fn(),
      };

      const nonces = new Set<string>();

      for (let i = 0; i < 10; i++) {
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
          generateNonce: () => crypto.randomUUID(),
          crypto: mockCrypto,
        });

        expect(result.success).toBe(true);
        expect(result.nonce).toBeTypeOf('string');
        expect(result.nonce?.length).toBeGreaterThan(0);
        nonces.add(result.nonce!);
      }

      expect(nonces.size).toBe(10);
  });

  it(testName('generateSecureTokenLogic: token generation security includes IP hash in token to prevent IP spoofing'), async () => {
      const mockCrypto: SecureTokenCrypto = {
        importKey: vi.fn().mockResolvedValue({} as CryptoKey),
        sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        verify: vi.fn(),
      };

      const hashString = vi.fn().mockResolvedValue(TestConstants.HashedIp127);

      const result = await generateSecureTokenLogic({
        walletId: TestConstants.WalletId1,
        userId: TestConstants.UserId1,
        guid: TestConstants.Guid1,
        path: TestConstants.Path1,
        action: TokenAction.Download,
        secret: TestConstants.TestSecret,
        ttlSeconds: TestConstants.TtlSeconds3600,
        getClientIp: () => TestConstants.ClientIp,
        hashString,
        generateNonce: () => TestConstants.Nonce123,
        crypto: mockCrypto,
      });

      expect(result.success).toBe(true);
      expect(hashString).toHaveBeenCalledWith(TestConstants.ClientIp);
  });
});
