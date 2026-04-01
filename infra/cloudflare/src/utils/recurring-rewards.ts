import type { Env } from '@/constants/env';
import { type BadgeStorage } from '@/logic/badges';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { buildSafeBucketKey } from '@/utils/path-sanitizer';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_BADGE_WARNINGS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

import { earnGP as earnGPHandler } from '@/handlers/credits';
import { getDefaultBadgeDefinitions } from '@/handlers/badges';
import type { BadgeDefinition, UserBadgeProfile } from '@/logic/badges';
import { BadgeRarity } from '@/constants/badges';

function createBadgeStorage(env: Env): BadgeStorage {
  return {
    async getProfile(userId: string) {
      const key = buildSafeBucketKey(BucketPath.UserBadges, `${userId}.json`);
      try {
        const object = await env.MATCHES_BUCKET.get(key);
        if (object) {
          const profile = JSON.parse(await object.text()) as UserBadgeProfile;
          const etag = object.httpEtag || null;
          return { profile, etag };
        }
      } catch (error) {
        logWarn(`Error loading badge profile for ${userId}`, getStackTrace(), error, LOG_BADGE_WARNINGS);
      }
      return {
        profile: {
          user_id: userId,
          badges: [],
          badge_counts: { total: 0 },
          active_badges: [],
          badge_progress: {},
          last_updated: new Date().toISOString(),
        },
        etag: null,
      };
    },
    async saveProfile(profile, expectedEtag) {
      const key = buildSafeBucketKey(BucketPath.UserBadges, `${profile.user_id}.json`);
      try {
        const json = JSON.stringify(profile);
        const putOptions: R2PutOptions = {
          httpMetadata: {
            contentType: HttpContentType.ApplicationJson,
          },
        };
        if (expectedEtag !== null) {
          const etagWithoutQuotes = expectedEtag.startsWith('"') && expectedEtag.endsWith('"')
            ? expectedEtag.slice(1, -1)
            : expectedEtag;
          putOptions.onlyIf = {
            etagMatches: etagWithoutQuotes,
          };
        }
        const result = await env.MATCHES_BUCKET.put(key, json, putOptions);
        if (result === null) {
          return { success: false, etag: null };
        }
        return { success: true, etag: result.httpEtag || null };
      } catch (error) {
        logError(`Error saving badge profile for ${profile.user_id}`, getStackTrace(), error);
        return { success: false, etag: null };
      }
    },
    async getDefinitions() {
      const key = buildSafeBucketKey(BucketPath.BadgeDefinitions, 'definitions.json');
      try {
        const object = await env.MATCHES_BUCKET.get(key);
        if (object) {
          const definitions = JSON.parse(await object.text()) as BadgeDefinition[];
          return definitions;
        }
      } catch (error) {
        logWarn('Error loading badge definitions', getStackTrace(), error, LOG_BADGE_WARNINGS);
      }
      return getDefaultBadgeDefinitions();
    },
  };
}

export interface RecurringRewardsResult {
  success: boolean;
  rewardsClaimed: boolean;
  gpEarned: number;
  acEarned: number;
  error?: string;
}

export async function claimDailyRewards(
  env: Env,
  userId: string
): Promise<RecurringRewardsResult> {
  const storage = createBadgeStorage(env);
  
  try {
    const { profile } = await storage.getProfile(userId);
    const today = new Date().toISOString().split('T')[0];
    const lastClaimKey = `last_daily_reward_claim`;
    const lastClaim = profile.metadata?.[lastClaimKey] as string | undefined;

    if (lastClaim === today) {
      return {
        success: true,
        rewardsClaimed: false,
        gpEarned: 0,
        acEarned: 0,
      };
    }

    let totalGPEarned = 0;
    const totalACEarned = 0;

    for (const badgeId of profile.active_badges) {
      const badge = profile.badges.find(b => b.badge_id === badgeId);
      if (!badge) continue;

      for (const reward of badge.rewards) {
        if (!reward.one_time && reward.recurring_period === 'daily') {
          if (reward.type === 'gp_global' && reward.amount) {
            const result = await earnGPHandler(env, userId, reward.amount, `Daily badge reward: ${badge.name}`, {
              badge_id: badgeId,
              reward_type: reward.type,
            });
            if (result.success) {
              totalGPEarned += reward.amount;
            }
          } else if (reward.type === 'gp_per_game' && reward.amount && reward.game_type !== undefined) {
            const result = await earnGPHandler(env, userId, reward.amount, `Daily badge reward: ${badge.name}`, {
              badge_id: badgeId,
              reward_type: reward.type,
              game_type: reward.game_type,
            });
            if (result.success) {
              totalGPEarned += reward.amount;
            }
          }
        }
      }

      if (badge.rarity === BadgeRarity.Legendary) {
        const legendaryBonus = 50;
        const result = await earnGPHandler(env, userId, legendaryBonus, `Legendary badge daily bonus: ${badge.name}`, {
          badge_id: badgeId,
          reward_type: 'legendary_daily_bonus',
        });
        if (result.success) {
          totalGPEarned += legendaryBonus;
        }
      } else if (badge.rarity === BadgeRarity.Epic) {
        const epicBonus = 25;
        const result = await earnGPHandler(env, userId, epicBonus, `Epic badge daily bonus: ${badge.name}`, {
          badge_id: badgeId,
          reward_type: 'epic_daily_bonus',
        });
        if (result.success) {
          totalGPEarned += epicBonus;
        }
      }
    }

    profile.metadata = profile.metadata || {};
    profile.metadata[lastClaimKey] = today;
    profile.last_updated = new Date().toISOString();

    const maxRetries = 5;
    let retries = 0;
    let saved = false;

    while (retries < maxRetries && !saved) {
      const { profile: currentProfile, etag } = await storage.getProfile(userId);
      currentProfile.metadata = currentProfile.metadata || {};
      currentProfile.metadata[lastClaimKey] = today;
      currentProfile.last_updated = new Date().toISOString();

      const saveResult = await storage.saveProfile(currentProfile, etag);
      if (saveResult.success) {
        saved = true;
      } else {
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 10 * retries));
        }
      }
    }

    if (!saved) {
      return {
        success: false,
        rewardsClaimed: false,
        gpEarned: totalGPEarned,
        acEarned: totalACEarned,
        error: 'Failed to save reward claim after retries',
      };
    }

    return {
      success: true,
      rewardsClaimed: totalGPEarned > 0 || totalACEarned > 0,
      gpEarned: totalGPEarned,
      acEarned: totalACEarned,
    };
  } catch (error) {
    return {
      success: false,
      rewardsClaimed: false,
      gpEarned: 0,
      acEarned: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
