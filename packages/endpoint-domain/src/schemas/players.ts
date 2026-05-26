/**
 * Players endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { UserIdSchema, GameTypeSchema, TimestampSchema } from './common';

const UnsafePlayerDisplayNameValues = new Set([
  'n/a',
  'na',
  'none',
  'null',
  'undefined',
  'unknown',
  'anonymous',
  'anon',
  'user',
  'player',
  'preview-player',
  'preview player',
  'simulated-user',
  'simulated user',
  'mock-user',
  'mock user',
  'demo-user',
  'demo user',
  'test-user',
  'test user',
  'sample-player',
  'sample player',
]);

const OpaqueAccountIdentifierPattern = /^[A-Za-z0-9._-]{20,}$/;

function normalizedDisplayName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isUnsafePlayerDisplayName(value: string, userId?: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const normalizedValue = normalizedDisplayName(trimmed);
  const normalizedUserId = userId ? normalizedDisplayName(userId) : '';
  if (UnsafePlayerDisplayNameValues.has(normalizedValue)) return true;
  if (normalizedUserId && normalizedValue === normalizedUserId) return true;
  if (OpaqueAccountIdentifierPattern.test(trimmed) && !/[\s@]/.test(trimmed)) return true;
  return false;
}

export const PlayerDisplayNameSchema = schema
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine(
    (value) => !isUnsafePlayerDisplayName(value),
    'Display name must be a player-facing name, not an account id or placeholder',
  );

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

export const PlayerProfileResponseSchema = schema.object({
  userId: UserIdSchema,
  displayName: PlayerDisplayNameSchema.optional(),
  avatarUrl: schema.string().max(512).optional(),
  photoURL: schema.string().max(512).optional(),
  bio: schema.string().max(512).optional(),
  level: schema.number().int().nonnegative().optional(),
  totalGamesPlayed: schema.number().int().nonnegative().optional(),
  totalWins: schema.number().int().nonnegative().optional(),
  winRate: schema.number().min(0).max(100).optional(),
  visibility: schema.string().max(32).optional(),
  customTitle: schema.string().max(128).nullable().optional(),
  profileTheme: schema.string().max(64).optional(),
}).passthrough().superRefine((profile, context) => {
  if (profile.displayName !== undefined && isUnsafePlayerDisplayName(profile.displayName, profile.userId)) {
    context.addIssue({
      path: ['displayName'],
      message: 'Display name must not match account identity or placeholder data',
    });
  }
});
export type PlayerProfileResponse = schema.infer<typeof PlayerProfileResponseSchema>;

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
