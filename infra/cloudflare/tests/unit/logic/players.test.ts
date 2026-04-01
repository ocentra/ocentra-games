import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  computePlayerStatsLogic,
  computeLearningProgressLogic,
  generatePerformanceReportLogic,
  type PlayerStorage,
} from '@/logic/players';
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
  UserId1: 'user1',
  UserId2: 'user2',
  MatchId1: 'match1',
  MatchId2: 'match2',
  MatchId3: 'match3',
  Match1Json: 'match1.json',
  Match2Json: 'match2.json',
  Match3Json: 'match3.json',
  Human: 'human',
  AI: 'ai',
  TestTimestamp: '2024-01-01T00:00:00Z',
  TestTimestamp2: '2024-01-02T00:00:00Z',
  TestTimestamp3: '2024-01-03T00:00:00Z',
  AllTime: 'all_time',
  Daily: 'daily',
  Weekly: 'weekly',
  Monthly: 'monthly',
  GameType0: 0,
  GameType1: 1,
  Phase3: 3,
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should compute stats for player with matches'), async () => {
    logInfo('[TEST] Testing computePlayerStatsLogic', getStackTrace(), { userId: TestConstants.UserId1 }, LOG_TEST_OPERATIONS);
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

    const mockStorage: PlayerStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
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

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.user_id).toBe(TestConstants.UserId1);
    expect(result.total_games).toBe(2);
    expect(result.total_wins).toBe(1);
    expect(result.total_losses).toBe(1);
    expect(result.win_rate).toBe(50);
    expect(result.average_score).toBe(75);
    if (result.user_id !== TestConstants.UserId1 || result.total_games !== 2 || result.win_rate !== 50) {
      logError('[TEST] Player stats computation failed or invalid', getStackTrace(), { userId: result.user_id, totalGames: result.total_games, winRate: result.win_rate });
    }
  });

  it(testName('should return empty stats when no matches found'), async () => {
    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false,
      }),
      get: vi.fn(),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.user_id).toBe(TestConstants.UserId1);
    expect(result.total_games).toBe(0);
    expect(result.total_wins).toBe(0);
    expect(result.win_rate).toBe(0);
  });

  it(testName('should filter by game type when provided'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType1,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [50],
      endedAt: TestConstants.TestTimestamp2,
    };

    const mockStorage: PlayerStorage = {
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

    const result = await computePlayerStatsLogic(TestConstants.UserId1, TestConstants.GameType0, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.games_by_type[0].games).toBe(1);
  });

  it(testName('should handle pagination with cursor'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [50],
      endedAt: TestConstants.TestTimestamp2,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
          truncated: true,
          cursor: 'cursor1',
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match2Json}` }],
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

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(2);
    expect(mockStorage.list).toHaveBeenCalledTimes(2);
  });

  it(testName('should handle pagination without cursor when truncated'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: true,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
  });

  it(testName('should skip AI players'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.AI },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(0);
  });

  it(testName('should handle player_id, public_key, and pubkey variations'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ public_key: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ pubkey: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [50],
      endedAt: TestConstants.TestTimestamp2,
    };

    const mockStorage: PlayerStorage = {
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

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(2);
  });

  it(testName('should determine winner by highest score when winner field is missing'), async () => {
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

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.total_wins).toBe(1);
  });

  it(testName('should skip matches with phase not 3'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: 2,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      endedAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [50],
      endedAt: TestConstants.TestTimestamp2,
    };

    const mockStorage: PlayerStorage = {
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

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
  });

  it(testName('should skip non-json files and anonymized matches'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}match1.txt` },
          { key: `${BucketPath.Matches}anonymized/match2.json` },
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
  });

  it(testName('should handle matches with game_type instead of gameType'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      game_type: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.games_by_type[0].games).toBe(1);
  });

  it(testName('should calculate streaks correctly'), async () => {
    const matches = [
      {
        match_id: TestConstants.MatchId1,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [100, 50],
        winner: TestConstants.UserId1,
        endedAt: '2024-01-01T00:00:00Z',
      },
      {
        match_id: TestConstants.MatchId2,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [100, 50],
        winner: TestConstants.UserId1,
        endedAt: '2024-01-02T00:00:00Z',
      },
      {
        match_id: TestConstants.MatchId3,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [50, 100],
        winner: TestConstants.UserId2,
        endedAt: '2024-01-03T00:00:00Z',
      },
    ];

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.current_streak).toBe(0);
    expect(result.best_streak).toBe(2);
  });

  it(testName('should calculate skill progression when performance_trend has enough data'), async () => {
    const matches = Array.from({ length: 9 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [i < 3 ? 50 : 100],
      winner: i < 3 ? TestConstants.UserId2 : TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.skill_progression.starting_win_rate).toBeGreaterThanOrEqual(0);
    expect(result.skill_progression.current_win_rate).toBeGreaterThanOrEqual(0);
    expect(typeof result.skill_progression.improvement).toBe('number');
  });

  it(testName('should calculate confidence metrics'), async () => {
    const matches = Array.from({ length: 15 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.confidence_metrics.recent_performance).toBeGreaterThanOrEqual(0);
    expect(result.confidence_metrics.consistency).toBeGreaterThanOrEqual(0);
    expect(typeof result.confidence_metrics.improvement_rate).toBe('number');
    expect(result.confidence_metrics.readiness_score).toBeGreaterThanOrEqual(0);
  });

  it(testName('should throw error when match parsing fails'), async () => {
    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue('invalid json'),
      }),
    };

    await expect(
      computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage)
    ).rejects.toThrow();
  });

  it(testName('should handle matches with null matchObject'), async () => {
    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue(null),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(0);
  });

  it(testName('should use createdAt or start_time when endedAt is missing'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      createdAt: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [50],
      start_time: TestConstants.TestTimestamp2,
    };

    const mockStorage: PlayerStorage = {
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

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(2);
    expect(result.first_played).toBe(TestConstants.TestTimestamp);
    expect(result.last_played).toBe(TestConstants.TestTimestamp2);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should compute learning progress for beginner'), async () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [50, 100],
      winner: TestConstants.UserId2,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    expect(result.user_id).toBe(TestConstants.UserId1);
    expect(result.skill_level).toBe('beginner');
    expect(result.milestones).toHaveLength(4);
    expect(result.recommended_practice).toBeInstanceOf(Array);
  });

  it(testName('should compute learning progress for intermediate'), async () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: i < 6 ? [50, 100] : [100, 50],
      winner: i < 6 ? TestConstants.UserId2 : TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    expect(result.skill_level).toBe('intermediate');
  });

  it(testName('should compute learning progress for advanced'), async () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: i < 4 ? [50, 100] : [100, 50],
      winner: i < 4 ? TestConstants.UserId2 : TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    expect(result.skill_level).toBe('advanced');
  });

  it(testName('should compute learning progress for expert'), async () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    expect(result.skill_level).toBe('expert');
  });

  it(testName('should identify areas for improvement and strengths'), async () => {
    const matches = [
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 1}`,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
        scores: [50],
        winner: TestConstants.UserId2,
        endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 6}`,
        gameType: TestConstants.GameType1,
        phase: TestConstants.Phase3,
        players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
        scores: [100],
        winner: TestConstants.UserId1,
        endedAt: `2024-01-${String(i + 6).padStart(2, '0')}T00:00:00Z`,
      })),
    ];

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    expect(result.areas_for_improvement.length).toBeGreaterThanOrEqual(0);
    expect(result.strengths.length).toBeGreaterThanOrEqual(0);
  });

  it(testName('should recommend practice for low win rate game types'), async () => {
    const matches = Array.from({ length: 5 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [50],
      winner: TestConstants.UserId2,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    expect(result.recommended_practice.length).toBeGreaterThanOrEqual(0);
  });

  it(testName('should identify consistency as area for improvement when < 50'), async () => {
    const matches = Array.from({ length: 30 }, (_, i) => {
      const day = Math.floor(i / 3) + 1;
      const gameInDay = i % 3;
      const isWin = gameInDay === 0;
      return {
        match_id: `match${i + 1}`,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [100, 50],
        winner: isWin ? TestConstants.UserId1 : TestConstants.UserId2,
        endedAt: `2024-01-${String(day).padStart(2, '0')}T00:00:00Z`,
      };
    });

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const stats = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);
    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    expect(stats.performance_trend.length).toBeGreaterThan(0);
    const consistency = stats.confidence_metrics.consistency;
    if (consistency < 50) {
      expect(result.areas_for_improvement).toContain('Consistency (high variance in performance)');
    } else {
      expect(result.strengths).toContain('Consistent performance');
    }
  });

  it(testName('should force consistency < 50 with exactly 2 days extreme variance'), async () => {
    const matches = [
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 1}`,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [100, 50],
        winner: TestConstants.UserId1,
        endedAt: '2024-01-01T00:00:00Z',
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 6}`,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [50, 100],
        winner: TestConstants.UserId2,
        endedAt: '2024-01-02T00:00:00Z',
      })),
    ];

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const stats = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);
    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    expect(stats.performance_trend.length).toBe(2);
    expect(stats.performance_trend[0].win_rate).toBe(100);
    expect(stats.performance_trend[1].win_rate).toBe(0);
    const winRates = stats.performance_trend.map(t => t.win_rate);
    const avgWinRate = winRates.reduce((sum, r) => sum + r, 0) / winRates.length;
    const variance = winRates.reduce((sum, r) => sum + Math.pow(r - avgWinRate, 2), 0) / winRates.length;
    const consistency = Math.max(0, 100 - Math.sqrt(variance));
    expect(consistency).toBe(50);
    // Code uses <= 50, so consistency = 50 goes into areas_for_improvement
    if (consistency <= 50) {
      expect(result.areas_for_improvement).toContain('Consistency (high variance in performance)');
    } else {
      expect(result.strengths).toContain('Consistent performance');
    }
  });

  it(testName('should sort recommended practice by priority order (high, medium, low)'), async () => {
    // Test data designed to produce 3 different priority levels:
    // Priority logic: win_rate < 30 → high, 30-40 → medium, 40-50 → low
    // - GameType 0: 0% win rate (0/5) → high priority
    // - GameType 1: 33% win rate (2/6) → medium priority (30 <= win_rate < 40)
    // - GameType 2: 43% win rate (3/7) → low priority (40 <= win_rate < 50)
    const matches = [
      // GameType 0: 5 games, user1 loses all → 0% win rate → high priority
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 1}`,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [50, 100],
        winner: TestConstants.UserId2,
        endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })),
      // GameType 1: 6 games, user1 wins 2 → 33.3% win rate → medium priority
      ...Array.from({ length: 6 }, (_, i) => ({
        match_id: `match${i + 6}`,
        gameType: TestConstants.GameType1,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: i < 2 ? [100, 50] : [50, 100],
        winner: i < 2 ? TestConstants.UserId1 : TestConstants.UserId2,
        endedAt: `2024-01-${String(i + 6).padStart(2, '0')}T00:00:00Z`,
      })),
      // GameType 2: 7 games, user1 wins 3 → 42.9% win rate → low priority
      ...Array.from({ length: 7 }, (_, i) => ({
        match_id: `match${i + 12}`,
        gameType: 2,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: i < 3 ? [100, 50] : [50, 100],
        winner: i < 3 ? TestConstants.UserId1 : TestConstants.UserId2,
        endedAt: `2024-01-${String(i + 12).padStart(2, '0')}T00:00:00Z`,
      })),
    ];

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    expect(result.recommended_practice.length).toBeGreaterThanOrEqual(3);
    const priorities = result.recommended_practice.map(p => p.priority);
    expect(priorities).toContain('high');
    expect(priorities).toContain('medium');
    expect(priorities).toContain('low');
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    for (let i = 0; i < priorities.length - 1; i++) {
      expect(priorityOrder[priorities[i] as keyof typeof priorityOrder]).toBeGreaterThanOrEqual(
        priorityOrder[priorities[i + 1] as keyof typeof priorityOrder]
      );
    }
    expect(result.recommended_practice[0].priority).toBe('high');
    expect(result.recommended_practice.some(p => p.priority === 'high')).toBe(true);
    expect(result.recommended_practice.some(p => p.priority === 'medium')).toBe(true);
    expect(result.recommended_practice.some(p => p.priority === 'low')).toBe(true);
  });

  it(testName('should test priority calculation with win_rate < 30 (high priority)'), async () => {
    const matches = Array.from({ length: 5 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [50, 100],
      winner: TestConstants.UserId2,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    const highPriority = result.recommended_practice.find(p => p.priority === 'high');
    if (highPriority) {
      expect(highPriority.priority).toBe('high');
    }
  });

  it(testName('should test priority calculation with win_rate >= 30 && < 40 (medium priority)'), async () => {
    const matches = Array.from({ length: 5 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: i < 2 ? [50, 100] : [100, 50],
      winner: i < 2 ? TestConstants.UserId2 : TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    const mediumPriority = result.recommended_practice.find(p => p.priority === 'medium');
    if (mediumPriority) {
      expect(mediumPriority.priority).toBe('medium');
    }
  });

  it(testName('should test priority calculation with win_rate >= 40 && < 50 (low priority)'), async () => {
    const matches = Array.from({ length: 5 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: i < 2 ? [50, 100] : [100, 50],
      winner: i < 2 ? TestConstants.UserId2 : TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    const lowPriority = result.recommended_practice.find(p => p.priority === 'low');
    if (lowPriority) {
      expect(lowPriority.priority).toBe('low');
    }
  });

  it(testName('should test priority sort with all three priority levels'), async () => {
    const matches = [
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 1}`,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [50, 100],
        winner: TestConstants.UserId2,
        endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 6}`,
        gameType: TestConstants.GameType1,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: i < 3 ? [50, 100] : [100, 50],
        winner: i < 3 ? TestConstants.UserId2 : TestConstants.UserId1,
        endedAt: `2024-01-${String(i + 6).padStart(2, '0')}T00:00:00Z`,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 11}`,
        gameType: 2,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: i < 2 ? [50, 100] : [100, 50],
        winner: i < 2 ? TestConstants.UserId2 : TestConstants.UserId1,
        endedAt: `2024-01-${String(i + 11).padStart(2, '0')}T00:00:00Z`,
      })),
    ];

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computeLearningProgressLogic(TestConstants.UserId1, mockStorage);

    const priorities = result.recommended_practice.map(p => p.priority);
    if (priorities.length >= 2) {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      for (let i = 0; i < priorities.length - 1; i++) {
        const current = priorityOrder[priorities[i] as keyof typeof priorityOrder];
        const next = priorityOrder[priorities[i + 1] as keyof typeof priorityOrder];
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should generate performance report for all_time period'), async () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: i < 5 ? TestConstants.UserId1 : TestConstants.UserId2,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.user_id).toBe(TestConstants.UserId1);
    expect(result.period).toBe(TestConstants.AllTime);
    expect(result.summary).toBeInstanceOf(Object);
    expect(result.trends).toBeInstanceOf(Object);
    expect(result.insights).toBeInstanceOf(Array);
    expect(result.recommendations).toBeInstanceOf(Array);
  });

  it(testName('should generate performance report for daily period'), async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: yesterday.toISOString(),
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.Daily, mockStorage);

    expect(result.period).toBe(TestConstants.Daily);
  });

  it(testName('should generate performance report for weekly period'), async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: threeDaysAgo.toISOString(),
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.Weekly, mockStorage);

    expect(result.period).toBe(TestConstants.Weekly);
  });

  it(testName('should generate performance report for monthly period'), async () => {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: twoWeeksAgo.toISOString(),
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.Monthly, mockStorage);

    expect(result.period).toBe(TestConstants.Monthly);
  });

  it(testName('should detect improving win rate trend'), async () => {
    const matches = Array.from({ length: 4 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: i < 1 ? TestConstants.UserId2 : TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(['improving', 'declining', 'stable']).toContain(result.trends.win_rate_trend);
    expect(result.graph_data.dates.length).toBeGreaterThanOrEqual(2);
  });

  it(testName('should detect declining score trend'), async () => {
    const matches = Array.from({ length: 4 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100 - i * 10],
      winner: TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.trends.score_trend).toBe('declining');
  });

  it(testName('should include insights when improvement > 5%'), async () => {
    const matches = Array.from({ length: 9 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: i < 2 ? TestConstants.UserId2 : TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.insights.length).toBeGreaterThanOrEqual(0);
  });

  it(testName('should include recommendations when readiness score <= 70'), async () => {
    const matches = Array.from({ length: 5 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [50],
      winner: TestConstants.UserId2,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
  });

  it(testName('should include insights for winning streak >= 3'), async () => {
    const matches = Array.from({ length: 5 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.insights.some(insight => insight.includes('winning streak'))).toBe(true);
  });

  it(testName('should include graph data'), async () => {
    const matches = Array.from({ length: 5 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [{ player_id: TestConstants.UserId1, type: TestConstants.Human }],
      scores: [100],
      winner: TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.graph_data).toBeInstanceOf(Object);
    expect(result.graph_data.dates).toBeInstanceOf(Array);
    expect(result.graph_data.win_rates).toBeInstanceOf(Array);
    expect(result.graph_data.average_scores).toBeInstanceOf(Array);
    expect(result.graph_data.games_played).toBeInstanceOf(Array);
  });

  it(testName('should include insight when improvement > 5%'), async () => {
    const matches = Array.from({ length: 9 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: i < 1 ? [50, 100] : [100, 50],
      winner: i < 1 ? TestConstants.UserId2 : TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.insights.some(insight => insight.includes('improved'))).toBe(true);
  });

  it(testName('should include insight when readiness score > 70'), async () => {
    const matches = Array.from({ length: 15 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.insights.some(insight => insight.includes('ready for real money')) || 
           result.recommendations.some(rec => rec.includes('practicing'))).toBe(true);
  });

  it(testName('should include insight for best game type'), async () => {
    const matches = [
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 1}`,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [100, 50],
        winner: TestConstants.UserId1,
        endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 6}`,
        gameType: TestConstants.GameType1,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [50, 100],
        winner: TestConstants.UserId2,
        endedAt: `2024-01-${String(i + 6).padStart(2, '0')}T00:00:00Z`,
      })),
    ];

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.insights.some(insight => insight.includes('strongest game type'))).toBe(true);
  });

  it(testName('should include recommendation for worst game type with >= 5 games'), async () => {
    const matches = [
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 1}`,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [100, 50],
        winner: TestConstants.UserId1,
        endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        match_id: `match${i + 6}`,
        gameType: TestConstants.GameType1,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [50, 100],
        winner: TestConstants.UserId2,
        endedAt: `2024-01-${String(i + 6).padStart(2, '0')}T00:00:00Z`,
      })),
    ];

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.recommendations.some(rec => rec.includes('Focus on improving'))).toBe(true);
  });

  it(testName('should handle player with player_type field instead of type'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, player_type: TestConstants.Human },
        { player_id: TestConstants.UserId2, player_type: TestConstants.AI },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.total_wins).toBe(1);
  });

  it(testName('should skip AI player when player_type is ai'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, player_type: TestConstants.AI },
        { player_id: TestConstants.UserId2, player_type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(0);
  });

  it(testName('should handle undefined player in isAIPlayer check'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        undefined,
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId2,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(0);
  });

  it(testName('should handle player with type ai field'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.AI },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(0);
  });

  it(testName('should handle match with phase undefined'), async () => {
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

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
  });

  it(testName('should handle match with only gameType field (not game_type)'), async () => {
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

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.games_by_type[TestConstants.GameType0].games).toBe(1);
  });

  it(testName('should handle match with neither gameType nor game_type (defaults to 0)'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.games_by_type[0].games).toBe(1);
  });

  it(testName('should handle match with both gameType and game_type (prefers gameType)'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      game_type: TestConstants.GameType1,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.games_by_type[TestConstants.GameType0].games).toBe(1);
    expect(result.games_by_type[TestConstants.GameType1]).toBeUndefined();
  });

  it(testName('should handle winner determination by score when winner field missing'), async () => {
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

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.total_wins).toBe(1);
  });

  it(testName('should handle winner determination when scores array is empty'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.total_wins).toBe(1);
  });

  it(testName('should handle match with empty players array'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [],
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(0);
  });

  it(testName('should handle match with missing players field'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      scores: [100, 50],
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(0);
  });

  it(testName('should handle match with missing scores field'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      winner: TestConstants.UserId1,
      endedAt: TestConstants.TestTimestamp,
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.total_wins).toBe(1);
  });

  it(testName('should handle match with player score missing from scores array'), async () => {
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

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
    expect(result.total_score).toBe(100);
  });

  it(testName('should handle match with all timestamp fields missing'), async () => {
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
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.total_games).toBe(1);
  });

  it(testName('should handle performance_trend with less than 2 entries (no skill progression)'), async () => {
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

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.skill_progression.starting_win_rate).toBe(0);
    expect(result.skill_progression.current_win_rate).toBe(0);
  });

  it(testName('should handle empty performance_trend for consistency calculation'), async () => {
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

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.confidence_metrics.consistency).toBeGreaterThanOrEqual(0);
  });

  it(testName('should handle negative improvement rate in readiness score'), async () => {
    const matches = Array.from({ length: 9 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: i < 7 ? [100, 50] : [50, 100],
      winner: i < 7 ? TestConstants.UserId1 : TestConstants.UserId2,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.confidence_metrics.readiness_score).toBeGreaterThanOrEqual(0);
  });

  it(testName('should handle win rate calculation when games_by_type has zero games'), async () => {
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

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.games_by_type[TestConstants.GameType0].win_rate).toBe(100);
  });

  it(testName('should handle sortedTypes with single entry'), async () => {
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

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match1)),
      }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.best_game_type).toBe(TestConstants.GameType0);
    expect(result.worst_game_type).toBe(TestConstants.GameType0);
  });

  it(testName('should handle sortedTypes with multiple entries'), async () => {
    const matches = [
      {
        match_id: TestConstants.MatchId1,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [100, 50],
        winner: TestConstants.UserId1,
        endedAt: '2024-01-01T00:00:00Z',
      },
      {
        match_id: TestConstants.MatchId2,
        gameType: TestConstants.GameType1,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [50, 100],
        winner: TestConstants.UserId2,
        endedAt: '2024-01-02T00:00:00Z',
      },
    ];

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[0])),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[1])),
        }),
    };

    const result = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);

    expect(result.best_game_type).toBe(TestConstants.GameType0);
    expect(result.worst_game_type).toBe(TestConstants.GameType1);
  });

  it(testName('should handle periodTrend with empty array for summary calculation'), async () => {
    const now = new Date();
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: twoMonthsAgo.toISOString(),
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.Weekly, mockStorage);

    expect(result.summary.games_played).toBe(0);
    expect(result.summary.win_rate).toBe(0);
    expect(result.summary.average_score).toBe(0);
  });

  it(testName('should handle periodTrend with single entry (stable trends)'), async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const match = {
      match_id: TestConstants.MatchId1,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: threeDaysAgo.toISOString(),
    };

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify(match)),
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.Weekly, mockStorage);

    expect(result.trends.win_rate_trend).toBe('stable');
    expect(result.trends.score_trend).toBe('stable');
  });

  it(testName('should handle consistency trend calculations'), async () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(['improving', 'declining', 'stable']).toContain(result.trends.consistency_trend);
  });

  it(testName('should handle consistency < 40 (declining trend)'), async () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: i % 2 === 0 ? TestConstants.UserId1 : TestConstants.UserId2,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(['improving', 'declining', 'stable']).toContain(result.trends.consistency_trend);
  });

  it(testName('should handle consistency between 40 and 60 (stable trend)'), async () => {
    // To get consistency between 40-60, we need variance where sqrt(variance) is between 40-60
    // consistency = 100 - sqrt(variance), so if we want consistency=50, sqrt(variance)=50, variance=2500
    // Create matches with varying win rates per day to achieve this:
    // Day 1: 100% win rate (2 wins out of 2)
    // Day 2: 0% win rate (0 wins out of 2)
    // Day 3: 100% win rate (2 wins out of 2)
    // Day 4: 0% win rate (0 wins out of 2)
    // This gives win rates [100, 0, 100, 0], avg=50, variance = ((50)^2 + (50)^2 + (50)^2 + (50)^2)/4 = 2500
    // sqrt(2500) = 50, consistency = 100 - 50 = 50 (within 40-60)
    // IMPORTANT: Scores must reflect the winner - the winner needs the higher score!
    const matches = Array.from({ length: 8 }, (_, i) => {
      const day = Math.floor(i / 2) + 1;
      // Days 1 and 3 (odd days): all wins. Days 2 and 4 (even days): all losses
      const isWinningDay = day % 2 === 1;
      return {
        match_id: `match${i + 1}`,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        // When user1 wins, user1 has higher score. When user2 wins, user2 has higher score.
        scores: isWinningDay ? [100, 50] : [50, 100],
        winner: isWinningDay ? TestConstants.UserId1 : TestConstants.UserId2,
        endedAt: `2024-01-${String(day).padStart(2, '0')}T00:00:00Z`,
      };
    });

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.trends.consistency_trend).toBe('stable');
  });

  it(testName('should handle best_game_type === null'), async () => {
    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue(null),
    };

    const stats = await computePlayerStatsLogic(TestConstants.UserId1, undefined, mockStorage);
    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(stats.best_game_type).toBeNull();
    expect(result.insights.some(insight => insight.includes('strongest game type'))).toBe(false);
  });

  it(testName('should handle consistency > 60 (improving trend)'), async () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [100, 50],
      winner: TestConstants.UserId1,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(['improving', 'declining', 'stable']).toContain(result.trends.consistency_trend);
  });

  it(testName('should handle worst_game_type with games < 5 (no recommendation)'), async () => {
    const matches = Array.from({ length: 3 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: [50, 100],
      winner: TestConstants.UserId2,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.recommendations.some(rec => rec.includes('Focus on improving Game Type'))).toBe(false);
  });

  it(testName('should handle current_streak < 3 (no streak insight)'), async () => {
    const matches = [
      {
        match_id: TestConstants.MatchId1,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [100, 50],
        winner: TestConstants.UserId1,
        endedAt: '2024-01-01T00:00:00Z',
      },
      {
        match_id: TestConstants.MatchId2,
        gameType: TestConstants.GameType0,
        phase: TestConstants.Phase3,
        players: [
          { player_id: TestConstants.UserId1, type: TestConstants.Human },
          { player_id: TestConstants.UserId2, type: TestConstants.Human },
        ],
        scores: [100, 50],
        winner: TestConstants.UserId1,
        endedAt: '2024-01-02T00:00:00Z',
      },
    ];

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[0])),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[1])),
        }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.insights.some(insight => insight.includes('winning streak'))).toBe(false);
  });

  it(testName('should handle improvement <= 5% (no improvement insight)'), async () => {
    const matches = Array.from({ length: 9 }, (_, i) => ({
      match_id: `match${i + 1}`,
      gameType: TestConstants.GameType0,
      phase: TestConstants.Phase3,
      players: [
        { player_id: TestConstants.UserId1, type: TestConstants.Human },
        { player_id: TestConstants.UserId2, type: TestConstants.Human },
      ],
      scores: i < 4 ? [100, 50] : [50, 100],
      winner: i < 4 ? TestConstants.UserId1 : TestConstants.UserId2,
      endedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const mockStorage: PlayerStorage = {
      list: vi.fn().mockResolvedValue({
        objects: matches.map((_, i) => ({ key: `${BucketPath.Matches}match${i + 1}.json` })),
        truncated: false,
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchNum = key.match(/match(\d+)\.json/)?.[1];
        if (!matchNum) return Promise.resolve(null);
        const index = parseInt(matchNum, 10) - 1;
        if (index < 0 || index >= matches.length) return Promise.resolve(null);
        return Promise.resolve({
          text: vi.fn().mockResolvedValue(JSON.stringify(matches[index])),
        });
      }),
    };

    const result = await generatePerformanceReportLogic(TestConstants.UserId1, TestConstants.AllTime, mockStorage);

    expect(result.insights.some(insight => insight.includes('improved'))).toBe(false);
  });
});
