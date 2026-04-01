import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  listMatchesLogic,
  listBenchmarksLogic,
  type ExploreStorage,
} from '@/logic/explore';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
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
  MatchId1: asMatchId('550e8400-e29b-41d4-a716-446655440010'),
  MatchId2: asMatchId('550e8400-e29b-41d4-a716-446655440011'),
  MatchId3: asMatchId('550e8400-e29b-41d4-a716-446655440012'),
  Match1Json: 'match1.json',
  Match2Json: 'match2.json',
  Match3Json: 'match3.json',
  Match2Txt: 'match2.txt',
  AnonymizedMatch2Json: 'matches/anonymized/match2.json',
  TestTimestamp: '2024-01-01T00:00:00Z',
  TestTimestamp2: '2024-01-02T00:00:00Z',
  TestTimestamp3: '2024-01-03T00:00:00Z',
  StorageError: 'Storage error',
  InvalidJson: 'invalid json',
  Cursor1: 'cursor1',
  Ai1: 'ai1',
  Ai2: 'ai2',
  Human1: 'human1',
  Model1: 'model1',
  Model2: 'model2',
  Id1: 'id1',
  AiVsAi: 'ai_vs_ai',
  AiVsHuman: 'ai_vs_human',
  All: 'all',
  MaxMatches: 1000,
  BatchLimit: 100,
  Limit100: 100,
  Limit50: 50,
  Limit2000: 2000,
  MaxLimit: 1000,
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  logInfo('[TEST] Starting listMatchesLogic tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  it(testName('should return empty array when no matches found'), async () => {
    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false,
      }),
      get: vi.fn(),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.matches).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.total_fetched).toBe(0);
    if (!result.success || result.matches.length !== 0 || result.count !== 0) {
      logError('[TEST] Explore list failed or invalid for empty result', getStackTrace(), { success: result.success, matchCount: result.matches.length, count: result.count });
    }
  });

  it(testName('should list matches from storage'), async () => {
    const match1 = { match_id: TestConstants.MatchId1, start_time: TestConstants.TestTimestamp };
    const match2 = { match_id: TestConstants.MatchId2, start_time: TestConstants.TestTimestamp2 };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match1)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match2)) }),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.matches).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(result.total_fetched).toBe(2);
    expect(mockStorage.list).toHaveBeenCalledWith({
      prefix: BucketPath.Matches,
      limit: TestConstants.BatchLimit,
    });
  });

  it(testName('should exclude anonymized matches'), async () => {
    const match1 = { match_id: TestConstants.MatchId1, start_time: TestConstants.TestTimestamp };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: TestConstants.AnonymizedMatch2Json },
        ],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match1)) }),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.matches).toHaveLength(1);
    const firstMatch = result.matches[0] as { match_id: string; start_time: string };
    expect(firstMatch.match_id).toBe(TestConstants.MatchId1);
    expect(firstMatch.start_time).toBe(TestConstants.TestTimestamp);
  });

  it(testName('should exclude non-JSON files'), async () => {
    const match1 = { match_id: TestConstants.MatchId1, start_time: TestConstants.TestTimestamp };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Txt}` },
        ],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match1)) }),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.matches).toHaveLength(1);
  });

  it(testName('should sort matches by start_time descending'), async () => {
    const match1 = { match_id: TestConstants.MatchId1, start_time: TestConstants.TestTimestamp };
    const match2 = { match_id: TestConstants.MatchId2, start_time: TestConstants.TestTimestamp3 };
    const match3 = { match_id: TestConstants.MatchId3, start_time: TestConstants.TestTimestamp2 };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match3Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match1)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match2)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match3)) }),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.matches).toHaveLength(3);
    expect((result.matches[0] as { match_id: string }).match_id).toBe(TestConstants.MatchId2);
    expect((result.matches[1] as { match_id: string }).match_id).toBe(TestConstants.MatchId3);
    expect((result.matches[2] as { match_id: string }).match_id).toBe(TestConstants.MatchId1);
  });

  it(testName('should use createdAt as fallback for sorting'), async () => {
    const match1 = { match_id: TestConstants.MatchId1, createdAt: TestConstants.TestTimestamp };
    const match2 = { match_id: TestConstants.MatchId2, createdAt: TestConstants.TestTimestamp2 };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match1)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match2)) }),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(true);
    expect((result.matches[0] as { match_id: string }).match_id).toBe(TestConstants.MatchId2);
    expect((result.matches[1] as { match_id: string }).match_id).toBe(TestConstants.MatchId1);
  });

  it(testName('should handle pagination with cursor'), async () => {
    const match1 = { match_id: TestConstants.MatchId1, start_time: TestConstants.TestTimestamp };
    const match2 = { match_id: TestConstants.MatchId2, start_time: TestConstants.TestTimestamp2 };

    const mockStorage: ExploreStorage = {
      list: vi.fn()
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
          truncated: true,
          cursor: TestConstants.Cursor1,
        })
        .mockResolvedValueOnce({
          objects: [{ key: `${BucketPath.Matches}${TestConstants.Match2Json}` }],
          truncated: false,
        }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match1)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match2)) }),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.matches).toHaveLength(2);
    expect(mockStorage.list).toHaveBeenCalledTimes(2);
    expect(mockStorage.list).toHaveBeenNthCalledWith(2, {
      prefix: BucketPath.Matches,
      limit: TestConstants.BatchLimit,
      cursor: TestConstants.Cursor1,
    });
  });

  it(testName('should respect maxMatches limit'), async () => {
    const matches = Array.from({ length: 150 }, (_, i) => ({
      match_id: `match${i}`,
      start_time: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    let callCount = 0;
    const mockStorage: ExploreStorage = {
      list: vi.fn().mockImplementation(() => {
        callCount++;
        const start = (callCount - 1) * TestConstants.BatchLimit;
        const end = Math.min(start + TestConstants.BatchLimit, matches.length);
        return Promise.resolve({
          objects: matches.slice(start, end).map(m => ({ key: `${BucketPath.Matches}${m.match_id}.json` })),
          truncated: end < matches.length,
          cursor: end < matches.length ? `cursor${callCount}` : undefined,
        });
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchId = key.replace(`${BucketPath.Matches}`, '').replace('.json', '');
        const match = matches.find(m => m.match_id === matchId);
        return Promise.resolve(match ? { text: () => Promise.resolve(JSON.stringify(match)) } : null);
      }),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.Limit50, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(true);
    expect(result.matches.length).toBeLessThanOrEqual(TestConstants.Limit50);
  });

  it(testName('should handle parsing errors'), async () => {
    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(TestConstants.InvalidJson) }),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toBeTypeOf('string');
    expect(result.error?.length).toBeGreaterThan(0);
    expect(result.matches).toEqual([]);
    expect(result.count).toBe(0);
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage: ExploreStorage = {
      list: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      get: vi.fn(),
    };

    const result = await listMatchesLogic({ maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit }, mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
    expect(result.matches).toEqual([]);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should filter ai_vs_ai matches'), async () => {
    const aiMatch = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: TestConstants.Ai1, type: 'ai', metadata: { model_name: TestConstants.Model1 } },
        { player_id: TestConstants.Ai2, type: 'ai', metadata: { model_name: TestConstants.Model2 } },
      ],
      start_time: TestConstants.TestTimestamp,
    };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(JSON.stringify(aiMatch)) }),
    };

    const result = await listBenchmarksLogic(
      { matchType: TestConstants.AiVsAi, limit: TestConstants.Limit100, maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.benchmarks).toHaveLength(1);
    expect(result.match_type).toBe(TestConstants.AiVsAi);
  });

  it(testName('should filter ai_vs_human matches'), async () => {
    const mixedMatch = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: TestConstants.Ai1, type: 'ai', metadata: { model_name: TestConstants.Model1 } },
        { player_id: TestConstants.Human1, type: 'human' },
      ],
      start_time: TestConstants.TestTimestamp,
    };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(JSON.stringify(mixedMatch)) }),
    };

    const result = await listBenchmarksLogic(
      { matchType: TestConstants.AiVsHuman, limit: TestConstants.Limit100, maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.benchmarks).toHaveLength(1);
    expect(result.match_type).toBe(TestConstants.AiVsHuman);
  });

  it(testName('should filter by gameType when provided'), async () => {
    const match1 = {
      match_id: TestConstants.MatchId1,
      gameType: 1,
      players: [
        { player_id: TestConstants.Ai1, type: 'ai' },
        { player_id: TestConstants.Ai2, type: 'ai' },
      ],
      start_time: TestConstants.TestTimestamp,
    };

    const match2 = {
      match_id: TestConstants.MatchId2,
      gameType: 2,
      players: [
        { player_id: TestConstants.Ai1, type: 'ai' },
        { player_id: TestConstants.Ai2, type: 'ai' },
      ],
      start_time: TestConstants.TestTimestamp2,
    };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match1)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(match2)) }),
    };

    const result = await listBenchmarksLogic(
      { matchType: TestConstants.AiVsAi, gameType: '1', limit: TestConstants.Limit100, maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.benchmarks).toHaveLength(1);
    expect((result.benchmarks[0] as { match_id: string }).match_id).toBe(TestConstants.MatchId1);
  });

  it(testName('should include benchmark metadata'), async () => {
    const aiMatch = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: TestConstants.Ai1, type: 'ai', metadata: { model_name: TestConstants.Model1, model_id: TestConstants.Id1 } },
        { player_id: TestConstants.Ai2, type: 'ai', metadata: { model_name: TestConstants.Model2 } },
      ],
      start_time: TestConstants.TestTimestamp,
    };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(JSON.stringify(aiMatch)) }),
    };

    const result = await listBenchmarksLogic(
      { matchType: TestConstants.AiVsAi, limit: TestConstants.Limit100, maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit },
      mockStorage
    );

    expect(result.success).toBe(true);
    const benchmark = result.benchmarks[0] as Record<string, unknown>;
    expect(benchmark.benchmark_type).toBe(TestConstants.AiVsAi);
    expect(benchmark.ai_players).toBeTypeOf('object');
    expect(Array.isArray(benchmark.ai_players)).toBe(true);
    expect(Array.isArray(benchmark.ai_players)).toBe(true);
    expect((benchmark.ai_players as Array<unknown>).length).toBe(2);
  });

  it(testName('should calculate stats correctly'), async () => {
    const aiVsAiMatch = {
      match_id: TestConstants.MatchId1,
      players: [
        { player_id: TestConstants.Ai1, type: 'ai' },
        { player_id: TestConstants.Ai2, type: 'ai' },
      ],
      start_time: TestConstants.TestTimestamp,
    };

    const aiVsHumanMatch = {
      match_id: TestConstants.MatchId2,
      players: [
        { player_id: TestConstants.Ai1, type: 'ai' },
        { player_id: TestConstants.Human1, type: 'human' },
      ],
      start_time: TestConstants.TestTimestamp2,
    };

    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: `${BucketPath.Matches}${TestConstants.Match1Json}` },
          { key: `${BucketPath.Matches}${TestConstants.Match2Json}` },
        ],
        truncated: false,
      }),
      get: vi.fn()
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(aiVsAiMatch)) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue(JSON.stringify(aiVsHumanMatch)) }),
    };

    const result = await listBenchmarksLogic(
      { matchType: TestConstants.All, limit: TestConstants.Limit100, maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.stats.total).toBe(2);
    expect(result.stats.ai_vs_ai).toBe(1);
    expect(result.stats.ai_vs_human).toBe(1);
  });

  it(testName('should respect limit parameter'), async () => {
    const matches = Array.from({ length: 150 }, (_, i) => ({
      match_id: `match${i}`,
      players: [
        { player_id: TestConstants.Ai1, type: 'ai' },
        { player_id: TestConstants.Ai2, type: 'ai' },
      ],
      start_time: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    let callCount = 0;
    const mockStorage: ExploreStorage = {
      list: vi.fn().mockImplementation(() => {
        callCount++;
        const start = (callCount - 1) * TestConstants.BatchLimit;
        const end = Math.min(start + TestConstants.BatchLimit, matches.length);
        return Promise.resolve({
          objects: matches.slice(start, end).map(m => ({ key: `${BucketPath.Matches}${m.match_id}.json` })),
          truncated: end < matches.length,
          cursor: end < matches.length ? `cursor${callCount}` : undefined,
        });
      }),
      get: vi.fn().mockImplementation((key: string) => {
        const matchId = key.replace(`${BucketPath.Matches}`, '').replace('.json', '');
        const match = matches.find(m => m.match_id === matchId);
        return Promise.resolve(match ? { text: () => Promise.resolve(JSON.stringify(match)) } : null);
      }),
    };

    const result = await listBenchmarksLogic(
      { matchType: TestConstants.AiVsAi, limit: TestConstants.Limit50, maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.returned).toBe(TestConstants.Limit50);
    expect(result.benchmarks).toHaveLength(TestConstants.Limit50);
  });

  it(testName('should cap limit at 1000'), async () => {
    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
      get: vi.fn(),
    };

    await listBenchmarksLogic(
      { matchType: TestConstants.AiVsAi, limit: TestConstants.Limit2000, maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit },
      mockStorage
    );

    expect(mockStorage.list).toHaveBeenCalled();
  });

  it(testName('should handle match parsing errors'), async () => {
    const mockStorage: ExploreStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: `${BucketPath.Matches}${TestConstants.Match1Json}` }],
        truncated: false,
      }),
      get: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(TestConstants.InvalidJson) }),
    };

    const result = await listBenchmarksLogic(
      { matchType: TestConstants.AiVsAi, limit: TestConstants.Limit100, maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Error parsing match');
    expect(result.benchmarks).toEqual([]);
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage: ExploreStorage = {
      list: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      get: vi.fn(),
    };

    const result = await listBenchmarksLogic(
      { matchType: TestConstants.AiVsAi, limit: TestConstants.Limit100, maxMatches: TestConstants.MaxMatches, batchLimit: TestConstants.BatchLimit },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.StorageError);
    expect(result.benchmarks).toEqual([]);
  });
});
