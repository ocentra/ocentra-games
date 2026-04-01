/**
 * Badges endpoint Zod schemas.
 */

import { z } from 'zod';
import { UserIdSchema, BadgeIdSchema, TimestampSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const ListBadgesQuerySchema = z.object({
  category: z.string().optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
  limit: z.number().int().positive().optional(),
});

// ============================================================================
// Request Bodies
// ============================================================================

export const AwardBadgeRequestSchema = z.object({
  badge_id: BadgeIdSchema,
  reason: z.string().optional(),
  match_id: z.string().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const BadgeRequirementSchema = z.object({
  type: z.enum(['wins', 'games_played', 'score', 'streak', 'special']),
  value: z.number().positive(),
  description: z.string(),
});

export const BadgeSchema = z.object({
  badge_id: BadgeIdSchema,
  name: z.string(),
  description: z.string(),
  category: z.string(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  icon_url: z.string().url(),
  requirements: z.array(BadgeRequirementSchema),
});

export const BadgeProgressSchema = z.object({
  badge_id: BadgeIdSchema,
  progress: z.number().min(0).max(100),
  current_value: z.number(),
  target_value: z.number().positive(),
  earned_at: TimestampSchema.optional(),
  is_earned: z.boolean(),
});

export const ListBadgesResponseSchema = z.object({
  badges: z.array(BadgeSchema),
  total: z.number().int().nonnegative(),
});

export const UserBadgeProgressResponseSchema = z.object({
  user_id: UserIdSchema,
  badges: z.array(BadgeProgressSchema),
  total_earned: z.number().int().nonnegative(),
  total_available: z.number().int().nonnegative(),
});

export const AwardBadgeResponseSchema = z.object({
  success: z.boolean(),
  badge_id: BadgeIdSchema,
  user_id: UserIdSchema,
  awarded_at: TimestampSchema,
  is_new: z.boolean(),
});
