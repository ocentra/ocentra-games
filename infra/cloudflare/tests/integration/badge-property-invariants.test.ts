import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { beforeAll, afterAll } from 'vitest';
import { testName } from '@tests/helpers/test-name';
import * as fc from 'fast-check';
import {
  unlockBadgeLogic,
  updateBadgeProgressLogic,
  setActiveBadgesLogic,
  type BadgeStorage,
  type BadgeDefinition,
  type UserBadgeProfile,
  type BadgeWithEtag,
} from '@/logic/badges';
import { BadgeId, BadgeType, BadgeRarity, MaxActiveBadges } from '@/constants/badges';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  beforeAll(() => {});
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  logInfo('[TEST] Starting badge property-based invariant tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  const createMockStorage = (initialProfile: UserBadgeProfile, definitions: BadgeDefinition[]): BadgeStorage => {
    let profile = { ...initialProfile };
    return {
      async getProfile(userId: string): Promise<BadgeWithEtag> {
        return { profile: { ...profile, user_id: userId }, etag: 'test-etag' };
      },
      async saveProfile(newProfile: UserBadgeProfile, _expectedEtag: string | null): Promise<{ success: boolean; etag: string | null }> {
        void _expectedEtag;
        profile = newProfile;
        return { success: true, etag: 'new-etag' };
      },
      async getDefinitions(): Promise<BadgeDefinition[]> {
        return definitions;
      },
    };
  };

  const createMockDefinitions = (): BadgeDefinition[] => [
    {
      badge_id: BadgeId.ProBronze,
      badge_type: BadgeType.Performance,
      badge_tier: 'bronze',
      name: 'Pro (Bronze)',
      description: 'Win 10 matches',
      rarity: BadgeRarity.Common,
      criteria: { type: 'matches_won', threshold: 10 },
      rewards: [{ type: 'gp_global', amount: 50, one_time: true }],
    },
    {
      badge_id: BadgeId.ProSilver,
      badge_type: BadgeType.Performance,
      badge_tier: 'silver',
      name: 'Pro (Silver)',
      description: 'Win 50 matches',
      rarity: BadgeRarity.Rare,
      criteria: { type: 'matches_won', threshold: 50 },
      rewards: [{ type: 'gp_global', amount: 200, one_time: true }],
    },
  ];

  it(testName('Badge Unlock Invariants: property: same badge unlock request twice does not create duplicate badges'), async () => {
      await fc.assert(
        fc.asyncProperty(fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/), async (userId) => {
          const definitions = createMockDefinitions();
          const initialProfile: UserBadgeProfile = {
            user_id: userId,
            badges: [],
            badge_counts: { total: 0 },
            active_badges: [],
            badge_progress: {},
            last_updated: new Date().toISOString(),
          };
          const storage = createMockStorage(initialProfile, definitions);

          const unlock1 = await unlockBadgeLogic(
            { userId, badgeId: BadgeId.ProBronze },
            storage
          );
          const unlock2 = await unlockBadgeLogic(
            { userId, badgeId: BadgeId.ProBronze },
            storage
          );

          expect(unlock1.success).toBe(true);
          expect(unlock2.success).toBe(true);
          expect(unlock2.rewards_claimed).toBe(false);
          if (unlock1.success !== true || unlock2.success !== true || unlock2.rewards_claimed !== false) {
            logError('[TEST] Badge unlock invariant violation', getStackTrace(), { unlock1: unlock1.success, unlock2: unlock2.success, rewardsClaimed: unlock2.rewards_claimed });
          }

          const { profile } = await storage.getProfile(userId);
          expect(profile.badges.length).toBe(1);
          if (profile.badges.length !== 1) {
            logError('[TEST] Badge duplicate detection failed', getStackTrace(), { badgeCount: profile.badges.length, expected: 1 });
          }
          expect(profile.badge_counts.total).toBe(1);
        })
      );
    });

  it(testName('Badge Unlock Invariants: property: badge unlock does not decrease total badge count'), async () => {
      await fc.assert(
        fc.asyncProperty(fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/), async (userId) => {
          const definitions = createMockDefinitions();
          const initialProfile: UserBadgeProfile = {
            user_id: userId,
            badges: [],
            badge_counts: { total: 0 },
            active_badges: [],
            badge_progress: {},
            last_updated: new Date().toISOString(),
          };
          const storage = createMockStorage(initialProfile, definitions);

          const { profile: profileBefore } = await storage.getProfile(userId);
          const countBefore = profileBefore.badge_counts.total;

          await unlockBadgeLogic(
            { userId, badgeId: BadgeId.ProBronze },
            storage
          );

          const { profile: profileAfter } = await storage.getProfile(userId);
          const countAfter = profileAfter.badge_counts.total;

          expect(countAfter).toBeGreaterThanOrEqual(countBefore);
        })
      );
    });

  it(testName('Badge Unlock Invariants: property: unlocking different badges increases total count correctly'), async () => {
      await fc.assert(
        fc.asyncProperty(fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/), async (userId) => {
          const definitions = createMockDefinitions();
          const initialProfile: UserBadgeProfile = {
            user_id: userId,
            badges: [],
            badge_counts: { total: 0 },
            active_badges: [],
            badge_progress: {},
            last_updated: new Date().toISOString(),
          };
          const storage = createMockStorage(initialProfile, definitions);

          await unlockBadgeLogic({ userId, badgeId: BadgeId.ProBronze }, storage);
          await unlockBadgeLogic({ userId, badgeId: BadgeId.ProSilver }, storage);

          const { profile } = await storage.getProfile(userId);
          expect(profile.badges.length).toBe(2);
          expect(profile.badge_counts.total).toBe(2);
        })
      );
    });

  it(testName('Badge Progress Invariants: property: progress update does not decrease current progress'), async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          async (userId, progress1, progress2) => {
            const definitions = createMockDefinitions();
            const initialProfile: UserBadgeProfile = {
              user_id: userId,
              badges: [],
              badge_counts: { total: 0 },
              active_badges: [],
              badge_progress: {},
              last_updated: new Date().toISOString(),
            };
            const storage = createMockStorage(initialProfile, definitions);

            await updateBadgeProgressLogic(
              { userId, badgeId: BadgeId.ProBronze, progress: Math.max(progress1, progress2) },
              storage
            );

            const { profile: profile1 } = await storage.getProfile(userId);
            const progressBefore = profile1.badge_progress[BadgeId.ProBronze] || 0;

            await updateBadgeProgressLogic(
              { userId, badgeId: BadgeId.ProBronze, progress: Math.min(progress1, progress2) },
              storage
            );

            const { profile: profile2 } = await storage.getProfile(userId);
            const progressAfter = profile2.badge_progress[BadgeId.ProBronze] || 0;

            expect(progressAfter).toBeGreaterThanOrEqual(progressBefore);
          }
        )
      );
    });

  it(testName('Badge Progress Invariants: property: progress cannot exceed threshold'), async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/),
          fc.integer({ min: 0, max: 200 }),
          async (userId, progress) => {
            const definitions = createMockDefinitions();
            const initialProfile: UserBadgeProfile = {
              user_id: userId,
              badges: [],
              badge_counts: { total: 0 },
              active_badges: [],
              badge_progress: {},
              last_updated: new Date().toISOString(),
            };
            const storage = createMockStorage(initialProfile, definitions);

            await updateBadgeProgressLogic(
              { userId, badgeId: BadgeId.ProBronze, progress },
              storage
            );

            const { profile } = await storage.getProfile(userId);
            const storedProgress = profile.badge_progress[BadgeId.ProBronze] || 0;
            expect(storedProgress).toBeLessThanOrEqual(10);
          }
        )
      );
    });

  it(testName('Active Badges Invariants: property: active badges count never exceeds maximum'), async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/),
          fc.array(fc.constantFrom(BadgeId.ProBronze, BadgeId.ProSilver), { minLength: 0, maxLength: MaxActiveBadges + 5 }),
          async (userId, badgeIds) => {
            const definitions = createMockDefinitions();
            const initialProfile: UserBadgeProfile = {
              user_id: userId,
              badges: [
                {
                  badge_id: BadgeId.ProBronze,
                  badge_type: BadgeType.Performance,
                  name: 'Pro (Bronze)',
                  description: 'Win 10 matches',
                  rarity: BadgeRarity.Common,
                  unlocked_at: new Date().toISOString(),
                  max_progress: 10,
                  progress: 10,
                  rewards: [],
                },
                {
                  badge_id: BadgeId.ProSilver,
                  badge_type: BadgeType.Performance,
                  name: 'Pro (Silver)',
                  description: 'Win 50 matches',
                  rarity: BadgeRarity.Rare,
                  unlocked_at: new Date().toISOString(),
                  max_progress: 50,
                  progress: 50,
                  rewards: [],
                },
              ],
              badge_counts: { total: 2 },
              active_badges: [],
              badge_progress: {},
              last_updated: new Date().toISOString(),
            };
            const storage = createMockStorage(initialProfile, definitions);

            const result = await setActiveBadgesLogic(
              { userId, badgeIds },
              storage
            );

            if (badgeIds.length <= MaxActiveBadges) {
              expect(result.success).toBe(true);
              const { profile } = await storage.getProfile(userId);
              expect(profile.active_badges.length).toBeLessThanOrEqual(MaxActiveBadges);
            } else {
              expect(result.success).toBe(false);
            }
          }
        )
      );
    });

  it(testName('Active Badges Invariants: property: setting active badges does not change total badge count'), async () => {
      await fc.assert(
        fc.asyncProperty(fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/), async (userId) => {
          const definitions = createMockDefinitions();
          const initialProfile: UserBadgeProfile = {
            user_id: userId,
            badges: [
              {
                badge_id: BadgeId.ProBronze,
                badge_type: BadgeType.Performance,
                name: 'Pro (Bronze)',
                description: 'Win 10 matches',
                rarity: BadgeRarity.Common,
                unlocked_at: new Date().toISOString(),
                max_progress: 10,
                progress: 10,
                rewards: [],
              },
            ],
            badge_counts: { total: 1 },
            active_badges: [],
            badge_progress: {},
            last_updated: new Date().toISOString(),
          };
          const storage = createMockStorage(initialProfile, definitions);

          const { profile: profileBefore } = await storage.getProfile(userId);
          const countBefore = profileBefore.badge_counts.total;

          await setActiveBadgesLogic(
            { userId, badgeIds: [BadgeId.ProBronze] },
            storage
          );

          const { profile: profileAfter } = await storage.getProfile(userId);
          const countAfter = profileAfter.badge_counts.total;

          expect(countAfter).toBe(countBefore);
        })
      );
  });

  it(testName('Badge Count Invariants: property: badge_counts.total equals badges.length'), async () => {
      await fc.assert(
        fc.asyncProperty(fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/), async (userId) => {
          const definitions = createMockDefinitions();
          const initialProfile: UserBadgeProfile = {
            user_id: userId,
            badges: [],
            badge_counts: { total: 0 },
            active_badges: [],
            badge_progress: {},
            last_updated: new Date().toISOString(),
          };
          const storage = createMockStorage(initialProfile, definitions);

          await unlockBadgeLogic({ userId, badgeId: BadgeId.ProBronze }, storage);
          await unlockBadgeLogic({ userId, badgeId: BadgeId.ProSilver }, storage);

          const { profile } = await storage.getProfile(userId);
          expect(profile.badge_counts.total).toBe(profile.badges.length);
        })
      );
    });

  it(testName('Badge Count Invariants: property: badge_counts by type equals badges of that type'), async () => {
      await fc.assert(
        fc.asyncProperty(fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/), async (userId) => {
          const definitions = createMockDefinitions();
          const initialProfile: UserBadgeProfile = {
            user_id: userId,
            badges: [],
            badge_counts: { total: 0 },
            active_badges: [],
            badge_progress: {},
            last_updated: new Date().toISOString(),
          };
          const storage = createMockStorage(initialProfile, definitions);

          await unlockBadgeLogic({ userId, badgeId: BadgeId.ProBronze }, storage);
          await unlockBadgeLogic({ userId, badgeId: BadgeId.ProSilver }, storage);

          const { profile } = await storage.getProfile(userId);
          const performanceCount = profile.badges.filter(b => b.badge_type === BadgeType.Performance).length;
          expect(profile.badge_counts[BadgeType.Performance]).toBe(performanceCount);
        })
      );
    });
});
