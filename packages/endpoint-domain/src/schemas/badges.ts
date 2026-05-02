/**
 * Badges endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { UserIdSchema, BadgeIdSchema, TimestampSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const ListBadgesQuerySchema = schema.object({
  category: schema.string().optional(),
  rarity: schema.enum(['common', 'rare', 'epic', 'legendary']).optional(),
  limit: schema.number().int().positive().optional(),
});

// ============================================================================
// Request Bodies
// ============================================================================

export const AwardBadgeRequestSchema = schema.object({
  badge_id: BadgeIdSchema,
  reason: schema.string().optional(),
  match_id: schema.string().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const BadgeRequirementSchema = schema.object({
  type: schema.enum(['wins', 'games_played', 'score', 'streak', 'special']),
  value: schema.number().positive(),
  description: schema.string(),
});

export const BadgeSchema = schema.object({
  badge_id: BadgeIdSchema,
  name: schema.string(),
  description: schema.string(),
  category: schema.string(),
  rarity: schema.enum(['common', 'rare', 'epic', 'legendary']),
  icon_url: schema.string().url(),
  requirements: schema.array(BadgeRequirementSchema),
});

export const BadgeProgressSchema = schema.object({
  badge_id: BadgeIdSchema,
  progress: schema.number().min(0).max(100),
  current_value: schema.number(),
  target_value: schema.number().positive(),
  earned_at: TimestampSchema.optional(),
  is_earned: schema.boolean(),
});

export const ListBadgesResponseSchema = schema.object({
  badges: schema.array(BadgeSchema),
  total: schema.number().int().nonnegative(),
});

export const UserBadgeProgressResponseSchema = schema.object({
  user_id: UserIdSchema,
  badges: schema.array(BadgeProgressSchema),
  total_earned: schema.number().int().nonnegative(),
  total_available: schema.number().int().nonnegative(),
});

export const AwardBadgeResponseSchema = schema.object({
  success: schema.boolean(),
  badge_id: BadgeIdSchema,
  user_id: UserIdSchema,
  awarded_at: TimestampSchema,
  is_new: schema.boolean(),
});
