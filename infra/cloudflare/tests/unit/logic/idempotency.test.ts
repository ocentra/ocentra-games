import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi, beforeEach } from 'vitest';
import {
  checkIdempotencyKey,
  storeIdempotencyResult,
  type IdempotencyKV,
} from '@/logic/idempotency';
import { RateLimitPrefix } from '@/constants/rate-limit';
import { TimeInSeconds } from '@/constants/time';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { asIdempotencyKey, IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';

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
  UserId1: 'user1',
  Key1: 'key1',
  Tx1: 'tx1',
  KVError: 'KV error',
  InvalidJson: 'invalid json',
  TestResult: 'test',
  CustomTtl: 3600,
  Whitespace: '   ',
} as const;

const suiteName = extractName(import.meta.url);

describe(`${suiteName} - checkIdempotencyKey`, TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  let mockKV: IdempotencyKV;

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
    };
  });

  it(testName('should return null when KV is not provided'), async () => {
    logInfo('[TEST] Testing idempotency without KV', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const validKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    const result = await checkIdempotencyKey(undefined, TestConstants.UserId1, validKey);
    expect(result).toBeNull();
    expect(mockKV.get).not.toHaveBeenCalled();
    logInfo('[TEST] Idempotency test completed', getStackTrace(), { result: result === null }, LOG_TEST_OPERATIONS);
  });

  it(testName('should return null when idempotency key is empty'), async () => {
    let invalidKey: ReturnType<typeof asIdempotencyKey>;
    try {
      invalidKey = asIdempotencyKey('');
      const result = await checkIdempotencyKey(mockKV, TestConstants.UserId1, invalidKey);
      expect(result).toBeNull();
      expect(mockKV.get).not.toHaveBeenCalled();
    } catch {
      expect(mockKV.get).not.toHaveBeenCalled();
    }
  });

  it(testName('should return null when idempotency key is whitespace only'), async () => {
    let invalidKey: ReturnType<typeof asIdempotencyKey>;
    try {
      invalidKey = asIdempotencyKey(TestConstants.Whitespace);
      const result = await checkIdempotencyKey(mockKV, TestConstants.UserId1, invalidKey);
      expect(result).toBeNull();
      expect(mockKV.get).not.toHaveBeenCalled();
    } catch {
      expect(mockKV.get).not.toHaveBeenCalled();
    }
  });

  it(testName('should return cached result when key exists'), async () => {
    const validKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    const cachedResult = { success: true, transaction_id: TestConstants.Tx1, new_balance: 100 };
    mockKV.get = vi.fn().mockResolvedValue(JSON.stringify(cachedResult));

    const result = await checkIdempotencyKey(mockKV, TestConstants.UserId1, validKey);

    expect(result).not.toBeNull();
    expect(result?.cached).toBe(true);
    expect(result?.result).toEqual(cachedResult);
    if (!result || !result.cached || result.result !== cachedResult) {
      logError('[TEST] Idempotency cache check failed', getStackTrace(), { result, expectedCached: true });
    }
    expect(mockKV.get).toHaveBeenCalledWith(`${RateLimitPrefix.Idempotency}${TestConstants.UserId1}:${validKey}`);
  });

  it(testName('should return null when key does not exist'), async () => {
    const validKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    mockKV.get = vi.fn().mockResolvedValue(null);

    const result = await checkIdempotencyKey(mockKV, TestConstants.UserId1, validKey);

    expect(result).toBeNull();
    expect(mockKV.get).toHaveBeenCalledWith(`${RateLimitPrefix.Idempotency}${TestConstants.UserId1}:${validKey}`);
  });

  it(testName('should return null when KV get throws error'), async () => {
    const validKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    mockKV.get = vi.fn().mockRejectedValue(new Error(TestConstants.KVError));

    const result = await checkIdempotencyKey(mockKV, TestConstants.UserId1, validKey);

    expect(result).toBeNull();
  });

  it(testName('should return null when cached value is invalid JSON'), async () => {
    const validKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    mockKV.get = vi.fn().mockResolvedValue(TestConstants.InvalidJson);

    const result = await checkIdempotencyKey(mockKV, TestConstants.UserId1, validKey);

    expect(result).toBeNull();
  });
});

describe(`${suiteName} - storeIdempotencyResult`, TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  let mockKV: IdempotencyKV;

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };
  });

  it(testName('should not store when KV is not provided'), async () => {
    const validKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    await storeIdempotencyResult(undefined, TestConstants.UserId1, validKey, { result: TestConstants.TestResult });
    expect(mockKV.put).not.toHaveBeenCalled();
  });

  it(testName('should not store when idempotency key is empty'), async () => {
    try {
      const invalidKey = asIdempotencyKey('');
      await storeIdempotencyResult(mockKV, TestConstants.UserId1, invalidKey, { result: TestConstants.TestResult });
      expect(mockKV.put).not.toHaveBeenCalled();
    } catch {
      expect(mockKV.put).not.toHaveBeenCalled();
    }
  });

  it(testName('should not store when idempotency key is whitespace only'), async () => {
    try {
      const invalidKey = asIdempotencyKey(TestConstants.Whitespace);
      await storeIdempotencyResult(mockKV, TestConstants.UserId1, invalidKey, { result: TestConstants.TestResult });
      expect(mockKV.put).not.toHaveBeenCalled();
    } catch {
      expect(mockKV.put).not.toHaveBeenCalled();
    }
  });

  it(testName('should store result with default TTL'), async () => {
    const validKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    const result = { success: true, transaction_id: TestConstants.Tx1, new_balance: 100 };

    await storeIdempotencyResult(mockKV, TestConstants.UserId1, validKey, result);

    expect(mockKV.put).toHaveBeenCalledWith(
      `${RateLimitPrefix.Idempotency}${TestConstants.UserId1}:${validKey}`,
      JSON.stringify(result),
      {
        expirationTtl: TimeInSeconds.Day,
      }
    );
  });

  it(testName('should store result with custom TTL'), async () => {
    const validKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    const result = { success: true, transaction_id: TestConstants.Tx1, new_balance: 100 };

    await storeIdempotencyResult(mockKV, TestConstants.UserId1, validKey, result, TestConstants.CustomTtl);

    expect(mockKV.put).toHaveBeenCalledWith(
      `${RateLimitPrefix.Idempotency}${TestConstants.UserId1}:${validKey}`,
      JSON.stringify(result),
      {
        expirationTtl: TestConstants.CustomTtl,
      }
    );
  });

  it(testName('should handle KV put errors silently'), async () => {
    const validKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    mockKV.put = vi.fn().mockRejectedValue(new Error(TestConstants.KVError));

    await storeIdempotencyResult(mockKV, TestConstants.UserId1, validKey, { result: TestConstants.TestResult });

    expect(mockKV.put).toHaveBeenCalled();
  });
});
