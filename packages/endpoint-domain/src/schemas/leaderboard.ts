/**
 * Leaderboard endpoint Zod schemas.
 */

import { z } from 'zod';
import { UserIdSchema, GameTypeSchema, TimestampSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const LeaderboardQuerySchema = z.object({
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().nonnegative().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'all_time']).optional(),
  sort_by: z.enum(['wins', 'score', 'win_rate', 'games_played']).optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  player_id: UserIdSchema,
  display_name: z.string(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  score: z.number(),
  win_rate: z.number().min(0).max(1),
  games_played: z.number().int().nonnegative(),
  last_played: TimestampSchema,
});

export const LeaderboardResponseSchema = z.object({
  entries: z.array(LeaderboardEntrySchema),
  total_entries: z.number().int().nonnegative(),
  period: z.string(),
  game_type: GameTypeSchema.optional(),
  generated_at: TimestampSchema,
});
