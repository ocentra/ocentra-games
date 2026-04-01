/**
 * Badges endpoint request/response types.
 */

import type { UserId, BadgeId, Timestamp } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for listing badges.
 */
export interface ListBadgesQuery {
  category?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  limit?: number;
}

// ============================================================================
// Request Bodies
// ============================================================================

/**
 * Award badge request.
 */
export interface AwardBadgeRequest {
  badge_id: BadgeId;
  reason?: string;
  match_id?: string;
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Badge requirement.
 */
export interface BadgeRequirement {
  type: 'wins' | 'games_played' | 'score' | 'streak' | 'special';
  value: number;
  description: string;
}

/**
 * Badge definition.
 */
export interface Badge {
  badge_id: BadgeId;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon_url: string;
  requirements: BadgeRequirement[];
}

/**
 * Badge progress for a user.
 */
export interface BadgeProgress {
  badge_id: BadgeId;
  progress: number;
  current_value: number;
  target_value: number;
  earned_at?: Timestamp;
  is_earned: boolean;
}

/**
 * List badges response.
 */
export interface ListBadgesResponse {
  badges: Badge[];
  total: number;
}

/**
 * User badge progress response.
 */
export interface UserBadgeProgressResponse {
  user_id: UserId;
  badges: BadgeProgress[];
  total_earned: number;
  total_available: number;
}

/**
 * Award badge response.
 */
export interface AwardBadgeResponse {
  success: boolean;
  badge_id: BadgeId;
  user_id: UserId;
  awarded_at: Timestamp;
  is_new: boolean;
}
