import type { Env } from '@/constants/env';
import {
  unlockBadgeLogic,
  type BadgeStorage,
} from '@/logic/badges';
import { BadgeId } from '@/constants/badges';
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
import type { BadgeDefinition } from '@/logic/badges';

function createBadgeStorage(env: Env): BadgeStorage {
  return {
    async getProfile(userId: string) {
      const key = buildSafeBucketKey(BucketPath.UserBadges, `${userId}.json`);
      try {
        const object = await env.MATCHES_BUCKET.get(key);
        if (object) {
          const profile = JSON.parse(await object.text());
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

export interface DailyLoginResult {
  success: boolean;
  consecutiveDays: number;
  badgesUnlocked: string[];
  errors: string[];
}

export async function trackDailyLogin(
  env: Env,
  userId: string
): Promise<DailyLoginResult> {
  const storage = createBadgeStorage(env);
  const badgesUnlocked: string[] = [];
  const errors: string[] = [];

  const creditStorage = {
    earnGP: async (userId: string, amount: number, description: string, gameType?: number, metadata?: Record<string, unknown>) => {
      const finalMetadata = { ...metadata };
      if (gameType !== undefined) {
        finalMetadata.game_type = gameType;
      }
      const earnResult = await earnGPHandler(env, userId, amount, description, finalMetadata);
      return { success: earnResult.success };
    },
  };

  try {
    const { profile } = await storage.getProfile(userId);
    const today = new Date().toISOString().split('T')[0];
    const lastLoginKey = `last_login_date`;
    const lastLogin = profile.metadata?.[lastLoginKey] as string | undefined;
    const consecutiveKey = `consecutive_login_days`;
    let consecutiveDays = (profile.metadata?.[consecutiveKey] as number) || 0;

    if (lastLogin === today) {
      return {
        success: true,
        consecutiveDays,
        badgesUnlocked: [],
        errors: [],
      };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastLogin === yesterdayStr) {
      consecutiveDays++;
    } else if (lastLogin && lastLogin !== today) {
      consecutiveDays = 1;
    } else {
      consecutiveDays = 1;
    }

    profile.metadata = profile.metadata || {};
    profile.metadata[lastLoginKey] = today;
    profile.metadata[consecutiveKey] = consecutiveDays;
    profile.last_updated = new Date().toISOString();

    const maxRetries = 5;
    let retries = 0;
    let saved = false;

    while (retries < maxRetries && !saved) {
      const { profile: currentProfile, etag } = await storage.getProfile(userId);
      currentProfile.metadata = currentProfile.metadata || {};
      currentProfile.metadata[lastLoginKey] = today;
      currentProfile.metadata[consecutiveKey] = consecutiveDays;
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
      errors.push('Failed to save daily login after retries');
      return {
        success: false,
        consecutiveDays,
        badgesUnlocked,
        errors,
      };
    }

    if (consecutiveDays >= 7) {
      const result7 = await unlockBadgeLogic(
        { userId, badgeId: BadgeId.DailyWarrior7 },
        storage,
        creditStorage
      );
      if (result7.success && result7.badge) {
        badgesUnlocked.push(BadgeId.DailyWarrior7);
      }
    }

    if (consecutiveDays >= 30) {
      const result30 = await unlockBadgeLogic(
        { userId, badgeId: BadgeId.DailyWarrior30 },
        storage,
        creditStorage
      );
      if (result30.success && result30.badge) {
        badgesUnlocked.push(BadgeId.DailyWarrior30);
      }
    }

    if (consecutiveDays >= 100) {
      const result100 = await unlockBadgeLogic(
        { userId, badgeId: BadgeId.DailyWarrior100 },
        storage,
        creditStorage
      );
      if (result100.success && result100.badge) {
        badgesUnlocked.push(BadgeId.DailyWarrior100);
      }
    }

    return {
      success: true,
      consecutiveDays,
      badgesUnlocked,
      errors,
    };
  } catch (error) {
    errors.push(`Daily login tracking failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      consecutiveDays: 0,
      badgesUnlocked,
      errors,
    };
  }
}
