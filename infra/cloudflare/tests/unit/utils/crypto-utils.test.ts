import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { formatHashHex, computeSha256 } from '@/utils/crypto-utils';
import { HashPrefix } from '@/constants/crypto';
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

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('formatHashHex: formats hex with default prefix'), () => {
    logInfo('[TEST] Testing formatHashHex', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const hex = 'abcdef1234567890';
    const result = formatHashHex(hex);
    expect(result).toBe(`${HashPrefix.Sha256}${hex}`);
    if (result !== `${HashPrefix.Sha256}${hex}`) {
      logError('[TEST] Hash hex formatting failed', getStackTrace(), { result, expected: `${HashPrefix.Sha256}${hex}` });
    }
    logInfo('[TEST] formatHashHex validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('formatHashHex: formats hex with custom prefix'), () => {
    const hex = 'abcdef1234567890';
    const customPrefix = 'custom:';
    const result = formatHashHex(hex, customPrefix);
    expect(result).toBe(`${customPrefix}${hex}`);
  });

  it(testName('formatHashHex: formats empty hex string'), () => {
    const result = formatHashHex('');
    expect(result).toBe(`${HashPrefix.Sha256}`);
  });

  it(testName('computeSha256: computes SHA256 hash with prefix for string input'), async () => {
    const data = 'test data';
    const result = await computeSha256(data);
    expect(result).toMatch(/^sha256:[a-f0-9]{64}$/i);
    expect(result).toContain(HashPrefix.Sha256);
  });

  it(testName('computeSha256: computes hash without prefix when includePrefix is false'), async () => {
    const data = 'test data';
    const result = await computeSha256(data, false);
    expect(result).toMatch(/^[a-f0-9]{64}$/i);
    expect(result).not.toContain(HashPrefix.Sha256);
  });

  it(testName('computeSha256: computes hash for ArrayBuffer input'), async () => {
    const data = new TextEncoder().encode('test data').buffer as ArrayBuffer;
    const result = await computeSha256(data);
    expect(result).toMatch(/^sha256:[a-f0-9]{64}$/i);
  });

  it(testName('computeSha256: computes hash for Uint8Array input'), async () => {
    const data = new TextEncoder().encode('test data');
    const result = await computeSha256(data);
    expect(result).toMatch(/^sha256:[a-f0-9]{64}$/i);
  });

  it(testName('computeSha256: produces same hash for same input'), async () => {
    const data = 'test data';
    const result1 = await computeSha256(data);
    const result2 = await computeSha256(data);
    expect(result1).toBe(result2);
    if (result1 !== result2) {
      logError('[TEST] SHA256 hash not deterministic', getStackTrace(), { result1, result2 });
    }
  });

  it(testName('computeSha256: produces different hashes for different inputs'), async () => {
    const result1 = await computeSha256('data1');
    const result2 = await computeSha256('data2');
    expect(result1).not.toBe(result2);
  });

  it(testName('computeSha256: computes hash for empty string'), async () => {
    const result = await computeSha256('');
    expect(result).toMatch(/^sha256:[a-f0-9]{64}$/i);
  });

  it(testName('computeSha256: produces deterministic hash (known test vector)'), async () => {
    const data = '';
    const result = await computeSha256(data, false);
    const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(result).toBe(expected);
  });
});
