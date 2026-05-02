/**
 * Leaderboard endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { UserIdSchema, GameTypeSchema, TimestampSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const LeaderboardQuerySchema = schema.object({
  limit: schema.number().int().positive().max(1000).optional(),
  offset: schema.number().int().nonnegative().optional(),
  period: schema.enum(['daily', 'weekly', 'monthly', 'all_time']).optional(),
  sort_by: schema.enum(['wins', 'score', 'win_rate', 'games_played']).optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const LeaderboardEntrySchema = schema.object({
  rank: schema.number().int().positive(),
  player_id: UserIdSchema,
  display_name: schema.string(),
  wins: schema.number().int().nonnegative(),
  losses: schema.number().int().nonnegative(),
  score: schema.number(),
  win_rate: schema.number().min(0).max(1),
  games_played: schema.number().int().nonnegative(),
  last_played: TimestampSchema,
});

export const LeaderboardResponseSchema = schema.object({
  entries: schema.array(LeaderboardEntrySchema),
  total_entries: schema.number().int().nonnegative(),
  period: schema.string(),
  game_type: GameTypeSchema.optional(),
  generated_at: TimestampSchema,
});
