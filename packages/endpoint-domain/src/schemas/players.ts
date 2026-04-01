/**
 * Players endpoint Zod schemas.
 */

import { z } from 'zod';
import { UserIdSchema, GameTypeSchema, TimestampSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const PlayerStatsQuerySchema = z.object({
  game_type: GameTypeSchema.optional(),
});

export const PlayerReportQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'all_time']).optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const GameTypeStatsSchema = z.object({
  game_type: GameTypeSchema,
  games_played: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  best_score: z.number().optional(),
  avg_score: z.number().optional(),
});

export const PlayerStatsResponseSchema = z.object({
  user_id: UserIdSchema,
  display_name: z.string(),
  joined_at: TimestampSchema,
  stats: z.object({
    total_games: z.number().int().nonnegative(),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    win_rate: z.number().min(0).max(1),
    by_game_type: z.record(GameTypeStatsSchema),
  }),
  credits: z.object({
    gp_balance: z.number().int(),
    ac_balance: z.number().int(),
    total_gp_earned: z.number().int(),
    total_ac_purchased: z.number().int(),
    total_ac_spent: z.number().int(),
  }),
});

export const SkillAreaSchema = z.object({
  area: z.string(),
  level: z.number().int().positive(),
  progress: z.number().min(0).max(100),
  next_milestone: z.string(),
});

export const LearningProgressResponseSchema = z.object({
  user_id: UserIdSchema,
  skill_areas: z.array(SkillAreaSchema),
  overall_progress: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
});

export const PerformanceReportSummarySchema = z.object({
  games_played: z.number().int().nonnegative(),
  win_rate: z.number().min(0).max(1),
  avg_score: z.number(),
  improvement: z.number(),
});

export const PerformanceReportResponseSchema = z.object({
  user_id: UserIdSchema,
  period: z.string(),
  generated_at: TimestampSchema,
  summary: PerformanceReportSummarySchema,
  highlights: z.array(z.string()),
  areas_for_improvement: z.array(z.string()),
});
