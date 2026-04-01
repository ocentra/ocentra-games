import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  clearBucketLogic,
  type TestStorage,
  type ClearBucketInput,
} from '@/logic/test';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
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
  Match1: 'match1.json',
  Match2: 'match2.json',
  Match3: 'match3.json',
  Match4: 'match4.json',
  Match5: 'match5.json',
  Dispute1: 'dispute1.json',
  Archived1: 'archived1.json',
  Anonymized1: 'anonymized1.json',
  Cursor123: 'cursor123',
  Page2: 'page2',
  InvalidPrefix: 'invalid/',
  DeleteFailed: 'Delete failed',
  ListFailed: 'List failed',
  FirstPrefixFailed: 'First prefix failed',
  ThirdPrefixFailed: 'Third prefix failed',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('should delete all objects across multiple prefixes'), async () => {
    logInfo('[TEST] Testing clearBucketLogic with multiple prefixes', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const mockStorage: TestStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1}` }, { key: `${BucketPath.Matches}${TestConstants.Match2}` }],
          truncated: false,
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1}` }],
          truncated: false,
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Archive}${TestConstants.Archived1}` }],
          truncated: false,
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.MatchesAnonymized}${TestConstants.Anonymized1}` }],
          truncated: false,
        }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const input: ClearBucketInput = {
      prefixes: [BucketPath.Matches, BucketPath.Disputes, BucketPath.Archive, BucketPath.MatchesAnonymized],
    };

    const result = await clearBucketLogic(input, mockStorage);

    logInfo('[TEST] clearBucketLogic result', getStackTrace(), { success: result.success, deletedCount: result.deletedCount, errorCount: result.errorCount }, LOG_TEST_OPERATIONS);
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(5);
    expect(result.errorCount).toBe(0);
    if (!result.success || result.deletedCount !== 5 || result.errorCount !== 0) {
      logError('[TEST] Clear bucket operation failed or invalid', getStackTrace(), { success: result.success, deletedCount: result.deletedCount, errorCount: result.errorCount });
    }
    expect(result.error).toBeUndefined();

    expect(mockStorage.delete).toHaveBeenCalledTimes(5);
    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.Matches}${TestConstants.Match1}`);
    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.Matches}${TestConstants.Match2}`);
    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.Disputes}${TestConstants.Dispute1}`);
    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.Archive}${TestConstants.Archived1}`);
    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.MatchesAnonymized}${TestConstants.Anonymized1}`);
  });

  it(testName('should handle paginated results with cursor'), async () => {
    const mockStorage: TestStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1}` }],
          truncated: true,
          cursor: TestConstants.Cursor123,
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match2}` }],
          truncated: false,
        }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const input: ClearBucketInput = {
      prefixes: [BucketPath.Matches],
    };

    const result = await clearBucketLogic(input, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2);
    expect(result.errorCount).toBe(0);

    expect(mockStorage.list).toHaveBeenCalledTimes(2);
    expect(mockStorage.list).toHaveBeenNthCalledWith(1, { prefix: BucketPath.Matches });
    expect(mockStorage.list).toHaveBeenNthCalledWith(2, { prefix: BucketPath.Matches, cursor: TestConstants.Cursor123 });
    expect(mockStorage.delete).toHaveBeenCalledTimes(2);
  });

  it(testName('should count errors when delete fails'), async () => {
    const mockStorage: TestStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2}` },
          { key: `${BucketPath.Matches}${TestConstants.Match3}` },
        ],
        truncated: false,
      }),
      delete: vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error(TestConstants.DeleteFailed))
        .mockResolvedValueOnce(undefined),
    };

    const input: ClearBucketInput = {
      prefixes: [BucketPath.Matches],
    };

    const result = await clearBucketLogic(input, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2);
    expect(result.errorCount).toBe(1);

    expect(mockStorage.delete).toHaveBeenCalledTimes(3);
  });

  it(testName('should count errors when list fails for a prefix'), async () => {
    const mockStorage: TestStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1}` }],
          truncated: false,
        })
        .mockRejectedValueOnce(new Error(TestConstants.ListFailed))
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Archive}${TestConstants.Archived1}` }],
          truncated: false,
        }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const input: ClearBucketInput = {
      prefixes: [BucketPath.Matches, BucketPath.Disputes, BucketPath.Archive],
    };

    const result = await clearBucketLogic(input, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2);
    expect(result.errorCount).toBe(1);
  });

  it(testName('should handle empty prefixes array'), async () => {
    const mockStorage: TestStorage = {
      list: vi.fn(),
      delete: vi.fn(),
    };

    const input: ClearBucketInput = {
      prefixes: [],
    };

    const result = await clearBucketLogic(input, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(0);
    expect(result.errorCount).toBe(0);

    expect(mockStorage.list).not.toHaveBeenCalled();
    expect(mockStorage.delete).not.toHaveBeenCalled();
  });

  it(testName('should handle empty result sets'), async () => {
    const mockStorage: TestStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false,
      }),
      delete: vi.fn(),
    };

    const input: ClearBucketInput = {
      prefixes: [BucketPath.Matches],
    };

    const result = await clearBucketLogic(input, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(0);
    expect(result.errorCount).toBe(0);

    expect(mockStorage.delete).not.toHaveBeenCalled();
  });

  it(testName('should process all prefixes even if one fails'), async () => {
    const mockStorage: TestStorage = {
      list: vi.fn()
        .mockRejectedValueOnce(new Error(TestConstants.FirstPrefixFailed))
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Disputes}${TestConstants.Dispute1}` }],
          truncated: false,
        })
        .mockRejectedValueOnce(new Error(TestConstants.ThirdPrefixFailed))
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Archive}${TestConstants.Archived1}` }],
          truncated: false,
        }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const input: ClearBucketInput = {
      prefixes: [BucketPath.Matches, BucketPath.Disputes, TestConstants.InvalidPrefix, BucketPath.Archive],
    };

    const result = await clearBucketLogic(input, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2);
    expect(result.errorCount).toBe(2);
  });

  it(testName('should handle multiple pages with mixed success and failure'), async () => {
    const mockStorage: TestStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [
            { key: `${BucketPath.Matches}${TestConstants.Match1}` },
            { key: `${BucketPath.Matches}${TestConstants.Match2}` },
            { key: `${BucketPath.Matches}${TestConstants.Match3}` },
          ],
          truncated: true,
          cursor: TestConstants.Page2,
        })
        .mockResolvedValueOnce({
          objects: [
            { key: `${BucketPath.Matches}${TestConstants.Match4}` },
            { key: `${BucketPath.Matches}${TestConstants.Match5}` },
          ],
          truncated: false,
        }),
      delete: vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error(TestConstants.DeleteFailed))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error(TestConstants.DeleteFailed)),
    };

    const input: ClearBucketInput = {
      prefixes: [BucketPath.Matches],
    };

    const result = await clearBucketLogic(input, mockStorage);

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(3);
    expect(result.errorCount).toBe(2);

    expect(mockStorage.list).toHaveBeenCalledTimes(2);
    expect(mockStorage.delete).toHaveBeenCalledTimes(5);
  });
});
