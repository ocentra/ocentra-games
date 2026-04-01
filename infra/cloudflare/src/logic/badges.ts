import { BadgeRewardType, MaxActiveBadges, type BadgeType as BadgeTypeValue, type BadgeRarity as BadgeRarityValue, type BadgeTier as BadgeTierValue, type BadgeRewardType as BadgeRewardTypeValue, type BadgeId as BadgeIdValue } from '@/constants/badges';
import { IdempotencyKeyLimits, IdempotencyKeyPrefix, MetadataField } from '@ocentra/endpoint-domain/constants/idempotency';

function badgeRewardIdempotencyKey(userId: string, badgeId: string, rewardType: string, gameType?: number): string {
  const sanitize = (s: string) => String(s).replace(/[^A-Za-z0-9_-]/g, '_');
  const u = sanitize(userId);
  const b = sanitize(badgeId);
  const r = sanitize(rewardType);
  const suffix = gameType !== undefined ? `-gt${gameType}` : '';
  let key = `${IdempotencyKeyPrefix.BadgeReward}${u}-${b}-${r}${suffix}`;
  if (key.length > IdempotencyKeyLimits.MaxLength) {
    key = key.substring(0, IdempotencyKeyLimits.MaxLength);
  }
  return key;
}

export interface BadgeReward {
  type: BadgeRewardTypeValue;
  amount?: number;
  game_type?: number;
  multiplier?: number;
  privilege?: string;
  one_time: boolean;
  recurring_period?: 'daily' | 'weekly' | 'monthly';
}

export interface BadgeDefinition {
  badge_id: BadgeIdValue;
  badge_type: BadgeTypeValue;
  badge_tier?: BadgeTierValue;
  name: string;
  description: string;
  icon_url?: string;
  rarity: BadgeRarityValue;
  game_type?: number;
  criteria: BadgeCriteria;
  rewards: BadgeReward[];
  metadata?: Record<string, unknown>;
}

export interface BadgeCriteria {
  type: 'matches_won' | 'matches_played' | 'win_rate' | 'leaderboard_position' | 'streak' | 'gp_earned' | 'tournament_wins' | 'daily_login' | 'social_shares' | 'referrals' | 'match_score' | 'comeback' | 'perfect_game';
  threshold: number;
  game_type?: number;
  time_period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  consecutive?: boolean;
}

export interface Badge {
  badge_id: BadgeIdValue;
  badge_type: BadgeTypeValue;
  badge_tier?: BadgeTierValue;
  name: string;
  description: string;
  icon_url?: string;
  rarity: BadgeRarityValue;
  game_type?: number;
  unlocked_at: string;
  progress?: number;
  max_progress?: number;
  rewards: BadgeReward[];
  rewards_claimed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UserBadgeProfile {
  user_id: string;
  badges: Badge[];
  badge_counts: {
    performance?: number;
    match_performance?: number;
    series_tournament?: number;
    leaderboard?: number;
    engagement?: number;
    special_event?: number;
    milestone?: number;
    total: number;
  };
  active_badges: string[];
  badge_progress: Record<string, number>;
  last_updated: string;
  metadata?: Record<string, unknown>;
}

export interface BadgeProgress {
  badge_id: BadgeIdValue;
  current: number;
  required: number;
  percentage: number;
  unlocked: boolean;
}

export interface BadgeWithEtag {
  profile: UserBadgeProfile;
  etag: string | null;
}

export interface BadgeStorage {
  getProfile(userId: string): Promise<BadgeWithEtag>;
  saveProfile(profile: UserBadgeProfile, expectedEtag: string | null): Promise<{ success: boolean; etag: string | null }>;
  getDefinitions(): Promise<BadgeDefinition[]>;
}

export async function getUserBadgeProfileLogic(
  userId: string,
  storage: BadgeStorage
): Promise<UserBadgeProfile> {
  const result = await storage.getProfile(userId);
  return result.profile;
}

export interface CheckBadgeProgressInput {
  userId: string;
  badgeId: BadgeIdValue;
  currentValue: number;
  gameType?: number;
}

export interface CheckBadgeProgressResult {
  unlocked: boolean;
  progress?: number;
  max_progress?: number;
}

/**
 * @mutation
 * @mutation-reason Threshold comparison and game type validation are critical decisions that must be correctly implemented
 * @mutation-invariant Unlocked only when progress >= threshold
 * @mutation-invariant Progress value never exceeds threshold
 * @mutation-invariant Game type mismatch must prevent unlock
 */
export async function checkBadgeProgressLogic(
  input: CheckBadgeProgressInput,
  storage: BadgeStorage
): Promise<CheckBadgeProgressResult> {
  const definitions = await storage.getDefinitions();
  const definition = definitions.find(d => d.badge_id === input.badgeId);
  
  if (!definition) {
    return { unlocked: false };
  }

  if (definition.criteria.game_type !== undefined && definition.criteria.game_type !== input.gameType) {
    return { unlocked: false };
  }

  const { profile } = await storage.getProfile(input.userId);
  const existingBadge = profile.badges.find(b => b.badge_id === input.badgeId);
  
  if (existingBadge) {
    return { unlocked: true, progress: existingBadge.max_progress, max_progress: existingBadge.max_progress };
  }

  const progress = input.currentValue;
  const threshold = definition.criteria.threshold;
  const unlocked = progress >= threshold;

  return {
    unlocked,
    progress: Math.min(progress, threshold),
    max_progress: threshold,
  };
}

export interface UnlockBadgeInput {
  userId: string;
  badgeId: BadgeIdValue;
  gameType?: number;
  metadata?: Record<string, unknown>;
  checkAborted?: () => boolean;
}

export interface UnlockBadgeResult {
  success: boolean;
  badge?: Badge;
  rewards_claimed?: boolean;
  already_unlocked?: boolean;
  error?: string;
}

/**
 * @mutation
 * @mutation-reason Duplicate prevention and reward claiming are money-critical operations
 * @mutation-invariant Badge cannot be unlocked twice (no duplicates)
 * @mutation-invariant Rewards claimed exactly once per badge unlock
 * @mutation-invariant Badge count increases by exactly 1 when unlocked
 * @mutation-invariant Total badge count equals badges array length
 */
export async function unlockBadgeLogic(
  input: UnlockBadgeInput,
  storage: BadgeStorage,
  creditStorage?: {
    earnGP: (userId: string, amount: number, description: string, gameType?: number, metadata?: Record<string, unknown>) => Promise<{ success: boolean }>;
    addAC?: (userId: string, amount: number, description: string) => Promise<{ success: boolean }>;
  }
): Promise<UnlockBadgeResult> {
  const definitions = await storage.getDefinitions();
  const definition = definitions.find(d => d.badge_id === input.badgeId);
  
  if (!definition) {
    return { success: false, error: 'Badge definition not found' };
  }

  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      if (input.checkAborted?.()) {
        throw new Error('Request aborted');
      }
      const { profile, etag } = await storage.getProfile(input.userId);
      
      const existingBadge = profile.badges.find(b => b.badge_id === input.badgeId);
      if (existingBadge) {
        const rewardsAlreadyClaimed = existingBadge.rewards_claimed === true;
        
        if (!rewardsAlreadyClaimed && creditStorage) {
          let rewardsClaimedNow = false;
          for (const reward of definition.rewards) {
            if (input.checkAborted?.()) {
              break;
            }
            if (reward.one_time) {
              if (reward.type === BadgeRewardType.GPGlobal) {
                const result = await creditStorage.earnGP(
                  input.userId,
                  reward.amount || 0,
                  `Badge reward: ${definition.name}`,
                  undefined,
                  { badge_id: input.badgeId, reward_type: reward.type, [MetadataField.IdempotencyKey]: badgeRewardIdempotencyKey(input.userId, input.badgeId, reward.type) }
                );
                if (result.success) rewardsClaimedNow = true;
              } else if (reward.type === BadgeRewardType.GPPerGame && reward.game_type !== undefined) {
                const result = await creditStorage.earnGP(
                  input.userId,
                  reward.amount || 0,
                  `Badge reward: ${definition.name}`,
                  reward.game_type,
                  { badge_id: input.badgeId, reward_type: reward.type, game_type: reward.game_type, [MetadataField.IdempotencyKey]: badgeRewardIdempotencyKey(input.userId, input.badgeId, reward.type, reward.game_type) }
                );
                if (result.success) rewardsClaimedNow = true;
              }
            }
          }

          existingBadge.rewards_claimed = rewardsClaimedNow;
          profile.last_updated = new Date().toISOString();

          const saveResult = await storage.saveProfile(profile, etag);

          if (!saveResult.success) {
            retries++;
            if (retries >= maxRetries) {
              return { success: false, error: 'Failed to claim rewards after retries (concurrent modification)' };
            }
            await new Promise(resolve => setTimeout(resolve, 10 * retries));
            continue;
          }

          return { success: true, badge: existingBadge, rewards_claimed: rewardsClaimedNow, already_unlocked: true };
        }
        
        return { success: true, badge: existingBadge, rewards_claimed: rewardsAlreadyClaimed, already_unlocked: true };
      }

      const badge: Badge = {
        badge_id: definition.badge_id,
        badge_type: definition.badge_type,
        badge_tier: definition.badge_tier,
        name: definition.name,
        description: definition.description,
        icon_url: definition.icon_url,
        rarity: definition.rarity,
        game_type: definition.game_type,
        unlocked_at: new Date().toISOString(),
        max_progress: definition.criteria.threshold,
        progress: definition.criteria.threshold,
        rewards: definition.rewards,
        rewards_claimed: false,
        metadata: {
          ...definition.metadata,
          ...input.metadata,
        },
      };

      if (input.checkAborted?.()) {
        throw new Error('Request aborted');
      }

      profile.badges.push(badge);
      profile.badge_counts[definition.badge_type] = (profile.badge_counts[definition.badge_type] || 0) + 1;
      profile.badge_counts.total = (profile.badge_counts.total || 0) + 1;
      profile.last_updated = new Date().toISOString();

      if (input.checkAborted?.()) {
        throw new Error('Request aborted');
      }

      let rewardsClaimed = false;
      if (creditStorage) {
        for (const reward of definition.rewards) {
          if (input.checkAborted?.()) {
            break;
          }
          if (reward.one_time) {
            if (reward.type === BadgeRewardType.GPGlobal) {
              const result = await creditStorage.earnGP(
                input.userId,
                reward.amount || 0,
                `Badge reward: ${definition.name}`,
                undefined,
                { badge_id: input.badgeId, reward_type: reward.type, [MetadataField.IdempotencyKey]: badgeRewardIdempotencyKey(input.userId, input.badgeId, reward.type) }
              );
              if (result.success) rewardsClaimed = true;
            } else if (reward.type === BadgeRewardType.GPPerGame && reward.game_type !== undefined) {
              const result = await creditStorage.earnGP(
                input.userId,
                reward.amount || 0,
                `Badge reward: ${definition.name}`,
                reward.game_type,
                { badge_id: input.badgeId, reward_type: reward.type, game_type: reward.game_type, [MetadataField.IdempotencyKey]: badgeRewardIdempotencyKey(input.userId, input.badgeId, reward.type, reward.game_type) }
              );
              if (result.success) rewardsClaimed = true;
            }
          }
        }
      }

      badge.rewards_claimed = rewardsClaimed;
      profile.last_updated = new Date().toISOString();

      const saveResult = await storage.saveProfile(profile, etag);

      if (!saveResult.success) {
        if (input.checkAborted?.()) {
          throw new Error('Request aborted');
        }
        retries++;
        if (retries >= maxRetries) {
          return { success: false, error: 'Failed to save badge profile after retries (concurrent modification)' };
        }
        await new Promise(resolve => setTimeout(resolve, 10 * retries));
        if (input.checkAborted?.()) {
          throw new Error('Request aborted');
        }
        continue;
      }

      return { success: true, badge, rewards_claimed: rewardsClaimed, already_unlocked: false };
    } catch (error) {
      if (error instanceof Error && error.message === 'Request aborted') {
        return { success: false, error: 'Request aborted' };
      }
      if (retries >= maxRetries - 1) {
        return { success: false, error: String(error) };
      }
      if (input.checkAborted?.()) {
        return { success: false, error: 'Request aborted' };
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, 10 * retries));
      if (input.checkAborted?.()) {
        return { success: false, error: 'Request aborted' };
      }
    }
  }

  return { success: false, error: 'Failed to unlock badge after retries' };
}

export interface UpdateBadgeProgressInput {
  userId: string;
  badgeId: BadgeIdValue;
  progress: number;
  gameType?: number;
}

export interface UpdateBadgeProgressResult {
  success: boolean;
  unlocked?: boolean;
  error?: string;
}

/**
 * @mutation
 * @mutation-reason Cumulative progress logic is critical for badge correctness - progress must be non-decreasing and capped at threshold
 * @mutation-invariant Progress is non-decreasing (Math.max ensures cumulative)
 * @mutation-invariant Progress never exceeds threshold
 * @mutation-invariant Unlocked when progress >= threshold
 * @mutation-invariant Progress update is idempotent (same input = same output)
 */
export async function updateBadgeProgressLogic(
  input: UpdateBadgeProgressInput,
  storage: BadgeStorage,
  creditStorage?: {
    earnGP: (userId: string, amount: number, description: string, gameType?: number, metadata?: Record<string, unknown>) => Promise<{ success: boolean }>;
  }
): Promise<UpdateBadgeProgressResult> {
  const definitions = await storage.getDefinitions();
  const definition = definitions.find(d => d.badge_id === input.badgeId);
  
  if (!definition) {
    return { success: false, error: 'Badge definition not found' };
  }

  if (definition.criteria.game_type !== undefined && definition.criteria.game_type !== input.gameType) {
    return { success: false, error: 'Game type mismatch' };
  }

  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const { profile, etag } = await storage.getProfile(input.userId);
      
      const existingBadge = profile.badges.find(b => b.badge_id === input.badgeId);
      if (existingBadge) {
        return { success: true, unlocked: true };
      }

      const threshold = definition.criteria.threshold;
      const existingProgress = profile.badge_progress[input.badgeId] || 0;
      const newProgress = Math.max(existingProgress, Math.min(input.progress, threshold));
      const unlocked = newProgress >= threshold;

      profile.badge_progress[input.badgeId] = newProgress;
      profile.last_updated = new Date().toISOString();

      if (unlocked) {
        const unlockResult = await unlockBadgeLogic(
          { userId: input.userId, badgeId: input.badgeId, gameType: input.gameType },
          storage,
          creditStorage
        );
        return { success: unlockResult.success, unlocked: unlockResult.success, error: unlockResult.error };
      }

      const saveResult = await storage.saveProfile(profile, etag);
      
      if (!saveResult.success) {
        retries++;
        if (retries >= maxRetries) {
          return { success: false, error: 'Failed to save badge progress after retries (concurrent modification)' };
        }
        await new Promise(resolve => setTimeout(resolve, 10 * retries));
        continue;
      }

      return { success: true, unlocked: false };
    } catch (error) {
      if (retries >= maxRetries - 1) {
        return { success: false, error: String(error) };
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, 10 * retries));
    }
  }

  return { success: false, error: 'Failed to update badge progress after retries' };
}

export interface SetActiveBadgesInput {
  userId: string;
  badgeIds: string[];
}

export interface SetActiveBadgesResult {
  success: boolean;
  error?: string;
}

/**
 * @mutation
 * @mutation-reason Active badge validation prevents invalid state and enforces business rules
 * @mutation-invariant Active badges count never exceeds MaxActiveBadges
 * @mutation-invariant Only unlocked badges can be set as active
 * @mutation-invariant Invalid badge IDs must be rejected
 */
export async function setActiveBadgesLogic(
  input: SetActiveBadgesInput,
  storage: BadgeStorage
): Promise<SetActiveBadgesResult> {
  if (input.badgeIds.length > MaxActiveBadges) {
    return { success: false, error: `Maximum ${MaxActiveBadges} active badges allowed` };
  }

  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const { profile, etag } = await storage.getProfile(input.userId);
      
      const userBadgeIds = new Set(profile.badges.map(b => b.badge_id));
      const invalidBadges = input.badgeIds.filter(id => !userBadgeIds.has(id as BadgeIdValue));
      
      if (invalidBadges.length > 0) {
        return { success: false, error: `Invalid badge IDs: ${invalidBadges.join(', ')}` };
      }

      profile.active_badges = input.badgeIds;
      profile.last_updated = new Date().toISOString();

      const saveResult = await storage.saveProfile(profile, etag);
      
      if (!saveResult.success) {
        retries++;
        if (retries >= maxRetries) {
          return { success: false, error: 'Failed to save active badges after retries (concurrent modification)' };
        }
        await new Promise(resolve => setTimeout(resolve, 10 * retries));
        continue;
      }

      return { success: true };
    } catch (error) {
      if (retries >= maxRetries - 1) {
        return { success: false, error: String(error) };
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, 10 * retries));
    }
  }

  return { success: false, error: 'Failed to set active badges after retries' };
}

export interface GetBadgeProgressInput {
  userId: string;
  badgeId?: BadgeIdValue;
}

export interface GetBadgeProgressResult {
  progress: BadgeProgress[];
}

export async function getBadgeProgressLogic(
  input: GetBadgeProgressInput,
  storage: BadgeStorage
): Promise<GetBadgeProgressResult> {
  const definitions = await storage.getDefinitions();
  const { profile } = await storage.getProfile(input.userId);
  
  const unlockedBadgeIds = new Set(profile.badges.map(b => b.badge_id));
  const badgesToCheck = input.badgeId 
    ? definitions.filter(d => d.badge_id === input.badgeId)
    : definitions;

  const progress: BadgeProgress[] = badgesToCheck.map(definition => {
    const unlocked = unlockedBadgeIds.has(definition.badge_id);
    const currentProgress = profile.badge_progress[definition.badge_id] || 0;
    const required = definition.criteria.threshold;
    const current = unlocked ? required : currentProgress;
    
    return {
      badge_id: definition.badge_id,
      current,
      required,
      percentage: Math.min(100, Math.round((current / required) * 100)),
      unlocked,
    };
  });

  return { progress };
}

export async function getBadgeDefinitionsLogic(
  storage: BadgeStorage,
  filter?: {
    badge_type?: BadgeTypeValue;
    rarity?: BadgeRarityValue;
    game_type?: number;
  }
): Promise<BadgeDefinition[]> {
  const definitions = await storage.getDefinitions();
  
  if (!filter) {
    return definitions;
  }

  return definitions.filter(def => {
    if (filter.badge_type && def.badge_type !== filter.badge_type) return false;
    if (filter.rarity && def.rarity !== filter.rarity) return false;
    if (filter.game_type !== undefined && def.game_type !== filter.game_type) return false;
    return true;
  });
}
