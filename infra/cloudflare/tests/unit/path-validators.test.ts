import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { PathValidator } from '@ocentra/endpoint-domain/validators/path-validators';
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

  it(testName('PathValidator.hasInvisibleChars: detects zero-width space (U+200B)'), () => {
    logInfo('[TEST] Testing invisible char detection (zero-width space)', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    expect(PathValidator.hasInvisibleChars('test\u200Bid')).toBe(true);
    expect(PathValidator.hasInvisibleChars('\u200Btest')).toBe(true);
    expect(PathValidator.hasInvisibleChars('test\u200B')).toBe(true);
    logInfo('[TEST] Invisible char detection validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('PathValidator.hasInvisibleChars: detects zero-width joiner (U+200D)'), () => {
    expect(PathValidator.hasInvisibleChars('test\u200Did')).toBe(true);
  });

  it(testName('PathValidator.hasInvisibleChars: detects word joiner (U+2060)'), () => {
    expect(PathValidator.hasInvisibleChars('test\u2060id')).toBe(true);
  });

  it(testName('PathValidator.hasInvisibleChars: detects zero-width no-break space (U+FEFF)'), () => {
    expect(PathValidator.hasInvisibleChars('test\uFEFFid')).toBe(true);
  });

  it(testName('PathValidator.hasInvisibleChars: detects soft hyphen (U+00AD)'), () => {
    expect(PathValidator.hasInvisibleChars('test\u00ADid')).toBe(true);
  });

  it(testName('PathValidator.hasInvisibleChars: detects left-to-right mark (U+200E)'), () => {
    expect(PathValidator.hasInvisibleChars('test\u200Eid')).toBe(true);
  });

  it(testName('PathValidator.hasInvisibleChars: detects right-to-left mark (U+200F)'), () => {
    expect(PathValidator.hasInvisibleChars('test\u200Fid')).toBe(true);
  });

  it(testName('PathValidator.hasInvisibleChars: does NOT detect normal text'), () => {
    logInfo('[TEST] Testing path validator with normal text', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const result1 = PathValidator.hasInvisibleChars('test-id-123');
    const result2 = PathValidator.hasInvisibleChars('aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee');
    expect(result1).toBe(false);
    expect(result2).toBe(false);
    if (result1 !== false || result2 !== false) {
      logError('[TEST] Path validator incorrectly detected invisible chars in normal text', getStackTrace(), { result1, result2 });
    }
  });

  it(testName('PathValidator.hasInvisibleChars: works consistently with multiple calls (no /g flag bug)'), () => {
    expect(PathValidator.hasInvisibleChars('test\u200Bid')).toBe(true);
    expect(PathValidator.hasInvisibleChars('test\u200Bid')).toBe(true);
    expect(PathValidator.hasInvisibleChars('test\u200Bid')).toBe(true);
    expect(PathValidator.hasInvisibleChars('normal')).toBe(false);
    expect(PathValidator.hasInvisibleChars('test\u200Bid')).toBe(true);
  });

  it(testName('PathValidator.hasPathTraversal: detects .. path traversal'), () => {
    expect(PathValidator.hasPathTraversal('../etc/passwd')).toBe(true);
    expect(PathValidator.hasPathTraversal('test/../etc')).toBe(true);
  });

  it(testName('PathValidator.hasPathTraversal: detects encoded / (%2F)'), () => {
    expect(PathValidator.hasPathTraversal('test%2Fpath')).toBe(true);
    expect(PathValidator.hasPathTraversal('test%2fpath')).toBe(true);
  });

  it(testName('PathValidator.hasPathTraversal: detects encoded \\ (%5C)'), () => {
    expect(PathValidator.hasPathTraversal('test%5Cpath')).toBe(true);
    expect(PathValidator.hasPathTraversal('test%5cpath')).toBe(true);
  });

  it(testName('PathValidator.hasPathTraversal: does NOT detect normal text'), () => {
    expect(PathValidator.hasPathTraversal('test-id-123')).toBe(false);
    expect(PathValidator.hasPathTraversal('normal.file')).toBe(false);
  });

  it(testName('PathValidator.hasControlChars: detects null byte (U+0000)'), () => {
    expect(PathValidator.hasControlChars('test\u0000id')).toBe(true);
  });

  it(testName('PathValidator.hasControlChars: detects newline (U+000A)'), () => {
    expect(PathValidator.hasControlChars('test\nid')).toBe(true);
  });

  it(testName('PathValidator.hasControlChars: detects carriage return (U+000D)'), () => {
    expect(PathValidator.hasControlChars('test\rid')).toBe(true);
  });

  it(testName('PathValidator.hasControlChars: detects tab (U+0009)'), () => {
    expect(PathValidator.hasControlChars('test\tid')).toBe(true);
  });

  it(testName('PathValidator.hasControlChars: detects DEL (U+007F)'), () => {
    expect(PathValidator.hasControlChars('test\u007Fid')).toBe(true);
  });

  it(testName('PathValidator.hasControlChars: does NOT detect normal text'), () => {
    expect(PathValidator.hasControlChars('test-id-123')).toBe(false);
  });

  it(testName('PathValidator.hasWhitespaceBoundary: detects leading space'), () => {
    expect(PathValidator.hasWhitespaceBoundary(' test')).toBe(true);
  });

  it(testName('PathValidator.hasWhitespaceBoundary: detects trailing space'), () => {
    expect(PathValidator.hasWhitespaceBoundary('test ')).toBe(true);
  });

  it(testName('PathValidator.hasWhitespaceBoundary: detects leading tab'), () => {
    expect(PathValidator.hasWhitespaceBoundary('\ttest')).toBe(true);
  });

  it(testName('PathValidator.hasWhitespaceBoundary: detects trailing tab'), () => {
    expect(PathValidator.hasWhitespaceBoundary('test\t')).toBe(true);
  });

  it(testName('PathValidator.hasWhitespaceBoundary: does NOT detect internal whitespace'), () => {
    expect(PathValidator.hasWhitespaceBoundary('test id')).toBe(false);
  });

  it(testName('PathValidator.hasWhitespaceBoundary: does NOT detect normal text'), () => {
    expect(PathValidator.hasWhitespaceBoundary('test-id-123')).toBe(false);
  });

  it(testName('PathValidator.validate: accepts valid input'), () => {
    const result = PathValidator.validate('test-id-123', 'testParam');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('test-id-123');
    expect(result.error).toBeUndefined();
  });

  it(testName('PathValidator.validate: rejects empty string'), () => {
    const result = PathValidator.validate('', 'testParam');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-empty string');
  });

  it(testName('PathValidator.validate: rejects invisible chars'), () => {
    const result = PathValidator.validate('test\u200Bid', 'testParam');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });

  it(testName('PathValidator.validate: rejects path traversal'), () => {
    const result = PathValidator.validate('../etc', 'testParam');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('path traversal');
  });

  it(testName('PathValidator.validate: rejects control chars'), () => {
    const result = PathValidator.validate('test\nid', 'testParam');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('control characters');
  });

  it(testName('PathValidator.validate: rejects leading whitespace'), () => {
    const result = PathValidator.validate(' test', 'testParam');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('whitespace');
  });

  it(testName('PathValidator.validate: rejects trailing whitespace'), () => {
    const result = PathValidator.validate('test ', 'testParam');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('whitespace');
  });
});
