import type { Env } from '@/constants/env';
import { unlockBadgeLogic, type BadgeStorage } from '@/logic/badges';
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
import type { LeaderboardEntry } from '@/logic/leaderboard';

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

export async function checkAndAwardLeaderboardBadges(
  env: Env,
  leaderboard: LeaderboardEntry[],
  gameType: number
): Promise<{ awarded: Array<{ userId: string; badgeId: string }>; errors: string[] }> {
  const storage = createBadgeStorage(env);
  const awarded: Array<{ userId: string; badgeId: string }> = [];
  const errors: string[] = [];

  const creditStorage = {
    earnGP: async (userId: string, amount: number, description: string, gameType?: number, metadata?: Record<string, unknown>) => {
      const earnResult = await earnGPHandler(env, userId, amount, description, metadata);
      return { success: earnResult.success };
    },
  };

  try {
    for (const entry of leaderboard) {
      const userId = entry.user_id;
      let badgeToAward: string | null = null;

      if (entry.rank === 1) {
        badgeToAward = BadgeId.KingOfGame;
      } else if (entry.rank <= 10) {
        badgeToAward = BadgeId.Top10;
      } else if (entry.rank <= 100) {
        badgeToAward = BadgeId.Top100;
      }

      if (badgeToAward) {
        try {
          const result = await unlockBadgeLogic(
            {
              userId,
              badgeId: badgeToAward as BadgeId,
              gameType,
              metadata: {
                rank: entry.rank,
                score: entry.score,
                wins: entry.wins,
                games_played: entry.games_played,
              },
            },
            storage,
            creditStorage
          );
          if (result.success && result.badge) {
            awarded.push({ userId, badgeId: badgeToAward });
          } else if (result.error) {
            errors.push(`${userId} (${badgeToAward}): ${result.error}`);
          }
        } catch (error) {
          errors.push(`${userId} (${badgeToAward}): ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Leaderboard badge check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { awarded, errors };
}
