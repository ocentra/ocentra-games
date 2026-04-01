import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, beforeEach } from 'vitest';
import {
  getUserBadgeProfileLogic,
  checkBadgeProgressLogic,
  unlockBadgeLogic,
  updateBadgeProgressLogic,
  setActiveBadgesLogic,
  getBadgeProgressLogic,
  getBadgeDefinitionsLogic,
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

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  let mockStorage: BadgeStorage;
  let mockDefinitions: BadgeDefinition[];
  let mockProfile: UserBadgeProfile;

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  beforeEach(() => {
    logInfo('[TEST] Setting up badge test mocks', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    mockDefinitions = [
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
      {
        badge_id: BadgeId.ManOfMatch,
        badge_type: BadgeType.MatchPerformance,
        name: 'Man of the Match',
        description: 'Highest score in match',
        rarity: BadgeRarity.Common,
        criteria: { type: 'match_score', threshold: 1 },
        rewards: [{ type: 'gp_global', amount: 25, one_time: true }],
      },
    ];

    mockProfile = {
      user_id: 'test-user',
      badges: [],
      badge_counts: { total: 0 },
      active_badges: [],
      badge_progress: {},
      last_updated: new Date().toISOString(),
    };

    mockStorage = {
      async getProfile(userId: string): Promise<BadgeWithEtag> {
        return { profile: { ...mockProfile, user_id: userId }, etag: 'test-etag' };
      },
      async saveProfile(profile: UserBadgeProfile, _expectedEtag: string | null): Promise<{ success: boolean; etag: string | null }> {
        void _expectedEtag;
        mockProfile = profile;
        return { success: true, etag: 'new-etag' };
      },
      async getDefinitions(): Promise<BadgeDefinition[]> {
        return mockDefinitions;
      },
    };
  });

  it(testName('getUserBadgeProfileLogic: returns user badge profile'), async () => {
      logInfo('[TEST] Testing getUserBadgeProfileLogic', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const profile = await getUserBadgeProfileLogic('test-user', mockStorage);
      expect(profile.user_id).toBe('test-user');
      expect(profile.badges).toEqual([]);
      expect(profile.badge_counts.total).toBe(0);
      if (profile.user_id !== 'test-user' || profile.badges.length !== 0 || profile.badge_counts.total !== 0) {
        logError('[TEST] Badge profile retrieval failed or invalid', getStackTrace(), { userId: profile.user_id, badgeCount: profile.badges.length, total: profile.badge_counts.total });
      }
  });

  it(testName('checkBadgeProgressLogic: returns unlocked false when progress below threshold'), async () => {
      logInfo('[TEST] Testing checkBadgeProgressLogic with progress below threshold', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const result = await checkBadgeProgressLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze, currentValue: 5 },
        mockStorage
      );
      expect(result.unlocked).toBe(false);
      expect(result.progress).toBe(5);
      expect(result.max_progress).toBe(10);
      if (result.unlocked !== false || result.progress !== 5 || result.max_progress !== 10) {
        logError('[TEST] Badge progress check failed or invalid', getStackTrace(), { unlocked: result.unlocked, progress: result.progress, maxProgress: result.max_progress });
      }
  });

  it(testName('checkBadgeProgressLogic: returns unlocked true when progress meets threshold'), async () => {
      const result = await checkBadgeProgressLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze, currentValue: 10 },
        mockStorage
      );
      expect(result.unlocked).toBe(true);
      expect(result.progress).toBe(10);
  });

  it(testName('checkBadgeProgressLogic: returns unlocked false for non-existent badge'), async () => {
      const result = await checkBadgeProgressLogic(
        { userId: 'test-user', badgeId: 'non_existent' as BadgeId, currentValue: 10 },
        mockStorage
      );
      expect(result.unlocked).toBe(false);
  });

  it(testName('checkBadgeProgressLogic: checks game type when specified'), async () => {
      mockDefinitions[0].criteria.game_type = 1;
      const result = await checkBadgeProgressLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze, currentValue: 10, gameType: 2 },
        mockStorage
      );
      expect(result.unlocked).toBe(false);
  });

  it(testName('unlockBadgeLogic: unlocks badge when criteria met'), async () => {
      const mockEarnGP = async () => ({ success: true });
      const result = await unlockBadgeLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze },
        mockStorage,
        { earnGP: mockEarnGP }
      );
      expect(result.success).toBe(true);
      if (!result.badge) {
        throw new Error('Badge should be defined when unlock succeeds');
      }
      expect(result.badge.badge_id).toBe(BadgeId.ProBronze);
      expect(result.badge.name).toBe('Pro (Bronze)');
      expect(typeof result.badge.unlocked_at).toBe('string');
      expect(result.badge.unlocked_at.length).toBeGreaterThan(10);
  });

  it(testName('unlockBadgeLogic: returns error for non-existent badge'), async () => {
      const result = await unlockBadgeLogic(
        { userId: 'test-user', badgeId: 'non_existent' as BadgeId },
        mockStorage
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
  });

  it(testName('unlockBadgeLogic: does not unlock already unlocked badge'), async () => {
      mockProfile.badges.push({
        badge_id: BadgeId.ProBronze,
        badge_type: BadgeType.Performance,
        name: 'Pro (Bronze)',
        description: 'Win 10 matches',
        rarity: BadgeRarity.Common,
        unlocked_at: new Date().toISOString(),
        max_progress: 10,
        progress: 10,
        rewards: [],
      });
      const result = await unlockBadgeLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze },
        mockStorage
      );
      expect(result.success).toBe(true);
      expect(result.rewards_claimed).toBe(false);
  });

  it(testName('unlockBadgeLogic: claims rewards when badge unlocked'), async () => {
      let earnedGP = false;
      const mockEarnGP = async () => {
        earnedGP = true;
        return { success: true };
      };
      const result = await unlockBadgeLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze },
        mockStorage,
        { earnGP: mockEarnGP }
      );
      expect(result.success).toBe(true);
      expect(earnedGP).toBe(true);
      expect(result.rewards_claimed).toBe(true);
  });

  it(testName('unlockBadgeLogic: handles concurrent modification retries'), async () => {
      let attemptCount = 0;
      let profileVersion = 0;
      const mockStorageWithRetries: BadgeStorage = {
        ...mockStorage,
        async getProfile(userId: string): Promise<BadgeWithEtag> {
          const baseProfile = { ...mockProfile, user_id: userId };
          if (profileVersion === 0) {
            return { profile: JSON.parse(JSON.stringify(baseProfile)), etag: 'test-etag' };
          }
          return { profile: JSON.parse(JSON.stringify(baseProfile)), etag: 'test-etag' };
        },
        async saveProfile(profile: UserBadgeProfile, _expectedEtag: string | null): Promise<{ success: boolean; etag: string | null }> {
          void _expectedEtag;
          attemptCount++;
          if (attemptCount < 3) {
            profileVersion++;
            return { success: false, etag: null };
          }
          mockProfile = JSON.parse(JSON.stringify(profile));
          return { success: true, etag: 'new-etag' };
        },
      };
      const result = await unlockBadgeLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze },
        mockStorageWithRetries
      );
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
  });

  it(testName('updateBadgeProgressLogic: updates progress without unlocking when below threshold'), async () => {
      const result = await updateBadgeProgressLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze, progress: 5 },
        mockStorage
      );
      expect(result.success).toBe(true);
      expect(result.unlocked).toBe(false);
  });

  it(testName('updateBadgeProgressLogic: unlocks badge when progress meets threshold'), async () => {
      const mockEarnGP = async () => ({ success: true });
      const result = await updateBadgeProgressLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze, progress: 10 },
        mockStorage,
        { earnGP: mockEarnGP }
      );
      expect(result.success).toBe(true);
      expect(result.unlocked).toBe(true);
  });

  it(testName('updateBadgeProgressLogic: returns unlocked true for already unlocked badge'), async () => {
      mockProfile.badges.push({
        badge_id: BadgeId.ProBronze,
        badge_type: BadgeType.Performance,
        name: 'Pro (Bronze)',
        description: 'Win 10 matches',
        rarity: BadgeRarity.Common,
        unlocked_at: new Date().toISOString(),
        max_progress: 10,
        progress: 10,
        rewards: [],
      });
      const result = await updateBadgeProgressLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze, progress: 15 },
        mockStorage
      );
      expect(result.success).toBe(true);
      expect(result.unlocked).toBe(true);
  });

  it(testName('updateBadgeProgressLogic: validates game type when specified'), async () => {
      mockDefinitions[0].criteria.game_type = 1;
      const result = await updateBadgeProgressLogic(
        { userId: 'test-user', badgeId: BadgeId.ProBronze, progress: 10, gameType: 2 },
        mockStorage
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('mismatch');
  });

  it(testName('setActiveBadgesLogic: sets active badges'), async () => {
    mockProfile.badges = [
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
    ];
    const result = await setActiveBadgesLogic(
      { userId: 'test-user', badgeIds: [BadgeId.ProBronze, BadgeId.ProSilver] },
      mockStorage
    );
    expect(result.success).toBe(true);
    expect(mockProfile.active_badges).toEqual([BadgeId.ProBronze, BadgeId.ProSilver]);
  });

  it(testName('setActiveBadgesLogic: rejects more than max active badges'), async () => {
    mockProfile.badges = [
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
    ];
    const tooManyBadges = Array.from({ length: MaxActiveBadges + 1 }, (_, i) => `badge-${i}`);
    const result = await setActiveBadgesLogic(
      { userId: 'test-user', badgeIds: tooManyBadges },
      mockStorage
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Maximum');
  });

  it(testName('setActiveBadgesLogic: rejects invalid badge IDs'), async () => {
    mockProfile.badges = [
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
    ];
    const result = await setActiveBadgesLogic(
      { userId: 'test-user', badgeIds: [BadgeId.ProBronze, 'invalid-badge'] },
      mockStorage
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  it(testName('setActiveBadgesLogic: handles concurrent modification retries'), async () => {
    mockProfile.badges = [
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
    ];
    let attemptCount = 0;
    const mockStorageWithRetries: BadgeStorage = {
      ...mockStorage,
      async saveProfile(profile: UserBadgeProfile, _expectedEtag: string | null): Promise<{ success: boolean; etag: string | null }> {
        void _expectedEtag;
        attemptCount++;
        if (attemptCount < 2) {
          return { success: false, etag: null };
        }
        mockProfile = profile;
        return { success: true, etag: 'new-etag' };
      },
    };
    const result = await setActiveBadgesLogic(
      { userId: 'test-user', badgeIds: [BadgeId.ProBronze] },
      mockStorageWithRetries
    );
    expect(result.success).toBe(true);
    expect(attemptCount).toBe(2);
  });

  it(testName('getBadgeProgressLogic: returns progress for all badges when badgeId not specified'), async () => {
    mockProfile.badge_progress[BadgeId.ProBronze] = 5;
    const result = await getBadgeProgressLogic(
      { userId: 'test-user' },
      mockStorage
    );
    expect(result.progress.length).toBe(mockDefinitions.length);
    expect(result.progress.find(p => p.badge_id === BadgeId.ProBronze)?.current).toBe(5);
    expect(result.progress.find(p => p.badge_id === BadgeId.ProBronze)?.percentage).toBe(50);
  });

  it(testName('getBadgeProgressLogic: returns progress for specific badge'), async () => {
    mockProfile.badge_progress[BadgeId.ProBronze] = 7;
    const result = await getBadgeProgressLogic(
      { userId: 'test-user', badgeId: BadgeId.ProBronze },
      mockStorage
    );
    expect(result.progress.length).toBe(1);
    expect(result.progress[0].badge_id).toBe(BadgeId.ProBronze);
    expect(result.progress[0].current).toBe(7);
    expect(result.progress[0].percentage).toBe(70);
  });

  it(testName('getBadgeProgressLogic: shows unlocked status for unlocked badges'), async () => {
    mockProfile.badges.push({
      badge_id: BadgeId.ProBronze,
      badge_type: BadgeType.Performance,
      name: 'Pro (Bronze)',
      description: 'Win 10 matches',
      rarity: BadgeRarity.Common,
      unlocked_at: new Date().toISOString(),
      max_progress: 10,
      progress: 10,
      rewards: [],
    });
    const result = await getBadgeProgressLogic(
      { userId: 'test-user', badgeId: BadgeId.ProBronze },
      mockStorage
    );
    expect(result.progress[0].unlocked).toBe(true);
    expect(result.progress[0].percentage).toBe(100);
  });

  it(testName('getBadgeDefinitionsLogic: returns all definitions when no filter'), async () => {
    const result = await getBadgeDefinitionsLogic(mockStorage);
    expect(result.length).toBe(mockDefinitions.length);
  });

  it(testName('getBadgeDefinitionsLogic: filters by badge type'), async () => {
    const result = await getBadgeDefinitionsLogic(mockStorage, { badge_type: BadgeType.Performance });
    expect(result.length).toBe(2);
    expect(result.every(d => d.badge_type === BadgeType.Performance)).toBe(true);
  });

  it(testName('getBadgeDefinitionsLogic: filters by rarity'), async () => {
    const result = await getBadgeDefinitionsLogic(mockStorage, { rarity: BadgeRarity.Common });
    expect(result.length).toBe(2);
    expect(result.every(d => d.rarity === BadgeRarity.Common)).toBe(true);
  });

  it(testName('getBadgeDefinitionsLogic: filters by game type'), async () => {
    mockDefinitions[0].game_type = 1;
    const result = await getBadgeDefinitionsLogic(mockStorage, { game_type: 1 });
    expect(result.length).toBe(1);
    expect(result[0].game_type).toBe(1);
  });
});
