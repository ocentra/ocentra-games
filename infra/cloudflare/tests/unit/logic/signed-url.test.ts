import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  generateSignedUrlLogic,
  type SignedUrlCrypto,
} from '@/logic/signed-url';
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
  MatchId1: asMatchId('550e8400-e29b-41d4-a716-446655440003'),
  MatchId2: asMatchId('550e8400-e29b-41d4-a716-446655440004'),
  TestSecret: 'test-secret',
  EmptySecret: '',
  BaseUrl: 'https://example.com/api/signed-url/match1',
  ExpiresIn3600: 3600,
  ExpiresIn100000: 100000,
  MaxExpiration86400: 86400,
  SecretNotConfigured: 'Signed URL secret not configured',
  CryptoError: 'Crypto error',
  Token: 'token',
  ApiMatchesMatch1: '/api/v1/matches/550e8400-e29b-41d4-a716-446655440003',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('should generate signed URL successfully'), async () => {
    logInfo('[TEST] Testing generateSignedUrlLogic', getStackTrace(), { matchId: TestConstants.MatchId1 }, LOG_TEST_OPERATIONS);
    const mockCrypto: SignedUrlCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
    };

    const result = await generateSignedUrlLogic(
      {
        matchId: TestConstants.MatchId1,
        secret: TestConstants.TestSecret,
        baseUrl: TestConstants.BaseUrl,
        expiresIn: TestConstants.ExpiresIn3600,
        maxExpiration: TestConstants.MaxExpiration86400,
      },
      mockCrypto
    );

    logInfo('[TEST] generateSignedUrlLogic result', getStackTrace(), { success: result.success, matchId: result.matchId }, LOG_TEST_OPERATIONS);
    expect(result.success).toBe(true);
    expect(result.matchId).toBe(TestConstants.MatchId1);
    expect(result.signedUrl).toBeTypeOf('string');
    expect(result.signedUrl).toContain(`/api/v1/matches/${TestConstants.MatchId1}`);
    expect(result.signedUrl).toContain(`${TestConstants.Token}=`);
    expect(result.expiresIn).toBe(TestConstants.ExpiresIn3600);
    expect(result.expiresAt).toBeTypeOf('string');
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (!result.success || result.matchId !== TestConstants.MatchId1 || !result.signedUrl || !result.signedUrl.includes(TestConstants.ApiMatchesMatch1)) {
      logError('[TEST] Signed URL generation failed or invalid', getStackTrace(), { success: result.success, matchId: result.matchId, hasSignedUrl: !!result.signedUrl });
    }

    expect(mockCrypto.importKey).toHaveBeenCalled();
    expect(mockCrypto.sign).toHaveBeenCalled();
  });

  it(testName('should cap expiration at maxExpiration'), async () => {
    const mockCrypto: SignedUrlCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
    };

    const result = await generateSignedUrlLogic(
      {
        matchId: TestConstants.MatchId1,
        secret: TestConstants.TestSecret,
        baseUrl: TestConstants.BaseUrl,
        expiresIn: TestConstants.ExpiresIn100000,
        maxExpiration: TestConstants.MaxExpiration86400,
      },
      mockCrypto
    );

    expect(result.success).toBe(true);
    expect(result.expiresIn).toBe(TestConstants.MaxExpiration86400);
  });

  it(testName('should return error when secret not configured'), async () => {
    const mockCrypto: SignedUrlCrypto = {
      importKey: vi.fn(),
      sign: vi.fn(),
    };

    const result = await generateSignedUrlLogic(
      {
        matchId: TestConstants.MatchId1,
        secret: TestConstants.EmptySecret,
        baseUrl: TestConstants.BaseUrl,
        expiresIn: TestConstants.ExpiresIn3600,
        maxExpiration: TestConstants.MaxExpiration86400,
      },
      mockCrypto
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.SecretNotConfigured);
    expect(mockCrypto.importKey).not.toHaveBeenCalled();
  });

  it(testName('should handle crypto errors'), async () => {
    const mockCrypto: SignedUrlCrypto = {
      importKey: vi.fn().mockRejectedValue(new Error(TestConstants.CryptoError)),
      sign: vi.fn(),
    };

    const result = await generateSignedUrlLogic(
      {
        matchId: TestConstants.MatchId1,
        secret: TestConstants.TestSecret,
        baseUrl: TestConstants.BaseUrl,
        expiresIn: TestConstants.ExpiresIn3600,
        maxExpiration: TestConstants.MaxExpiration86400,
      },
      mockCrypto
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.CryptoError}`);
  });

  it(testName('should include token in signed URL'), async () => {
    const mockCrypto: SignedUrlCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
    };

    const result = await generateSignedUrlLogic(
      {
        matchId: TestConstants.MatchId1,
        secret: TestConstants.TestSecret,
        baseUrl: TestConstants.BaseUrl,
        expiresIn: TestConstants.ExpiresIn3600,
        maxExpiration: TestConstants.MaxExpiration86400,
      },
      mockCrypto
    );

    expect(result.success).toBe(true);
    const url = new URL(result.signedUrl!);
    expect(url.searchParams.has(TestConstants.Token)).toBe(true);
    const token = url.searchParams.get(TestConstants.Token);
    expect(token).toBeTypeOf('string');
    if (token) {
      expect(token.length).toBeGreaterThan(0);
    }
  });

  it(testName('should set correct pathname in signed URL'), async () => {
    const mockCrypto: SignedUrlCrypto = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
    };

    const result = await generateSignedUrlLogic(
      {
        matchId: TestConstants.MatchId1,
        secret: TestConstants.TestSecret,
        baseUrl: TestConstants.BaseUrl,
        expiresIn: TestConstants.ExpiresIn3600,
        maxExpiration: TestConstants.MaxExpiration86400,
      },
      mockCrypto
    );

    expect(result.success).toBe(true);
    const url = new URL(result.signedUrl!);
    expect(url.pathname).toBe(`/api/v1/matches/${TestConstants.MatchId1}`);
  });
});
