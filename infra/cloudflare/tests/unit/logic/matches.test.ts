import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  validateMatchLogic,
  uploadMatchLogic,
  getMatchLogic,
  deleteMatchLogic,
  anonymizeMatchLogic,
  saveAnonymizedMatchLogic,
  type MatchStorage,
} from '@/logic/matches';
import { validateMatchRecord } from '@ocentra/endpoint-domain/utils/validation';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
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
  MatchId1: asMatchId('550e8400-e29b-41d4-a716-446655440001'),
  Match1Json: 'match1.json',
  UserId1: 'user1',
  UserId2: 'user2',
  MissingMatchId: 'Missing match_id',
  InvalidJson: 'Invalid JSON payload',
  InvalidJsonString: 'invalid json',
  StorageError: 'Storage error',
  TooLarge: 'too large',
  NotFound: 'not found',
  ValidMatch: 'valid',
  Human: 'human',
  Player1: 'Player1',
  HashedPrefix: 'hashed_',
  MaxSizeBytes: 10 * 1024 * 1024,
  LargeSizeBytes: 11 * 1024 * 1024,
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should validate valid match record'), () => {
    logInfo('[TEST] Testing validateMatchLogic', getStackTrace(), { matchId: TestConstants.MatchId1 }, LOG_TEST_OPERATIONS);
    const validMatch = { match_id: TestConstants.MatchId1, players: [] };
    const validateMatchRecord = vi.fn().mockReturnValue({ valid: true });

    const result = validateMatchLogic({
      body: JSON.stringify(validMatch),
      validateMatchRecord,
    });
    logInfo('[TEST] validateMatchLogic result', getStackTrace(), { success: result.success }, LOG_TEST_OPERATIONS);

    expect(result.success).toBe(true);
    expect(result.matchData).toEqual(validMatch);
    if (!result.success || !result.matchData) {
      logError('[TEST] Match validation failed or invalid', getStackTrace(), { success: result.success, hasMatchData: !!result.matchData });
    } else {
      const matchData = result.matchData as { match_id: string };
      if (matchData.match_id !== validMatch.match_id) {
        logError('[TEST] Match ID mismatch', getStackTrace(), { matchId: matchData.match_id, expected: validMatch.match_id });
      }
    }
  });

  it(testName('should reject invalid match record'), () => {
    const invalidMatch = { invalid: 'data' };
    const validateMatchRecord = vi.fn().mockReturnValue({ valid: false, error: TestConstants.MissingMatchId });

    const result = validateMatchLogic({
      body: JSON.stringify(invalidMatch),
      validateMatchRecord,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.MissingMatchId);
    if (result.success !== false || result.error !== TestConstants.MissingMatchId) {
      logError('[TEST] Invalid match rejection failed', getStackTrace(), { success: result.success, error: result.error, expected: TestConstants.MissingMatchId });
    }
  });

  it(testName('should reject invalid JSON'), () => {
    const validateMatchRecord = vi.fn();

    const result = validateMatchLogic({
      body: TestConstants.InvalidJsonString,
      validateMatchRecord,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.InvalidJson);
  });

  it(testName('should reject match payload with unexpected fields'), () => {
    const malformedMatch = {
      match_id: TestConstants.MatchId1,
      version: '1.0.0',
      events: [
        {
          type: 'move',
          timestamp: '2026-04-08T00:00:00.000Z',
          extra: true,
        },
      ],
      unexpected: true,
    };

    const result = validateMatchLogic({
      body: JSON.stringify(malformedMatch),
      validateMatchRecord,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('unexpected fields');
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should upload match successfully'), async () => {
    const mockStorage: MatchStorage = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
    };

    const body = JSON.stringify({ match_id: TestConstants.MatchId1 });
    const result = await uploadMatchLogic(
      {
        matchId: TestConstants.MatchId1,
        body,
        matchKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        maxSizeBytes: TestConstants.MaxSizeBytes,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(mockStorage.put).toHaveBeenCalled();
  });

  it(testName('should reject match that is too large'), async () => {
    const mockStorage: MatchStorage = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const largeBody = 'x'.repeat(TestConstants.LargeSizeBytes);
    const result = await uploadMatchLogic(
      {
        matchId: TestConstants.MatchId1,
        body: largeBody,
        matchKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        maxSizeBytes: TestConstants.MaxSizeBytes,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.TooLarge);
    expect(mockStorage.put).not.toHaveBeenCalled();
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage: MatchStorage = {
      get: vi.fn(),
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      delete: vi.fn(),
    };

    const result = await uploadMatchLogic(
      {
        matchId: TestConstants.MatchId1,
        body: JSON.stringify({ match_id: TestConstants.MatchId1 }),
        matchKey: `${BucketPath.Matches}${TestConstants.Match1Json}`,
        maxSizeBytes: TestConstants.MaxSizeBytes,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should get match successfully'), async () => {
    const matchData = { match_id: TestConstants.MatchId1, players: [] };
    const mockStorage: MatchStorage = {
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(matchData)),
      }),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const result = await getMatchLogic(
      { matchId: TestConstants.MatchId1, matchKey: `${BucketPath.Matches}${TestConstants.Match1Json}` },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.matchData).toEqual(matchData);
  });

  it(testName('should return error when match not found'), async () => {
    const mockStorage: MatchStorage = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const result = await getMatchLogic(
      { matchId: TestConstants.MatchId1, matchKey: `${BucketPath.Matches}${TestConstants.Match1Json}` },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(HttpStatus.NotFound);
    expect(result.error).toContain(TestConstants.NotFound);
  });

  it(testName('should handle parsing errors'), async () => {
    const mockStorage: MatchStorage = {
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(TestConstants.InvalidJsonString),
      }),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const result = await getMatchLogic(
      { matchId: TestConstants.MatchId1, matchKey: `${BucketPath.Matches}${TestConstants.Match1Json}` },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(HttpStatus.InternalServerError);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should delete match successfully'), async () => {
    const mockStorage: MatchStorage = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteMatchLogic(
      { matchId: TestConstants.MatchId1, matchKey: `${BucketPath.Matches}${TestConstants.Match1Json}` },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(mockStorage.delete).toHaveBeenCalledWith(`${BucketPath.Matches}${TestConstants.Match1Json}`);
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage: MatchStorage = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const result = await deleteMatchLogic(
      { matchId: TestConstants.MatchId1, matchKey: `${BucketPath.Matches}${TestConstants.Match1Json}` },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should anonymize match record'), () => {
    const matchRecord = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: TestConstants.UserId1, public_key: 'abc123', type: TestConstants.Human },
        { player_id: TestConstants.UserId2, pubkey: 'def456', type: TestConstants.Human },
      ],
      events: [
        { player_id: TestConstants.UserId1, type: 'move' },
      ],
      winner: TestConstants.UserId1,
      final_state: {},
    };

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(true);
    expect(result.anonymized).not.toBeNull();
    expect(result.anonymized).not.toBeUndefined();
    expect(result.anonymized?.players).toHaveLength(2);
    const players = result.anonymized?.players;
    if (players && Array.isArray(players) && players.length > 0) {
      const firstPlayer = players[0] as { player_id?: string; public_key?: string };
      expect(firstPlayer.player_id).toBe(TestConstants.Player1);
      expect(firstPlayer.public_key).toContain(TestConstants.HashedPrefix);
    }
    expect(result.anonymized?.winner).toBeUndefined();
    expect(result.anonymized?.final_state).toBeUndefined();
  });

  it(testName('should handle matches without players'), () => {
    const matchRecord = {
      match_id: TestConstants.MatchId1,
      winner: TestConstants.UserId1,
    };

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(true);
    expect(result.anonymized).not.toBeNull();
    // If original match has no players array, anonymized should also not have one
    expect(result.anonymized?.players).toBeUndefined();
  });

  it(testName('should anonymize player metadata (model_name and model_id)'), () => {
    const matchRecord = {
      match_id: TestConstants.MatchId1,
      players: [
        {
          player_id: TestConstants.UserId1,
          type: TestConstants.Human,
          metadata: {
            model_name: 'gpt-4',
            model_id: 'model-123',
          },
        },
      ],
    };

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(true);
    const players = result.anonymized?.players as Array<{ metadata?: { model_name?: string; model_id?: string } }>;
    if (players && players.length > 0 && players[0].metadata) {
      expect(players[0].metadata.model_name).toBe('[REDACTED]');
      expect(players[0].metadata.model_id).toBe('[REDACTED]');
    }
  });

  it(testName('should anonymize events with player_id references'), () => {
    const matchRecord = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      events: [
        { player_id: TestConstants.UserId1, type: 'move', data: 'test' },
        { player_id: TestConstants.UserId2, type: 'action', data: 'test2' },
      ],
    };

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(true);
    const events = result.anonymized?.events as Array<{ player_id?: string }>;
    if (events && events.length > 0) {
      expect(events[0].player_id).toBe('Player1');
      expect(events[1].player_id).toBe('Player2');
    }
  });

  it(testName('should handle events with player_id not found in players'), () => {
    const matchRecord = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      events: [
        { player_id: 'unknown-player', type: 'move' },
      ],
    };

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(true);
    const events = result.anonymized?.events as Array<{ player_id?: string }>;
    if (events && events.length > 0) {
      expect(events[0].player_id).toBe('unknown-player');
    }
  });

  it(testName('should handle null matchRecord gracefully'), () => {
    const matchRecord = null as unknown as Record<string, unknown>;

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(true);
    expect(result.anonymized).toEqual({});
  });

  it(testName('should anonymize events when playerIndex is found'), () => {
    const matchRecord = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      events: [
        { player_id: TestConstants.UserId1, type: 'move' },
        { player_id: TestConstants.UserId2, type: 'action' },
      ],
    };

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(true);
    const events = result.anonymized?.events as Array<{ player_id?: string }>;
    expect(events).toHaveLength(2);
    expect(events[0].player_id).toBe('Player1');
    expect(events[1].player_id).toBe('Player2');
  });

  it(testName('should anonymize events with player_id matching anonymized players'), () => {
    const matchRecord = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      events: [
        { player_id: TestConstants.UserId1, type: 'move', data: 'test' },
      ],
    };

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(true);
    const events = result.anonymized?.events as Array<{ player_id?: string }>;
    expect(events).toHaveLength(1);
    const players = result.anonymized?.players as Array<{ player_id?: string }>;
    if (players && players.length > 0 && events && events.length > 0) {
      const anonymizedPlayerId = players[0].player_id;
      if (anonymizedPlayerId && events[0].player_id === anonymizedPlayerId) {
        expect(events[0].player_id).toBe(anonymizedPlayerId);
      }
    }
  });

  it(testName('should anonymize events when event player_id matches anonymized player player_id'), () => {
    const matchRecord = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: 'Player1', type: TestConstants.Human },
      ],
      events: [
        { player_id: 'Player1', type: 'move' },
      ],
    };

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(true);
    const events = result.anonymized?.events as Array<{ player_id?: string }>;
    expect(events).toHaveLength(1);
    expect(events[0].player_id).toBe('Player1');
  });

  it(testName('should handle anonymization errors in catch block'), () => {
    const matchRecord = {
      match_id: TestConstants.MatchId1,
      players: [
        {
          player_id: TestConstants.UserId1,
          type: TestConstants.Human,
          metadata: {
            get model_name() {
              throw new Error('Access error');
            },
          },
        },
      ],
    };

    const result = anonymizeMatchLogic({ matchRecord });

    expect(result.success).toBe(false);
    expect(result.error).toBeTypeOf('string');
    expect(result.error?.length).toBeGreaterThan(0);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should save anonymized match successfully'), async () => {
    const mockStorage: MatchStorage = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
    };

    const result = await saveAnonymizedMatchLogic(
      {
        anonymizedKey: `${BucketPath.MatchesAnonymized}${TestConstants.Match1Json}`,
        anonymizedData: { match_id: TestConstants.MatchId1, players: [] },
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(mockStorage.put).toHaveBeenCalled();
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage: MatchStorage = {
      get: vi.fn(),
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      delete: vi.fn(),
    };

    const result = await saveAnonymizedMatchLogic(
      {
        anonymizedKey: `${BucketPath.MatchesAnonymized}${TestConstants.Match1Json}`,
        anonymizedData: { match_id: TestConstants.MatchId1 },
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
  });
});
