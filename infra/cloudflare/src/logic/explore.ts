import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';

export interface ExploreStorage {
  list(options: {
    prefix: string;
    limit: number;
    cursor?: string;
  }): Promise<{
    objects: Array<{ key: string }>;
    truncated: boolean;
    cursor?: string;
  }>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
}

export interface ListMatchesInput {
  maxMatches?: number;
  batchLimit?: number;
}

export interface ListMatchesResult {
  success: boolean;
  matches: unknown[];
  count: number;
  total_fetched: number;
  error?: string;
}

export async function listMatchesLogic(
  input: ListMatchesInput,
  storage: ExploreStorage
): Promise<ListMatchesResult> {
  try {
    const matches: unknown[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    const maxMatches = input.maxMatches || 1000;
    const batchLimit = input.batchLimit || 100;

    while (hasMore && matches.length < maxMatches) {
      const listResult = await storage.list({
        prefix: BucketPath.Matches,
        limit: batchLimit,
        ...(cursor ? { cursor } : {}),
      });

      for (const object of listResult.objects) {
        // Stop if we've reached maxMatches
        if (matches.length >= maxMatches) {
          break;
        }
        if (object.key.endsWith('.json') && !object.key.includes('/anonymized/')) {
          try {
            const matchObject = await storage.get(object.key);
            if (matchObject) {
              const matchData = JSON.parse(await matchObject.text());
              matches.push(matchData);
            }
          } catch (error) {
            throw new Error(`Error parsing match ${object.key}: ${String(error)}`);
          }
        }
      }

      hasMore = listResult.truncated;
      if (hasMore && 'cursor' in listResult) {
        cursor = listResult.cursor;
      } else {
        hasMore = false;
      }
    }

    matches.sort((a, b) => {
      const aRecord = a as Record<string, unknown>;
      const bRecord = b as Record<string, unknown>;
      const timeA = aRecord.start_time || aRecord.createdAt || 0;
      const timeB = bRecord.start_time || bRecord.createdAt || 0;
      return new Date(timeB as string | number).getTime() - new Date(timeA as string | number).getTime();
    });

    return {
      success: true,
      matches,
      count: matches.length,
      total_fetched: matches.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      matches: [],
      count: 0,
      total_fetched: 0,
    };
  }
}

export interface ListBenchmarksInput {
  matchType?: string;
  gameType?: string | null;
  limit?: number;
  maxMatches?: number;
  batchLimit?: number;
}

export interface ListBenchmarksResult {
  success: boolean;
  benchmarks: unknown[];
  count: number;
  returned: number;
  stats: {
    total: number;
    ai_vs_ai: number;
    ai_vs_human: number;
  };
  match_type: string;
  game_type: string;
  error?: string;
}

function isAIPlayer(player: Record<string, unknown>): boolean {
  return Boolean(
    (player.type === 'ai' || player.player_type === 'ai') ||
    (player.metadata && typeof player.metadata === 'object' &&
      ('model_name' in player.metadata || 'model_id' in player.metadata))
  );
}

function isHumanPlayer(player: Record<string, unknown>): boolean {
  return !isAIPlayer(player);
}

export async function listBenchmarksLogic(
  input: ListBenchmarksInput,
  storage: ExploreStorage
): Promise<ListBenchmarksResult> {
  try {
    const matchType = input.matchType || 'ai_vs_ai';
    const gameType = input.gameType;
    const limit = Math.min(input.limit || 100, 1000);
    const maxMatches = input.maxMatches || 10000;
    const batchLimit = input.batchLimit || 100;

    const benchmarks: unknown[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore && benchmarks.length < maxMatches) {
      const listResult = await storage.list({
        prefix: BucketPath.Matches,
        limit: batchLimit,
        ...(cursor ? { cursor } : {}),
      });

      for (const object of listResult.objects) {
        if (object.key.endsWith('.json') && !object.key.includes('/anonymized/')) {
          try {
            const matchObject = await storage.get(object.key);
            if (!matchObject) continue;

            const matchData = JSON.parse(await matchObject.text()) as Record<string, unknown>;
            const players = (matchData.players || []) as Array<Record<string, unknown>>;

            if (gameType) {
              const matchGameType = matchData.gameType ?? matchData.game_type ?? 0;
              if (matchGameType !== parseInt(gameType, 10)) continue;
            }

            const aiPlayers = players.filter(p => isAIPlayer(p));
            const humanPlayers = players.filter(p => isHumanPlayer(p));

            let includeMatch = false;

            if (matchType === 'ai_vs_ai') {
              includeMatch = aiPlayers.length >= 2 && humanPlayers.length === 0;
            } else if (matchType === 'ai_vs_human') {
              includeMatch = aiPlayers.length >= 1 && humanPlayers.length >= 1;
            } else if (matchType === 'all') {
              includeMatch = aiPlayers.length >= 1;
            }

            if (includeMatch) {
              // Determine the actual match type based on players
              const actualMatchType = humanPlayers.length === 0 && aiPlayers.length >= 2
                ? 'ai_vs_ai'
                : (aiPlayers.length >= 1 && humanPlayers.length >= 1 ? 'ai_vs_human' : 'other');

              const benchmarkData = {
                ...matchData,
                benchmark_type: actualMatchType,
                ai_players: aiPlayers.map(p => ({
                  player_id: p.player_id || p.public_key || p.pubkey,
                  model_name: (p.metadata as Record<string, unknown>)?.model_name,
                  model_id: (p.metadata as Record<string, unknown>)?.model_id,
                  metadata: p.metadata,
                })),
                human_players: humanPlayers.map(p => ({
                  player_id: p.player_id || p.public_key || p.pubkey,
                })),
                ai_count: aiPlayers.length,
                human_count: humanPlayers.length,
              };

              benchmarks.push(benchmarkData);
            }
          } catch (error) {
            throw new Error(`Error parsing match ${object.key}: ${String(error)}`);
          }
        }
      }

      hasMore = listResult.truncated;
      if (hasMore && 'cursor' in listResult) {
        cursor = listResult.cursor;
      } else {
        hasMore = false;
      }
    }

    benchmarks.sort((a, b) => {
      const aRecord = a as Record<string, unknown>;
      const bRecord = b as Record<string, unknown>;
      const timeA = aRecord.start_time || aRecord.createdAt || aRecord.endedAt || 0;
      const timeB = bRecord.start_time || bRecord.createdAt || bRecord.endedAt || 0;
      return new Date(timeB as string | number).getTime() - new Date(timeA as string | number).getTime();
    });

    const stats = {
      total: benchmarks.length,
      ai_vs_ai: benchmarks.filter((b: unknown) => (b as Record<string, unknown>).benchmark_type === 'ai_vs_ai').length,
      ai_vs_human: benchmarks.filter((b: unknown) => (b as Record<string, unknown>).benchmark_type === 'ai_vs_human').length,
    };

    return {
      success: true,
      benchmarks: benchmarks.slice(0, limit),
      count: benchmarks.length,
      returned: Math.min(benchmarks.length, limit),
      stats,
      match_type: matchType,
      game_type: gameType || 'all',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      benchmarks: [],
      count: 0,
      returned: 0,
      stats: { total: 0, ai_vs_ai: 0, ai_vs_human: 0 },
      match_type: input.matchType || 'ai_vs_ai',
      game_type: input.gameType || 'all',
    };
  }
}
