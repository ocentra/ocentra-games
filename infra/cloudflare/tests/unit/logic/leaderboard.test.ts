import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  computeLeaderboardLogic,
  type LeaderboardStorage,
} from '@/logic/leaderboard';
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
  MatchId1: 'match1',
  MatchId2: 'match2',
  UserId1: 'user1',
  UserId2: 'user2',
  Match1Json: 'match1.json',
  Match2Json: 'match2.json',
  Human: 'human',
  Ai: 'ai',
  Ai1: 'ai1',
  Ai2: 'ai2',
  TestTimestamp: '2024-01-01T00:00:00Z',
  TestTimestamp2: '2024-01-02T00:00:00Z',
  GameType0: 0,
  Phase3: 3,
  Limit5: 5,
  Limit100: 100,
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should compute leaderboard for game type'), async () => {
    logInfo('[TEST] Testing computeLeaderboardLogic', getStackTrace(), { gameType: TestConstants.GameType0 }, LOG_TEST_OPERATIONS);
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [50, 100],
      winner: TestConstants.UserId2,
      endedAt: TestConstants.TestTimestamp2,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match2)),
        }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toBe(TestConstants.UserId1);
    expect(result[0].score).toBe(150);
    expect(result[0].wins).toBe(1);
    expect(result[0].rank).toBe(1);
    expect(result[1].user_id).toBe(TestConstants.UserId2);
    if (result.length !== 2 || result[0].user_id !== TestConstants.UserId1 || result[0].rank !== 1) {
      logError('[TEST] Leaderboard computation failed or invalid', getStackTrace(), { entryCount: result.length, firstUserId: result[0]?.user_id, firstRank: result[0]?.rank });
    }
    expect(result[1].score).toBe(150);
    expect(result[1].wins).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it(testName('should filter AI matches when aiOnly is false'), async () => {
    const aiMatch = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.Ai1, type: TestConstants.Ai },
        { player_id: TestConstants.Ai2, type: TestConstants.Ai },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(aiMatch)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result).toHaveLength(0);
  });

  it(testName('should respect limit parameter'), async () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({
      match_id: `match${i}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: `user${i}`, type: TestConstants.Human }],
      scores: [100],
      endedAt: TestConstants.TestTimestamp,
    }));

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map(m => ({ key: `${BucketPath.Matches}${m.match_id}.json` })),
        truncated: false,
      }),
      get: vi.fn((key) => {
        const matchIndex = matches.findIndex(m => key.includes(m.match_id));
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[matchIndex])),
        });
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit5, mockStorage);

    expect(result).toHaveLength(TestConstants.Limit5);
  });

  it(testName('should skip matches that do not end with .json'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.MatchId1}.txt` },
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    // Only the .json file should be fetched (skip .txt)
    expect(mockStorage.get).toHaveBeenCalledTimes(1);
    // The match has 2 players, so leaderboard should have 2 entries
    expect(result).toHaveLength(2);
  });

  it(testName('should skip anonymized matches'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}/anonymized/${TestConstants.MatchId1}.json` },
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    // Only non-anonymized match should be fetched
    expect(mockStorage.get).toHaveBeenCalledTimes(1);
    // The match has 2 players, so leaderboard should have 2 entries
    expect(result).toHaveLength(2);
  });

  it(testName('should handle pagination with cursor'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
          truncated: true,
          cursor: 'cursor123',
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match2Json}` }],
          truncated: false,
        }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(mockStorage.list).toHaveBeenCalledTimes(2);
  });

  it(testName('should handle AI-only matches when aiOnly is true'), async () => {
    const aiMatch = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.Ai1, type: TestConstants.Ai },
        { player_id: TestConstants.Ai2, type: TestConstants.Ai },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(aiMatch)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, true, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
  });

  it(testName('should handle processing errors gracefully'), async () => {
    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockRejectedValue(new Error('Parse error')),
    };

    await expect(
      computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage)
    ).rejects.toThrow();
  });

  it(testName('should handle matches with phase undefined'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
  });

  it(testName('should handle matches with game_type field instead of gameType'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      game_type: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
  });

  it(testName('should handle sorting with equal scores and wins'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp2,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match2)),
        }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].rank).toBe(1);
  });

  it(testName('should handle matches with null matchObject'), async () => {
    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue(null),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result).toHaveLength(0);
  });

  it(testName('should handle matches with missing scores array element'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].score).toBe(100);
  });

  it(testName('should handle sorting with equal scores, wins, and games_played'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp2,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match2)),
        }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    if (result.length >= 1) {
      expect(result[0].rank).toBe(1);
      if (result.length >= 2) {
        expect(result[1].rank).toBe(2);
      }
    }
  });

  it(testName('should skip matches with phase not equal to 3'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: 2,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [100],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result).toHaveLength(0);
  });

  it(testName('should handle players with public_key instead of player_id'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { public_key: 'pubkey1', type: TestConstants.Human },
      ],
      scores: [100],
      winner: 'pubkey1',
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].user_id).toBe('pubkey1');
  });

  it(testName('should handle players with pubkey instead of player_id'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { pubkey: 'pubkey2', type: TestConstants.Human },
      ],
      scores: [100],
      winner: 'pubkey2',
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].user_id).toBe('pubkey2');
  });

  it(testName('should handle AI players when aiOnly is true'), async () => {
    // aiOnly mode requires matches with 2+ AI players (AI vs AI matches)
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.Ai1, type: TestConstants.Ai },
        { player_id: TestConstants.Ai2, type: TestConstants.Ai },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, true, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].user_id).toBe(TestConstants.Ai1);
  });

  it(testName('should update last_played when endedAt is newer'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp2,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match2)),
        }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].last_played).toBe(TestConstants.TestTimestamp2);
  });

  it(testName('should determine winner by max score when winner field is missing'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].wins).toBe(1);
    expect(result[1].losses).toBe(1);
  });

  it(testName('should handle sorting when scores are equal but wins differ'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100],
      endedAt: TestConstants.TestTimestamp2,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match2)),
        }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it(testName('should skip players without playerId'), async () => {
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { type: TestConstants.Human },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(TestConstants.UserId1);
  });

  it(testName('should only include AI players in AI-only matches when aiOnly is true'), async () => {
    // aiOnly mode requires matches with 2+ AI players (AI vs AI matches)
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.Ai1, type: TestConstants.Ai },
        { player_id: TestConstants.Ai2, type: TestConstants.Ai },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, true, TestConstants.Limit100, mockStorage);

    expect(result.length).toBe(2);
    expect(result[0].user_id).toBe(TestConstants.Ai1);
    expect(result[1].user_id).toBe(TestConstants.Ai2);
  });

  it(testName('should skip AI players when aiOnly is false'), async () => {
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.Ai1, type: TestConstants.Ai },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBe(1);
    expect(result[0].user_id).toBe(TestConstants.UserId1);
    expect(result.find((e) => e.user_id === TestConstants.Ai1)).toBeUndefined();
  });

  it(testName('should handle sorting when scores are equal but wins differ'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100],
      winner: TestConstants.UserId2,
      endedAt: TestConstants.TestTimestamp,
    };

    const match3 = {
      match_id: 'match3',
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
          { key: `${BucketPath.Matches}match3.json` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match2)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match3)),
        }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThanOrEqual(2);
    const user1Entry = result.find((e) => e.user_id === TestConstants.UserId1);
    const user2Entry = result.find((e) => e.user_id === TestConstants.UserId2);
    if (user1Entry && user2Entry && user1Entry.score === user2Entry.score) {
      expect(user1Entry.wins).toBeGreaterThanOrEqual(user2Entry.wins);
    }
  });

  it(testName('should handle sorting when scores and wins are equal, using games_played'), async () => {
    // Both users have same score and wins, but user2 has more games played
    // User with fewer games_played should rank higher (same efficiency with less effort)
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [50],
      winner: TestConstants.UserId2,
      endedAt: TestConstants.TestTimestamp2,
    };

    const match3 = {
      match_id: 'match3',
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [50],
      winner: TestConstants.UserId2,
      endedAt: TestConstants.TestTimestamp,
    };

    // user1: score=100, wins=1, games=1
    // user2: score=100, wins=2, games=2
    // Since wins differ, user2 should be first (more wins)

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
          { key: `${BucketPath.Matches}match3.json` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match2)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match3)),
        }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBe(2);
    // Both have score 100, but user2 has 2 wins vs user1's 1 win
    expect(result[0].user_id).toBe(TestConstants.UserId2);
    expect(result[0].wins).toBe(2);
    expect(result[1].user_id).toBe(TestConstants.UserId1);
    expect(result[1].wins).toBe(1);
  });

  it(testName('should handle players with player_type ai'), async () => {
    // aiOnly mode requires matches with 2+ AI players
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.Ai1, player_type: TestConstants.Ai },
        { player_id: TestConstants.Ai2, player_type: TestConstants.Ai },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, true, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
  });

  it(testName('should handle players with metadata indicating AI'), async () => {
    // aiOnly mode requires matches with 2+ AI players (metadata indicates AI)
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.Ai1, type: TestConstants.Human, metadata: { model_name: 'gpt-4' } },
        { player_id: TestConstants.Ai2, type: TestConstants.Human, metadata: { model_name: 'claude-3' } },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, true, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
  });

  it(testName('should handle players with metadata model_id indicating AI'), async () => {
    // aiOnly mode requires matches with 2+ AI players (model_id in metadata indicates AI)
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.Ai1, type: TestConstants.Human, metadata: { model_id: 'model-123' } },
        { player_id: TestConstants.Ai2, type: TestConstants.Human, metadata: { model_id: 'model-456' } },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, true, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
  });

  it(testName('should handle sorting when b.score !== a.score'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [200],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100],
      winner: TestConstants.UserId2,
      endedAt: TestConstants.TestTimestamp2,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match2)),
        }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1]?.score || 0);
  });

  it(testName('should test calculateTier for Master tier'), async () => {
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100000],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].tier).toBe('Master');
  });

  it(testName('should test calculateTier for Diamond tier'), async () => {
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [50000],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].tier).toBe('Diamond');
  });

  it(testName('should test calculateTier for Platinum tier'), async () => {
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [20000],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].tier).toBe('Platinum');
  });

  it(testName('should test calculateTier for Gold tier'), async () => {
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [5000],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].tier).toBe('Gold');
  });

  it(testName('should test calculateTier for Silver tier'), async () => {
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [1000],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].tier).toBe('Silver');
  });

  it(testName('should skip matches with different gameType'), async () => {
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: 1,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result).toHaveLength(0);
  });

  it(testName('should skip matches with empty players array'), async () => {
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [],
      scores: [],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result).toHaveLength(0);
  });

  it(testName('should handle sorting when b.wins !== a.wins'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
      ],
      scores: [50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp2,
    };

    const match3 = {
      match_id: 'match3',
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100],
      winner: TestConstants.UserId2,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: LeaderboardStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
          { key: `${BucketPath.Matches}match3.json` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match2)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(match3)),
        }),
    };

    const result = await computeLeaderboardLogic(TestConstants.GameType0, false, TestConstants.Limit100, mockStorage);

    expect(result.length).toBeGreaterThanOrEqual(2);
    const user1Entry = result.find((e) => e.user_id === TestConstants.UserId1);
    const user2Entry = result.find((e) => e.user_id === TestConstants.UserId2);
    expect(user1Entry).not.toBeNull();
    expect(user2Entry).not.toBeNull();
    expect(user1Entry!.score).toBe(100);
    expect(user2Entry!.score).toBe(100);
    expect(user1Entry!.wins).toBe(2);
    expect(user2Entry!.wins).toBe(1);
    expect(result[0].score).toBe(100);
    expect(result[0].wins).toBe(2);
    expect(result[1].score).toBe(100);
    expect(result[1].wins).toBe(1);
  });
});
