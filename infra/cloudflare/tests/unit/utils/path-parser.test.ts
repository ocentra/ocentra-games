import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import {
  extractIdFromPath,
  extractAndValidateIdFromPath,
  extractIdAfterEndpoint,
  extractAndValidateIdAfterEndpoint,
  extractPathAfterEndpoint,
  extractPathAfterId,
  extractPathParts,
} from '@ocentra/endpoint-domain/utils/path-parser';
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

  it(testName('extractIdFromPath: should extract ID from path after endpoint'), () => {
    logInfo('[TEST] Testing extractIdFromPath', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const result = extractIdFromPath('/api/users/user123', '/api/users');
    expect(result).toBe('user123');
    if (result !== 'user123') {
      logError('[TEST] Path ID extraction failed', getStackTrace(), { result, expected: 'user123' });
    }
    logInfo('[TEST] Path extraction validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('extractIdFromPath: should extract ID with URL encoding'), () => {
    const result = extractIdFromPath('/api/users/user%20123', '/api/users');
    expect(result).toBe('user 123');
  });

  it(testName('extractIdFromPath: should return null when path does not start with endpoint'), () => {
    const result = extractIdFromPath('/api/users/user123', '/api/other');
    expect(result).toBeNull();
  });

  it(testName('extractIdFromPath: should return null when path is endpoint only'), () => {
    const result = extractIdFromPath('/api/users', '/api/users');
    expect(result).toBeNull();
  });

  it(testName('extractIdFromPath: should return null when path is endpoint with trailing slash only'), () => {
    const result = extractIdFromPath('/api/users/', '/api/users');
    expect(result).toBeNull();
  });

  it(testName('extractIdFromPath: should handle multiple leading slashes'), () => {
    const result = extractIdFromPath('/api/users///user123', '/api/users');
    expect(result).toBe('user123');
  });

  it(testName('extractIdFromPath: should extract first path segment only'), () => {
    const result = extractIdFromPath('/api/users/user123/posts', '/api/users');
    expect(result).toBe('user123');
  });

  it(testName('extractIdFromPath: should handle invalid URL encoding gracefully'), () => {
    const result = extractIdFromPath('/api/users/user%', '/api/users');
    expect(result).toBe('user%');
  });

  it(testName('extractIdFromPath: should handle empty path'), () => {
    const result = extractIdFromPath('', '/api/users');
    expect(result).toBeNull();
  });

  it(testName('extractAndValidateIdFromPath: should extract and validate valid ID'), () => {
    const result = extractAndValidateIdFromPath('/api/users/user123', '/api/users', 'userId');
    expect(result.id).toBe('user123');
    expect(result.error).toBeNull();
  });

  it(testName('extractAndValidateIdFromPath: should return error when path does not start with endpoint'), () => {
    const result = extractAndValidateIdFromPath('/api/other/user123', '/api/users', 'userId');
    expect(result.id).toBeNull();
    expect(result.error).toBe('userId is required');
  });

  it(testName('extractAndValidateIdFromPath: should return error when path is endpoint only'), () => {
    const result = extractAndValidateIdFromPath('/api/users', '/api/users', 'userId');
    expect(result.id).toBeNull();
    expect(result.error).toBe('userId is required');
  });

  it(testName('extractAndValidateIdFromPath: should return error when validation fails on raw path'), () => {
    const result = extractAndValidateIdFromPath('/api/users/../user123', '/api/users', 'userId');
    expect(result.id).toBeNull();
    expect(result.error).toContain('path traversal');
  });

  it(testName('extractAndValidateIdFromPath: should return error when validation fails on decoded path'), () => {
    const result = extractAndValidateIdFromPath('/api/users/user%00test', '/api/users', 'userId');
    expect(result.id).toBeNull();
    expect(result.error).toBe('userId contains control characters');
  });

  it(testName('extractAndValidateIdFromPath: should use raw URL string when provided'), () => {
    const result = extractAndValidateIdFromPath(
      '/api/users/user123',
      '/api/users',
      'userId',
      'https://example.com/api/users/user123'
    );
    expect(result.id).toBe('user123');
    expect(result.error).toBeNull();
  });

  it(testName('extractAndValidateIdFromPath: should handle decode failure gracefully'), () => {
    const result = extractAndValidateIdFromPath('/api/users/user%', '/api/users', 'userId');
    expect(result.id).toBe('user%');
    expect(result.error).toBeNull();
  });

  it(testName('extractIdAfterEndpoint: should extract ID after endpoint'), () => {
    const result = extractIdAfterEndpoint('/api/users/user123', '/api/users');
    expect(result).toBe('user123');
  });

  it(testName('extractIdAfterEndpoint: should extract ID after endpoint with subPath'), () => {
    const result = extractIdAfterEndpoint('/api/users/posts/post456', '/api/users', '/posts');
    expect(result).toBe('post456');
  });

  it(testName('extractIdAfterEndpoint: should return null when path does not start with endpoint'), () => {
    const result = extractIdAfterEndpoint('/api/other/user123', '/api/users');
    expect(result).toBeNull();
  });

  it(testName('extractIdAfterEndpoint: should return null when path is endpoint only'), () => {
    const result = extractIdAfterEndpoint('/api/users', '/api/users');
    expect(result).toBeNull();
  });

  it(testName('extractIdAfterEndpoint: should handle URL encoding'), () => {
    const result = extractIdAfterEndpoint('/api/users/user%20123', '/api/users');
    expect(result).toBe('user 123');
  });

  it(testName('extractIdAfterEndpoint: should handle invalid URL encoding gracefully'), () => {
    const result = extractIdAfterEndpoint('/api/users/user%', '/api/users');
    expect(result).toBe('user%');
  });

  it(testName('extractAndValidateIdAfterEndpoint: should extract and validate ID after endpoint'), () => {
    const result = extractAndValidateIdAfterEndpoint('/api/users/posts/post456', '/api/users', 'postId', '/posts');
    expect(result.id).toBe('post456');
    expect(result.error).toBeNull();
  });

  it(testName('extractAndValidateIdAfterEndpoint: should return error when path does not start with endpoint'), () => {
    const result = extractAndValidateIdAfterEndpoint('/api/other/post456', '/api/users', 'postId', '/posts');
    expect(result.id).toBeNull();
    expect(result.error).toBe('postId is required');
  });

  it(testName('extractAndValidateIdAfterEndpoint: should return error when validation fails'), () => {
    const result = extractAndValidateIdAfterEndpoint('/api/users/posts/../post456', '/api/users', 'postId', '/posts');
    expect(result.id).toBeNull();
    expect(result.error).toContain('path traversal');
  });

  it(testName('extractAndValidateIdAfterEndpoint: should use raw URL string when provided'), () => {
    const result = extractAndValidateIdAfterEndpoint(
      '/api/users/posts/post456',
      '/api/users',
      'postId',
      '/posts',
      'https://example.com/api/users/posts/post456'
    );
    expect(result.id).toBe('post456');
    expect(result.error).toBeNull();
  });

  it(testName('extractPathAfterEndpoint: should extract path after endpoint'), () => {
    const result = extractPathAfterEndpoint('/api/users/user123/posts/post456', '/api/users');
    expect(result).toBe('user123/posts/post456');
  });

  it(testName('extractPathAfterEndpoint: should return empty string when path does not start with endpoint'), () => {
    const result = extractPathAfterEndpoint('/api/other/user123', '/api/users');
    expect(result).toBe('');
  });

  it(testName('extractPathAfterEndpoint: should handle multiple leading slashes'), () => {
    const result = extractPathAfterEndpoint('/api/users///user123/posts', '/api/users');
    expect(result).toBe('user123/posts');
  });

  it(testName('extractPathAfterEndpoint: should return empty string when path is endpoint only'), () => {
    const result = extractPathAfterEndpoint('/api/users', '/api/users');
    expect(result).toBe('');
  });

  it(testName('extractPathAfterEndpoint: should return empty string when path is endpoint with trailing slash only'), () => {
    const result = extractPathAfterEndpoint('/api/users/', '/api/users');
    expect(result).toBe('');
  });

  it(testName('extractPathAfterId: should extract path after ID'), () => {
    const result = extractPathAfterId('/api/users/user123/posts/post456', '/api/users', 'user123');
    expect(result).toBe('posts/post456');
  });

  it(testName('extractPathAfterId: should return empty string when path does not start with ID path'), () => {
    const result = extractPathAfterId('/api/users/user456/posts', '/api/users', 'user123');
    expect(result).toBe('');
  });

  it(testName('extractPathAfterId: should handle multiple leading slashes'), () => {
    const result = extractPathAfterId('/api/users/user123///posts/post456', '/api/users', 'user123');
    expect(result).toBe('posts/post456');
  });

  it(testName('extractPathAfterId: should return empty string when path is ID path only'), () => {
    const result = extractPathAfterId('/api/users/user123', '/api/users', 'user123');
    expect(result).toBe('');
  });

  it(testName('extractPathParts: should extract path parts after endpoint'), () => {
    const result = extractPathParts('/api/users/user123/posts/post456', '/api/users');
    expect(result).toEqual(['user123', 'posts', 'post456']);
  });

  it(testName('extractPathParts: should return empty array when path does not start with endpoint'), () => {
    const result = extractPathParts('/api/other/user123', '/api/users');
    expect(result).toEqual([]);
  });

  it(testName('extractPathParts: should handle multiple leading slashes'), () => {
    const result = extractPathParts('/api/users///user123/posts', '/api/users');
    expect(result).toEqual(['user123', 'posts']);
  });

  it(testName('extractPathParts: should return empty array when path is endpoint only'), () => {
    const result = extractPathParts('/api/users', '/api/users');
    expect(result).toEqual([]);
  });

  it(testName('extractPathParts: should filter out empty parts'), () => {
    const result = extractPathParts('/api/users/user123//posts/post456', '/api/users');
    expect(result).toEqual(['user123', 'posts', 'post456']);
  });

  it(testName('extractPathParts: should handle single path part'), () => {
    const result = extractPathParts('/api/users/user123', '/api/users');
    expect(result).toEqual(['user123']);
  });
});
