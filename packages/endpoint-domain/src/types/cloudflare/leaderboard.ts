/**
 * Leaderboard endpoint request/response types.
 */

import type { UserId, GameType, Timestamp } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for leaderboard.
 */
export interface LeaderboardQuery {
  limit?: number;
  offset?: number;
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  sort_by?: 'wins' | 'score' | 'win_rate' | 'games_played';
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Leaderboard entry.
 */
export interface LeaderboardEntry {
  rank: number;
  player_id: UserId;
  display_name: string;
  wins: number;
  losses: number;
  score: number;
  win_rate: number;
  games_played: number;
  last_played: Timestamp;
}

/**
 * Leaderboard response.
 */
export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total_entries: number;
  period: string;
  game_type?: GameType;
  generated_at: Timestamp;
}
