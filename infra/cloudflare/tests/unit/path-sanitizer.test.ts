import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { sanitizePathComponent } from '@ocentra/endpoint-domain/utils/path-sanitizer';
import { buildSafeBucketKey, buildMatchKey } from '@/utils/path-sanitizer';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { asMatchId } from '@ocentra/endpoint-domain/constants/match';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';

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

  it(testName('sanitizePathComponent: allows alphanumeric characters, underscores, and hyphens'), () => {
    logInfo('[TEST] Testing path sanitization with valid characters', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    expect(sanitizePathComponent('valid-name_123')).toBe('valid-name_123');
    logInfo('[TEST] Path sanitization validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('sanitizePathComponent: replaces invalid characters with underscores'), () => {
    expect(sanitizePathComponent('invalid@name!#')).toBe('invalid_name');
    expect(sanitizePathComponent('space name')).toBe('space_name');
    expect(sanitizePathComponent('path/to/file')).toBe('path_to_file');
  });

  it(testName('sanitizePathComponent: trims leading and trailing underscores'), () => {
    expect(sanitizePathComponent('__name__')).toBe('name');
    expect(sanitizePathComponent('___a_b_c___')).toBe('a_b_c');
  });

  it(testName('sanitizePathComponent: enforces maximum length'), () => {
    const longName = 'a'.repeat(300);
    const sanitized = sanitizePathComponent(longName);
    expect(sanitized.length).toBeLessThanOrEqual(255);
  });

  it(testName('sanitizePathComponent: throws error for empty component'), () => {
    logInfo('[TEST] Testing path sanitization error handling', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const sanitizeUnknown = sanitizePathComponent as unknown as (value: unknown) => string;
    expect(() => sanitizeUnknown('')).toThrow(ErrorMessage.PathComponentMustBeNonEmptyString);
    expect(() => sanitizeUnknown(null)).toThrow(ErrorMessage.PathComponentMustBeNonEmptyString);
    logInfo('[TEST] Error handling validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('sanitizePathComponent: throws error if sanitization results in empty string'), () => {
    expect(() => sanitizePathComponent('!!!')).toThrow(ErrorMessage.PathComponentBecameEmptyAfterSanitization);
  });

  it(testName('buildSafeBucketKey: builds a safe key from components'), () => {
    expect(buildSafeBucketKey('users', 'user-1', 'assets', 'image.png')).toBe('users/user-1/assets/image.png');
  });

  it(testName('buildSafeBucketKey: sanitizes each component'), () => {
    expect(buildSafeBucketKey('users', 'user@1', 'file.txt')).toBe('users/user_1/file.txt');
  });

  it(testName('buildMatchKey: builds a match key with match prefix'), () => {
    const matchId = asMatchId('550e8400-e29b-41d4-a716-446655440007');
    expect(buildMatchKey(matchId)).toBe(`matches/${matchId}.json`);
  });

  it(testName('buildMatchKey: sanitizes matchId'), () => {
    const matchId = asMatchId('550e8400-e29b-41d4-a716-446655440008');
    expect(buildMatchKey(matchId)).toBe(`matches/${matchId}.json`);
  });
});
