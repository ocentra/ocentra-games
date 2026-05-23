import { env } from 'cloudflare:test';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { getDefaultBadgeDefinitions } from '@/handlers/badges';
import { buildSafeBucketKey } from '@/utils/path-sanitizer';
import type { Badge, UserBadgeProfile } from '@/logic/badges';
import type { BadgeId as BadgeIdValue } from '@/constants/badges';

function createIssuedBadge(badgeId: BadgeIdValue): Badge {
  const definition = getDefaultBadgeDefinitions().find((candidate) => candidate.badge_id === badgeId);
  if (!definition) {
    throw new Error(`Missing badge definition for ${badgeId}`);
  }

  return {
    badge_id: definition.badge_id,
    badge_type: definition.badge_type,
    badge_tier: definition.badge_tier,
    name: definition.name,
    description: definition.description,
    icon_url: definition.icon_url,
    rarity: definition.rarity,
    game_type: definition.game_type,
    unlocked_at: new Date().toISOString(),
    progress: definition.criteria.threshold,
    max_progress: definition.criteria.threshold,
    rewards: definition.rewards,
    rewards_claimed: false,
    metadata: definition.metadata,
  };
}

export async function seedIssuedBadges(userId: string, badgeIds: BadgeIdValue[]): Promise<void> {
  const badges = badgeIds.map(createIssuedBadge);
  const profile: UserBadgeProfile = {
    user_id: userId,
    badges,
    badge_counts: badges.reduce<UserBadgeProfile['badge_counts']>(
      (counts, badge) => ({
        ...counts,
        [badge.badge_type]: (counts[badge.badge_type] ?? 0) + 1,
        total: counts.total + 1,
      }),
      { total: 0 },
    ),
    active_badges: [],
    badge_progress: {},
    last_updated: new Date().toISOString(),
  };

  const key = buildSafeBucketKey(BucketPath.UserBadges, `${userId}.json`);
  const matchesBucket = env.MATCHES_BUCKET as R2Bucket;
  await matchesBucket.put(key, JSON.stringify(profile), {
    httpMetadata: {
      contentType: HttpContentType.ApplicationJson,
    },
  });
}
