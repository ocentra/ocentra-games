import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';

export interface LeaderboardStorage {
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

export type PlayerRecord = {
  player_id?: string;
  public_key?: string;
  pubkey?: string;
  type?: string;
  player_type?: string;
  metadata?: Record<string, unknown>;
};

export interface MatchRecord {
  match_id?: string;
  matchId?: string;
  gameType?: number;
  game_type?: number;
  players?: PlayerRecord[];
  events?: unknown[];
  endedAt?: string;
  createdAt?: string;
  start_time?: string;
  scores?: number[];
  winner?: string;
  phase?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  public_key?: string;
  score: number;
  wins: number;
  losses: number;
  games_played: number;
  tier: string;
  last_played?: string;
}

function calculateTier(score: number): string {
  if (score >= 100000) return 'Master';
  if (score >= 50000) return 'Diamond';
  if (score >= 20000) return 'Platinum';
  if (score >= 5000) return 'Gold';
  if (score >= 1000) return 'Silver';
  return 'Bronze';
}

function isAIPlayer(player: PlayerRecord | undefined): boolean {
  if (!player) return false;
  return Boolean(
    player.type === 'ai' || player.player_type === 'ai' || 
    (player.metadata && ('model_name' in player.metadata || 'model_id' in player.metadata))
  );
}

function isHumanPlayer(player: PlayerRecord | undefined): boolean {
  return !isAIPlayer(player);
}

function isAIMatch(match: MatchRecord): boolean {
  const players = match.players || [];
  return players.length >= 2 && players.every(p => isAIPlayer(p));
}

export async function computeLeaderboardLogic(
  gameType: number,
  aiOnly: boolean,
  limit: number,
  storage: LeaderboardStorage
): Promise<LeaderboardEntry[]> {
  const stats = new Map<string, {
    wins: number;
    losses: number;
    games_played: number;
    total_score: number;
    last_played?: string;
    public_key?: string;
  }>();

  let cursor: string | undefined;
  let hasMore = true;
  const maxMatches = 10000;

  while (hasMore && stats.size < maxMatches) {
    const listResult = await storage.list({
      prefix: BucketPath.Matches,
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });

    for (const object of listResult.objects) {
      if (!object.key.endsWith('.json') || object.key.includes('/anonymized/')) {
        continue;
      }

      try {
        const matchObject = await storage.get(object.key);
        if (!matchObject) continue;

        const match: MatchRecord = JSON.parse(await matchObject.text());
        const matchGameType = match.gameType ?? match.game_type ?? 0;

        if (matchGameType !== gameType) continue;
        if (match.phase !== 3 && match.phase !== undefined) continue;

        const players = match.players || [];
        if (players.length === 0) continue;

        if (aiOnly) {
          if (!isAIMatch(match)) continue;
        } else {
          if (isAIMatch(match)) continue;
        }

        const scores = match.scores || [];
        const endedAt = match.endedAt || match.createdAt || match.start_time;

        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          const playerId = player?.player_id || player?.public_key || player?.pubkey;
          if (!playerId) continue;

          if (aiOnly && !isAIPlayer(player)) continue;
          if (!aiOnly && !isHumanPlayer(player)) continue;

          const current = stats.get(playerId) || {
            wins: 0,
            losses: 0,
            games_played: 0,
            total_score: 0,
            public_key: player?.public_key || player?.pubkey,
          };

          current.games_played++;
          if (endedAt && (!current.last_played || endedAt > current.last_played)) {
            current.last_played = endedAt;
          }

          const playerScore = scores[i] || 0;
          current.total_score += playerScore;

          if (match.winner === playerId || (scores.length > 0 && playerScore === Math.max(...scores))) {
            current.wins++;
          } else {
            current.losses++;
          }

          stats.set(playerId, current);
        }
      } catch (error) {
        throw new Error(`Error processing match ${object.key}: ${String(error)}`);
      }
    }

    hasMore = listResult.truncated;
    if (hasMore && 'cursor' in listResult) {
      cursor = listResult.cursor;
    } else {
      hasMore = false;
    }
  }

  const entries: LeaderboardEntry[] = Array.from(stats.entries()).map(([userId, stat]) => ({
    rank: 0,
    user_id: userId,
    public_key: stat.public_key,
    score: stat.total_score,
    wins: stat.wins,
    losses: stat.losses,
    games_played: stat.games_played,
    tier: calculateTier(stat.total_score),
    last_played: stat.last_played,
  }));

  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return (a.games_played || 0) - (b.games_played || 0);
  });

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries.slice(0, limit);
}
