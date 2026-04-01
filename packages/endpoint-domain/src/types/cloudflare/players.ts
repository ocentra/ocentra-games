/**
 * Players endpoint request/response types.
 */

import type { UserId, GameType, Timestamp } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for player stats.
 */
export interface PlayerStatsQuery {
  game_type?: GameType;
}

/**
 * Query parameters for player report.
 */
export interface PlayerReportQuery {
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Stats for a specific game type.
 */
export interface GameTypeStats {
  game_type: GameType;
  games_played: number;
  wins: number;
  losses: number;
  best_score?: number;
  avg_score?: number;
}

/**
 * Player stats response.
 */
export interface PlayerStatsResponse {
  user_id: UserId;
  display_name: string;
  joined_at: Timestamp;
  stats: {
    total_games: number;
    wins: number;
    losses: number;
    win_rate: number;
    by_game_type: Record<number, GameTypeStats>;
  };
  credits: {
    gp_balance: number;
    ac_balance: number;
    total_gp_earned: number;
    total_ac_purchased: number;
    total_ac_spent: number;
  };
}

/**
 * Skill area for learning progress.
 */
export interface SkillArea {
  area: string;
  level: number;
  progress: number;
  next_milestone: string;
}

/**
 * Learning progress response.
 */
export interface LearningProgressResponse {
  user_id: UserId;
  skill_areas: SkillArea[];
  overall_progress: number;
  recommendations: string[];
}

/**
 * Performance report summary.
 */
export interface PerformanceReportSummary {
  games_played: number;
  win_rate: number;
  avg_score: number;
  improvement: number;
}

/**
 * Performance report response.
 */
export interface PerformanceReportResponse {
  user_id: UserId;
  period: string;
  generated_at: Timestamp;
  summary: PerformanceReportSummary;
  highlights: string[];
  areas_for_improvement: string[];
}
