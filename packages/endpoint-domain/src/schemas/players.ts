/**
 * Players endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { UserIdSchema, GameTypeSchema, TimestampSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const PlayerStatsQuerySchema = schema.object({
  game_type: GameTypeSchema.optional(),
});

export const PlayerReportQuerySchema = schema.object({
  period: schema.enum(['daily', 'weekly', 'monthly', 'all_time']).optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const GameTypeStatsSchema = schema.object({
  game_type: GameTypeSchema,
  games_played: schema.number().int().nonnegative(),
  wins: schema.number().int().nonnegative(),
  losses: schema.number().int().nonnegative(),
  best_score: schema.number().optional(),
  avg_score: schema.number().optional(),
});

export const PlayerStatsResponseSchema = schema.object({
  user_id: UserIdSchema,
  display_name: schema.string(),
  joined_at: TimestampSchema,
  stats: schema.object({
    total_games: schema.number().int().nonnegative(),
    wins: schema.number().int().nonnegative(),
    losses: schema.number().int().nonnegative(),
    win_rate: schema.number().min(0).max(1),
    by_game_type: schema.record(GameTypeStatsSchema),
  }),
  credits: schema.object({
    gp_balance: schema.number().int(),
    ac_balance: schema.number().int(),
    total_gp_earned: schema.number().int(),
    total_ac_purchased: schema.number().int(),
    total_ac_spent: schema.number().int(),
  }),
});
export type PlayerStatsResponse = schema.infer<typeof PlayerStatsResponseSchema>;

export const SkillAreaSchema = schema.object({
  area: schema.string(),
  level: schema.number().int().positive(),
  progress: schema.number().min(0).max(100),
  next_milestone: schema.string(),
});

export const LearningProgressResponseSchema = schema.object({
  user_id: UserIdSchema,
  skill_areas: schema.array(SkillAreaSchema),
  overall_progress: schema.number().min(0).max(100),
  recommendations: schema.array(schema.string()),
});

export const PerformanceReportSummarySchema = schema.object({
  games_played: schema.number().int().nonnegative(),
  win_rate: schema.number().min(0).max(1),
  avg_score: schema.number(),
  improvement: schema.number(),
});

export const PerformanceReportResponseSchema = schema.object({
  user_id: UserIdSchema,
  period: schema.string(),
  generated_at: TimestampSchema,
  summary: PerformanceReportSummarySchema,
  highlights: schema.array(schema.string()),
  areas_for_improvement: schema.array(schema.string()),
});
