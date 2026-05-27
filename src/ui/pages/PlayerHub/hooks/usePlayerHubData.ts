import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import {
  claimDailyReward,
  getCreditsBalance,
  getDailyReward,
  getInventory,
  getLearningProgress,
  getMarketplaceListings,
  getPerformanceReport,
  getPlayerStats,
  getProfile,
  getSettings,
  updateProfile,
  updateSettings,
  type ProfileUpdatePatch,
  type UserSettingsPatch,
} from '@ocentra/api-domain/playerHub';
import type { PlayerHubInventoryItem, PlayerHubState } from '@/ui/pages/PlayerHub/types';
import {
  buildPlayerHubAuthProfile,
  mergePlayerHubProfile,
} from '@/ui/pages/PlayerHub/playerHubProfileBoundary';

interface PlayerHubData extends PlayerHubState {
  refreshAll: () => Promise<void>;
  loadUserData: (userId: string) => Promise<void>;
  updateProfileFields: (patch: ProfileUpdatePatch) => Promise<string>;
  updateSettingsFields: (patch: UserSettingsPatch) => Promise<string>;
  claimDailyRewardNow: () => Promise<string>;
}

function mapError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeInventoryItems(response: PlayerHubState['rawInventory']): PlayerHubInventoryItem[] {
  const equipped = response?.equipped ?? {};
  return (response?.items ?? []).map((item) => {
    const quantity = readNumber(item.quantity) ?? readNumber(item.count) ?? 1;
    const itemType = typeof item.itemType === 'string' && item.itemType.length > 0
      ? item.itemType
      : typeof item.type === 'string'
        ? item.type
        : undefined;
    return {
      ...item,
      quantity,
      itemType,
      equipped: item.equipped === true || Object.values(equipped).includes(item.itemId),
    };
  });
}

function pushFailure(failures: string[], label: string, result: PromiseSettledResult<unknown>): void {
  if (result.status === 'rejected') {
    failures.push(`${label}: ${mapError(result.reason, 'Unavailable')}`);
  }
}

function idempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function usePlayerHubData(user: UserProfile | null): PlayerHubData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState(user?.uid ?? '');
  const [profile, setProfile] = useState<PlayerHubState['profile']>(null);
  const [inventoryItems, setInventoryItems] = useState<PlayerHubState['inventoryItems']>([]);
  const [rawInventory, setRawInventory] = useState<PlayerHubState['rawInventory']>(null);
  const [marketplaceListings, setMarketplaceListings] = useState<PlayerHubState['marketplaceListings']>([]);
  const [creditBalance, setCreditBalance] = useState<PlayerHubState['creditBalance']>(null);
  const [dailyReward, setDailyReward] = useState<PlayerHubState['dailyReward']>(null);
  const [settings, setSettings] = useState<PlayerHubState['settings']>(null);
  const [playerStats, setPlayerStats] = useState<PlayerHubState['playerStats']>(null);
  const [learningProgress, setLearningProgress] = useState<PlayerHubState['learningProgress']>(null);
  const [performanceReport, setPerformanceReport] = useState<PlayerHubState['performanceReport']>(null);
  const [serviceErrors, setServiceErrors] = useState<string[]>([]);

  const refreshForUser = useCallback(async (nextUserId: string) => {
    setLoading(true);
    setError(null);
    setServiceErrors([]);
    const authProfile = buildPlayerHubAuthProfile(user, nextUserId);

    try {
      if (nextUserId) {
        const [
          profileResponse,
          inventoryResponse,
          marketplaceResponse,
          creditBalanceResponse,
          dailyRewardResponse,
          settingsResponse,
          playerStatsResponse,
          learningProgressResponse,
          performanceReportResponse,
        ] = await Promise.allSettled([
          getProfile(nextUserId),
          getInventory(nextUserId),
          getMarketplaceListings(),
          getCreditsBalance(nextUserId),
          getDailyReward(),
          getSettings(nextUserId),
          getPlayerStats(nextUserId),
          getLearningProgress(nextUserId),
          getPerformanceReport(nextUserId),
        ]);

        const failures: string[] = [];
        pushFailure(failures, 'Profile', profileResponse);
        pushFailure(failures, 'Inventory', inventoryResponse);
        pushFailure(failures, 'Marketplace', marketplaceResponse);
        pushFailure(failures, 'Credits', creditBalanceResponse);
        pushFailure(failures, 'Daily rewards', dailyRewardResponse);
        pushFailure(failures, 'Settings', settingsResponse);
        pushFailure(failures, 'Player stats', playerStatsResponse);
        pushFailure(failures, 'Learning', learningProgressResponse);
        pushFailure(failures, 'Performance report', performanceReportResponse);

        setProfile(mergePlayerHubProfile(authProfile, profileResponse.status === 'fulfilled' ? profileResponse.value : null, nextUserId));
        const nextInventory = inventoryResponse.status === 'fulfilled' ? inventoryResponse.value : null;
        setRawInventory(nextInventory);
        setInventoryItems(normalizeInventoryItems(nextInventory));
        setMarketplaceListings(marketplaceResponse.status === 'fulfilled' ? marketplaceResponse.value.listings ?? [] : []);
        setCreditBalance(creditBalanceResponse.status === 'fulfilled' ? creditBalanceResponse.value : null);
        setDailyReward(dailyRewardResponse.status === 'fulfilled' ? dailyRewardResponse.value : null);
        setSettings(settingsResponse.status === 'fulfilled' ? settingsResponse.value.settings ?? null : null);
        setPlayerStats(playerStatsResponse.status === 'fulfilled' ? playerStatsResponse.value : null);
        setLearningProgress(learningProgressResponse.status === 'fulfilled' ? learningProgressResponse.value : null);
        setPerformanceReport(performanceReportResponse.status === 'fulfilled' ? performanceReportResponse.value : null);
        setServiceErrors(failures);
      } else {
        const marketplaceResponse = await getMarketplaceListings().catch(() => ({ listings: [] }));
        setProfile(authProfile);
        setRawInventory(null);
        setInventoryItems([]);
        setMarketplaceListings(marketplaceResponse.listings ?? []);
        setCreditBalance(null);
        setDailyReward(null);
        setSettings(null);
        setPlayerStats(null);
        setLearningProgress(null);
        setPerformanceReport(null);
        setServiceErrors([]);
      }
    } catch (refreshError) {
      setError(mapError(refreshError, 'Failed to load player hub data'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshAll = useCallback(async () => {
    const resolvedUserId = targetUserId || user?.uid || '';
    await refreshForUser(resolvedUserId);
  }, [refreshForUser, targetUserId, user?.uid]);

  const loadUserData = useCallback(async (nextUserId: string) => {
    if (!nextUserId) {
      return;
    }

    setTargetUserId(nextUserId);
    await refreshForUser(nextUserId);
  }, [refreshForUser]);

  const updateProfileFields = useCallback(async (patch: ProfileUpdatePatch) => {
    const resolvedUserId = targetUserId || user?.uid || '';
    if (!resolvedUserId) {
      throw new Error('Sign in is required to update profile.');
    }
    const updated = await updateProfile(resolvedUserId, patch);
    const authProfile = buildPlayerHubAuthProfile(user, resolvedUserId);
    setProfile(mergePlayerHubProfile(authProfile, updated, resolvedUserId));
    return 'Profile changes applied.';
  }, [targetUserId, user]);

  const updateSettingsFields = useCallback(async (patch: UserSettingsPatch) => {
    const resolvedUserId = targetUserId || user?.uid || '';
    if (!resolvedUserId) {
      throw new Error('Sign in is required to update settings.');
    }
    const updated = await updateSettings(resolvedUserId, patch);
    setSettings(updated.settings ?? null);
    return 'Settings changes applied.';
  }, [targetUserId, user?.uid]);

  const claimDailyRewardNow = useCallback(async () => {
    const resolvedUserId = targetUserId || user?.uid || '';
    if (!resolvedUserId) {
      throw new Error('Sign in is required to claim daily rewards.');
    }
    const result = await claimDailyReward(idempotencyKey());
    if (result.balance) {
      setCreditBalance(result.balance);
    }
    setDailyReward(previous => ({
      ...(previous ?? {}),
      ...result,
      available: false,
      claimed: result.claimed ?? true,
      lastReward: result.reward ?? previous?.lastReward ?? null,
    }));
    return result.alreadyClaimed ? 'Daily reward was already claimed.' : 'Daily reward claimed.';
  }, [targetUserId, user?.uid]);

  useEffect(() => {
    const initialUserId = user?.uid ?? '';
    setTargetUserId(initialUserId);
    void refreshForUser(initialUserId);
  }, [refreshForUser, user?.uid]);

  return {
    loading,
    error,
    targetUserId,
    profile,
    inventoryItems,
    rawInventory,
    marketplaceListings,
    creditBalance,
    dailyReward,
    settings,
    playerStats,
    learningProgress,
    performanceReport,
    serviceErrors,
    refreshAll,
    loadUserData,
    updateProfileFields,
    updateSettingsFields,
    claimDailyRewardNow,
  };
}
