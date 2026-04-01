import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import {
  getInventory,
  getMarketplaceListings,
  getProfile,
} from '@ocentra/api-domain/playerHub';
import type { PlayerHubState } from '@/ui/pages/PlayerHub/types';

interface PlayerHubData extends PlayerHubState {
  refreshAll: () => Promise<void>;
  loadUserData: (userId: string) => Promise<void>;
}

function mapError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

export function usePlayerHubData(user: UserProfile | null): PlayerHubData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState(user?.uid ?? '');
  const [profile, setProfile] = useState<PlayerHubState['profile']>(null);
  const [inventoryItems, setInventoryItems] = useState<PlayerHubState['inventoryItems']>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<PlayerHubState['marketplaceListings']>([]);

  const refreshForUser = useCallback(async (nextUserId: string) => {
    setLoading(true);
    setError(null);

    try {
      if (nextUserId) {
        const [profileResponse, inventoryResponse, marketplaceResponse] = await Promise.all([
          getProfile(nextUserId),
          getInventory(nextUserId),
          getMarketplaceListings(),
        ]);
        setProfile(profileResponse);
        setInventoryItems(inventoryResponse.items ?? []);
        setMarketplaceListings(marketplaceResponse.listings ?? []);
      } else {
        const marketplaceResponse = await getMarketplaceListings();
        setProfile(null);
        setInventoryItems([]);
        setMarketplaceListings(marketplaceResponse.listings ?? []);
      }
    } catch (refreshError) {
      setError(mapError(refreshError, 'Failed to load player hub data'));
    } finally {
      setLoading(false);
    }
  }, []);

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
    marketplaceListings,
    refreshAll,
    loadUserData,
  };
}
