import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { isValidGuid, isValidHash, normalizeHash, normalizeGuid, detectIdentifierType } from '@ocentra/endpoint-domain/utils/content-validation';
import { validateContentTypeMatchesContent, extractGuidFromAsset } from '@/utils/content-validation';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
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

  it(testName('isValidGuid: validates standard UUID v4'), () => {
    logInfo('[TEST] Testing GUID validation', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    expect(isValidGuid('58bf2b05-15ce-4870-9199-d295803a2d8c')).toBe(true);
    expect(isValidGuid('AAAAAAAA-BBBB-4CCC-9EEE-EEEEEEEEEEEE')).toBe(true);
    logInfo('[TEST] GUID validation validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('isValidGuid: rejects non-v4 or malformed UUIDs'), () => {
    logInfo('[TEST] Testing GUID validation with invalid formats', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const result1 = isValidGuid('not-a-uuid');
    const result2 = isValidGuid('58bf2b05-15ce-1870-9199-d295803a2d8c');
    const result3 = isValidGuid('');
    expect(result1).toBe(false);
    expect(result2).toBe(false);
    expect(result3).toBe(false);
    if (result1 !== false || result2 !== false || result3 !== false) {
      logError('[TEST] GUID validation failed to reject invalid formats', getStackTrace(), { result1, result2, result3 });
    }
  });

  it(testName('isValidGuid: rejects UUIDs with directory traversal or invalid characters'), () => {
    expect(isValidGuid('../58bf2b05-15ce-4870-9199-d295803a2d8c')).toBe(false);
    expect(isValidGuid('58bf2b05-15ce-4870-9199-d295803a2d8c/')).toBe(false);
  });

  it(testName('isValidHash: validates SHA-256 hex hashes'), () => {
    const validHash = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
    expect(isValidHash(validHash)).toBe(true);
    expect(isValidHash(validHash.toUpperCase())).toBe(true);
    expect(isValidHash('sha256:' + validHash)).toBe(true);
  });

  it(testName('isValidHash: rejects invalid hashes'), () => {
    expect(isValidHash('short')).toBe(false);
    expect(isValidHash('g'.repeat(64))).toBe(false);
    expect(isValidHash('')).toBe(false);
  });

  it(testName('normalizeHash: removes sha256: prefix and normalizes to lowercase'), () => {
    const hash = '5E884898DA28047151D0E56F8DC6292773603D0D6AABBDD62A11EF721D1542D8';
    const expected = hash.toLowerCase();
    expect(normalizeHash('sha256:' + hash)).toBe(expected);
    expect(normalizeHash(hash)).toBe(expected);
  });

  it(testName('normalizeHash: strips invisible characters'), () => {
    const hash = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
    const dirtyHash = '5e884898\u200Bda28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
    expect(normalizeHash(dirtyHash)).toBe(hash);
  });

  it(testName('normalizeGuid: normalizes and trims GUID'), () => {
    const guid = '58bf2b05-15ce-4870-9199-d295803a2d8c';
    expect(normalizeGuid(' ' + guid.toUpperCase() + ' ')).toBe(guid);
  });

  it(testName('detectIdentifierType: detects guid'), () => {
    expect(detectIdentifierType('58bf2b05-15ce-4870-9199-d295803a2d8c')).toBe('guid');
  });

  it(testName('detectIdentifierType: detects hash'), () => {
    expect(detectIdentifierType('5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8')).toBe('hash');
  });

  it(testName('detectIdentifierType: returns unknown for others'), () => {
    expect(detectIdentifierType('random-string')).toBe('unknown');
  });

  it(testName('validateContentTypeMatchesContent: validates PNG signature'), async () => {
    const pngBuffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
    const result = await validateContentTypeMatchesContent(pngBuffer, HttpContentType.ImagePng);
    expect(result.valid).toBe(true);
  });

  it(testName('validateContentTypeMatchesContent: rejects invalid PNG signature'), async () => {
    const fakeBuffer = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const result = await validateContentTypeMatchesContent(fakeBuffer, HttpContentType.ImagePng);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('mismatch');
  });

  it(testName('validateContentTypeMatchesContent: validates JSON content'), async () => {
    const jsonText = JSON.stringify({ test: true });
    const jsonBuffer = new TextEncoder().encode(jsonText);
    const result = await validateContentTypeMatchesContent(jsonBuffer, HttpContentType.ApplicationJson);
    expect(result.valid).toBe(true);
  });

  it(testName('validateContentTypeMatchesContent: rejects invalid JSON content'), async () => {
    const invalidJson = new TextEncoder().encode('{ invalid json }');
    const result = await validateContentTypeMatchesContent(invalidJson, HttpContentType.ApplicationJson);
    expect(result.valid).toBe(false);
  });

  it(testName('extractGuidFromAsset: extracts guid from valid asset JSON'), async () => {
    const guid = '58bf2b05-15ce-4870-9199-d295803a2d8c';
    const content = JSON.stringify({ system: { guid } });
    const extracted = await extractGuidFromAsset(content);
    expect(extracted).toBe(guid);
  });

  it(testName('extractGuidFromAsset: returns null for invalid JSON or missing guid'), async () => {
    expect(await extractGuidFromAsset('invalid')).toBe(null);
    expect(await extractGuidFromAsset('{}')).toBe(null);
    expect(await extractGuidFromAsset(JSON.stringify({ system: {} }))).toBe(null);
  });
});
