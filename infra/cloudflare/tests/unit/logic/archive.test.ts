import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  archiveMatchLogic,
  type ArchiveStorage,
} from '@/logic/archive';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { asMatchId } from '@ocentra/endpoint-domain/constants/match';
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
  MatchId: asMatchId('550e8400-e29b-41d4-a716-446655440002'),
  Match1Json: 'match1.json',
  PlayerId1: 'player1',
  StorageError: 'Storage error',
  PutError: 'Put error',
  MatchNotFound: 'Match not found',
  TestTimestamp: '2024-01-01T00:00:00Z',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should archive match successfully'), async () => {
    logInfo('[TEST] Testing archiveMatchLogic', getStackTrace(), { matchId: TestConstants.MatchId }, LOG_TEST_OPERATIONS);
    const matchData = { match_id: TestConstants.MatchId, players: [] };
    const matchJson = JSON.stringify(matchData);

    const mockStorage: ArchiveStorage = {
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(matchJson) }),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await archiveMatchLogic(
      {
        matchId: TestConstants.MatchId,
        sourceKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        archiveKey: `${BucketPath.Archive}${TestConstants.Match1Json}`,
      },
      mockStorage
    );

    logInfo('[TEST] archiveMatchLogic result', getStackTrace(), { success: result.success, matchId: result.matchId }, LOG_TEST_OPERATIONS);
    expect(result.success).toBe(true);
    expect(result.matchId).toBe(TestConstants.MatchId);
    expect(result.archivedAt).toBeTypeOf('string');
    expect(result.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.error).toBeUndefined();
    if (!result.success || result.matchId !== TestConstants.MatchId || result.error) {
      logError('[TEST] Archive operation failed or invalid', getStackTrace(), { success: result.success, matchId: result.matchId, error: result.error });
    }

    expect(mockStorage.get).toHaveBeenCalledWith(`${BucketPath.Matches}${TestConstants.Match1Json}`);
    expect(mockStorage.put).toHaveBeenCalledWith(
      `${BucketPath.Archive}${TestConstants.Match1Json}`,
      matchJson,
      {
        httpMetadata: {
          contentType: HttpContentType.ApplicationJson,
        },
      }
    );
  });

  it(testName('should return error when match not found'), async () => {
    const mockStorage: ArchiveStorage = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    };

    const result = await archiveMatchLogic(
      {
        matchId: TestConstants.MatchId,
        sourceKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        archiveKey: `${BucketPath.Archive}${TestConstants.Match1Json}`,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.matchId).toBe(TestConstants.MatchId);
    expect(result.error).toBe(TestConstants.MatchNotFound);
    expect(result.archivedAt).toBeTypeOf('string');
    expect(result.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(mockStorage.put).not.toHaveBeenCalled();
  });

  it(testName('should handle storage get errors'), async () => {
    const mockStorage: ArchiveStorage = {
      get: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      put: vi.fn(),
    };

    const result = await archiveMatchLogic(
      {
        matchId: TestConstants.MatchId,
        sourceKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        archiveKey: `${BucketPath.Archive}${TestConstants.Match1Json}`,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.matchId).toBe(TestConstants.MatchId);
    expect(result.error).toBe(`Error: ${TestConstants.StorageError}`);
    expect(result.archivedAt).toBeTypeOf('string');
    expect(result.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(mockStorage.put).not.toHaveBeenCalled();
  });

  it(testName('should handle storage put errors'), async () => {
    const matchData = { match_id: TestConstants.MatchId, players: [] };
    const matchJson = JSON.stringify(matchData);

    const mockStorage: ArchiveStorage = {
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(matchJson) }),
      put: vi.fn().mockRejectedValue(new Error(TestConstants.PutError)),
    };

    const result = await archiveMatchLogic(
      {
        matchId: TestConstants.MatchId,
        sourceKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        archiveKey: `${BucketPath.Archive}${TestConstants.Match1Json}`,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.matchId).toBe(TestConstants.MatchId);
    expect(result.error).toBe(`Error: ${TestConstants.PutError}`);
    expect(result.archivedAt).toBeTypeOf('string');
    expect(result.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it(testName('should preserve match data exactly'), async () => {
    const matchData = {
      match_id: TestConstants.MatchId,
      players: [{ player_id: TestConstants.PlayerId1 }],
      start_time: TestConstants.TestTimestamp,
      metadata: { game_type: 1 },
    };
    const matchJson = JSON.stringify(matchData);

    const mockStorage: ArchiveStorage = {
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(matchJson) }),
      put: vi.fn().mockResolvedValue(undefined),
    };

    await archiveMatchLogic(
      {
        matchId: TestConstants.MatchId,
        sourceKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        archiveKey: `${BucketPath.Archive}${TestConstants.Match1Json}`,
      },
      mockStorage
    );

    expect(mockStorage.put).toHaveBeenCalledWith(
      `${BucketPath.Archive}${TestConstants.Match1Json}`,
      matchJson,
      expect.objectContaining({ httpMetadata: { contentType: HttpContentType.ApplicationJson } })
    );
  });

  it(testName('should set correct content type'), async () => {
    const matchData = { match_id: TestConstants.MatchId };
    const matchJson = JSON.stringify(matchData);

    const mockStorage: ArchiveStorage = {
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(matchJson) }),
      put: vi.fn().mockResolvedValue(undefined),
    };

    await archiveMatchLogic(
      {
        matchId: TestConstants.MatchId,
        sourceKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        archiveKey: `${BucketPath.Archive}${TestConstants.Match1Json}`,
      },
      mockStorage
    );

    expect(mockStorage.put).toHaveBeenCalledWith(
      `${BucketPath.Archive}${TestConstants.Match1Json}`,
      matchJson,
      {
        httpMetadata: {
          contentType: HttpContentType.ApplicationJson,
        },
      }
    );
  });

  it(testName('should include archivedAt timestamp'), async () => {
    const matchData = { match_id: TestConstants.MatchId };
    const matchJson = JSON.stringify(matchData);

    const mockStorage: ArchiveStorage = {
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(matchJson) }),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const beforeTime = new Date().toISOString();
    const result = await archiveMatchLogic(
      {
        matchId: TestConstants.MatchId,
        sourceKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        archiveKey: `${BucketPath.Archive}${TestConstants.Match1Json}`,
      },
      mockStorage
    );
    const afterTime = new Date().toISOString();

    expect(result.archivedAt).toBeTypeOf('string');
    expect(result.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.archivedAt >= beforeTime).toBe(true);
    expect(result.archivedAt <= afterTime).toBe(true);
  });
});
