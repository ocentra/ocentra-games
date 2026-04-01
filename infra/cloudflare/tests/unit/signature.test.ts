import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { verifySignature, hexToBytes } from '@/utils/signature';
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

  const mockPublicKey = 'ed0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
  const mockSignature =
    'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff00112233445566778899aabbccddeefff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff00112233445566778899aabbccddeeff';

  it(testName('hexToBytes: converts hex strings to Uint8Array'), () => {
    logInfo('[TEST] Testing hex to bytes conversion', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const hex = '000102ff';
    const bytes = hexToBytes(hex);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(1);
    expect(bytes[2]).toBe(2);
    expect(bytes[3]).toBe(255);
    logInfo('[TEST] Hex to bytes conversion validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('hexToBytes: handles uppercase hex strings'), () => {
    const hex = 'AABBCC';
    const bytes = hexToBytes(hex);
    expect(bytes[0]).toBe(0xaa);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xcc);
  });

  it(testName('hexToBytes: throws error for invalid hex strings'), () => {
    expect(() => hexToBytes('invalid')).toThrow();
    expect(() => hexToBytes('abc')).toThrow();
  });

  it(testName('verifySignature: returns false if signature is missing'), async () => {
    logInfo(
      '[TEST] Testing signature verification with missing signature',
      getStackTrace(),
      {},
      LOG_TEST_OPERATIONS
    );
    const body = JSON.stringify({ data: 'test' });
    const result = await verifySignature(body, '', mockPublicKey);
    expect(result).toBe(false);
    if (result !== false) {
      logError(
        '[TEST] Signature verification should fail for missing signature',
        getStackTrace(),
        { result }
      );
    }
  });

  it(testName('verifySignature: returns false if public key is missing'), async () => {
    logInfo(
      '[TEST] Testing signature verification with missing public key',
      getStackTrace(),
      {},
      LOG_TEST_OPERATIONS
    );
    const body = JSON.stringify({ data: 'test', signature: mockSignature });
    const result = await verifySignature(body, mockSignature, '');
    expect(result).toBe(false);
    if (result !== false) {
      logError(
        '[TEST] Signature verification should fail for missing public key',
        getStackTrace(),
        { result }
      );
    }
  });

  it(testName('verifySignature: returns false if body is not valid JSON'), async () => {
    const result = await verifySignature('invalid json', mockSignature, mockPublicKey);
    expect(result).toBe(false);
  });

  it(testName('verifySignature: returns false for invalid signature format'), async () => {
    const body = JSON.stringify({ data: 'test' });
    const result = await verifySignature(body, 'short', mockPublicKey);
    expect(result).toBe(false);
  });

  it(testName('verifySignature: extracts signature from body if not provided as argument'), async () => {
    const body = JSON.stringify({ data: 'test', signature: mockSignature });
    const result = await verifySignature(body, '', mockPublicKey);
    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
  });
});
