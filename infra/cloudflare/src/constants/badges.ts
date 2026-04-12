export const BadgeType = {
  Performance: 'performance',
  MatchPerformance: 'match_performance',
  SeriesTournament: 'series_tournament',
  Leaderboard: 'leaderboard',
  Engagement: 'engagement',
  SpecialEvent: 'special_event',
  Milestone: 'milestone',
} as const;

export type BadgeType = typeof BadgeType[keyof typeof BadgeType];

export const BadgeRarity = {
  Common: 'common',
  Rare: 'rare',
  Epic: 'epic',
  Legendary: 'legendary',
} as const;

export type BadgeRarity = typeof BadgeRarity[keyof typeof BadgeRarity];

export const BadgeTier = {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
  Platinum: 'platinum',
} as const;

export type BadgeTier = typeof BadgeTier[keyof typeof BadgeTier];

export const BadgeRewardType = {
  GPGlobal: 'gp_global',
  GPPerGame: 'gp_per_game',
  AC: 'ac',
  Multiplier: 'multiplier',
  Privilege: 'privilege',
} as const;

export type BadgeRewardType = typeof BadgeRewardType[keyof typeof BadgeRewardType];

import { BadgeId as EndpointBadgeId } from '@ocentra/endpoint-domain/constants/badges';

export const BadgeId = EndpointBadgeId;
export type BadgeId = typeof EndpointBadgeId[keyof typeof EndpointBadgeId];

export const BadgeAction = {
  List: 'list',
  Definitions: 'definitions',
  Progress: 'progress',
  Active: 'active',
  Claim: 'claim',
  TrackLogin: 'track-login',
  ClaimDailyRewards: 'claim-daily-rewards',
} as const;

export type BadgeAction = typeof BadgeAction[keyof typeof BadgeAction];

export const MaxActiveBadges = 5;

export const BadgeApiBodyKey = {
  BadgeId: 'badge_id',
  BadgeIds: 'badge_ids',
} as const;

export type BadgeApiBodyKey = typeof BadgeApiBodyKey[keyof typeof BadgeApiBodyKey];

export const BadgeQueryParam = {
  BadgeType: 'badge_type',
  Rarity: 'rarity',
} as const;

export type BadgeQueryParam = typeof BadgeQueryParam[keyof typeof BadgeQueryParam];
