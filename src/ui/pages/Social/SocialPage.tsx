import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { SocialWorldPageContent, type SocialWorldPresence, type SocialWorldQuickGame } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { APP_VERSION } from '@/constants/version';
import { useSocialHubData } from '@/ui/pages/Social/hooks/useSocialHubData';
import {
  AppScreenToken,
  buildCategoryPath,
  buildCompetitionPath,
  buildGameLobbyPath,
  buildGamePath,
  buildMatchmakingPath,
  buildPlayerHubPath,
  buildShopPath,
} from '@/ui/navigation/appRoutes';
import type { HomePageGamesDocument } from '@ocentra/game-asset-domain/schemas/home-page-games-schema';
import type { GameHome } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { AssetLoader } from '@/adapters/assets/AssetLoader';

const SOCIAL_FAVORITE_GAMES_STORAGE_PREFIX = 'ocentra:social-world:favorite-games';

type SocialGameSourceData = Pick<HomePageGamesDocument, 'featured' | 'recommended' | 'comingSoon' | 'catalogMontageImages' | 'availableNow' | 'featureBannerItems'>;

const EMPTY_SOCIAL_GAME_SOURCE_DATA: SocialGameSourceData = {
  featured: [],
  recommended: [],
  comingSoon: [],
  catalogMontageImages: [],
  availableNow: [],
  featureBannerItems: [],
};

function getFavoriteStorageKey(user: UserProfile | null): string {
  return `${SOCIAL_FAVORITE_GAMES_STORAGE_PREFIX}:${user?.uid ?? 'guest'}`;
}

function readFavoriteGameIds(storageKey: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavoriteGameIds(storageKey: string, ids: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(ids));
}

function uniqueGameSources(...groups: Array<readonly GameHome[] | undefined>): GameHome[] {
  const seen = new Set<string>();
  const games: GameHome[] = [];
  for (const group of groups) {
    for (const game of group ?? []) {
      if (!game.gameId || seen.has(game.gameId)) continue;
      seen.add(game.gameId);
      games.push(game);
    }
  }
  return games;
}

function getGameImageCandidate(game: GameHome): string | null {
  const candidate = game.gameIcon || game.bannerImage || game.carouselImages?.[0] || game.textImageUrl;
  return candidate || null;
}

async function resolveGameImageUrl(game: GameHome): Promise<string | null> {
  const candidate = getGameImageCandidate(game);
  if (!candidate) return null;
  if (candidate.startsWith('/') || candidate.startsWith('http')) return candidate;
  if (!isImageHash(candidate)) return null;
  try {
    return await AssetLoader.getInstance().resolveImageUrlByHash(candidate);
  } catch {
    return null;
  }
}

function toQuickGame(game: GameHome, imageUrl: string | null): SocialWorldQuickGame {
  return {
    gameId: game.gameId,
    name: game.name,
    category: game.gameCategory ?? game.tags?.[0] ?? null,
    difficulty: game.difficulty ?? null,
    players: game.playersDisplay ?? null,
    imageUrl,
  };
}

interface SocialPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function SocialPage({ user }: SocialPageProps) {
  const {
    loading,
    error,
    presence,
    friends,
    party,
    notifications,
    feedItems,
    messages,
    createPartyForUser,
  } = useSocialHubData(user);
  const [socialGameSourceData, setSocialGameSourceData] = useState<SocialGameSourceData>(EMPTY_SOCIAL_GAME_SOURCE_DATA);
  const favoriteStorageKey = useMemo(() => getFavoriteStorageKey(user), [user]);
  const [favoriteGameIds, setFavoriteGameIds] = useState<string[]>(() => readFavoriteGameIds(favoriteStorageKey));
  const [quickGameImageUrls, setQuickGameImageUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setFavoriteGameIds(readFavoriteGameIds(favoriteStorageKey));
  }, [favoriteStorageKey]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { getHomePageGamesInfos } = await import('@/adapters/assets/GameCatalogService');
      const homePageGames = await getHomePageGamesInfos();
      if (!active) return;
      setSocialGameSourceData({
        featured: homePageGames.featured,
        recommended: homePageGames.recommended ?? [],
        comingSoon: homePageGames.comingSoon,
        catalogMontageImages: homePageGames.catalogMontageImages ?? [],
        availableNow: homePageGames.availableNow,
        featureBannerItems: homePageGames.featureBannerItems ?? [],
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  const sourceGames = useMemo(() => (
    uniqueGameSources(
      socialGameSourceData.availableNow,
      socialGameSourceData.featured,
      socialGameSourceData.recommended,
    )
  ), [socialGameSourceData.availableNow, socialGameSourceData.featured, socialGameSourceData.recommended]);

  useEffect(() => {
    let active = true;
    const resolvedObjectUrls: string[] = [];
    void (async () => {
      const entries = await Promise.all(
        sourceGames.map(async (game) => {
          const imageUrl = await resolveGameImageUrl(game);
          if (imageUrl?.startsWith('blob:')) {
            resolvedObjectUrls.push(imageUrl);
          }
          return [game.gameId, imageUrl] as const;
        })
      );
      if (!active) {
        resolvedObjectUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setQuickGameImageUrls(Object.fromEntries(entries));
    })();
    return () => {
      active = false;
      resolvedObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [sourceGames]);

  const quickGames = useMemo(() => {
    const favoriteOrder = new Map(favoriteGameIds.map((id, index) => [id, index]));
    return [...sourceGames]
      .sort((a, b) => {
        const aFavorite = favoriteOrder.get(a.gameId);
        const bFavorite = favoriteOrder.get(b.gameId);
        if (aFavorite !== undefined && bFavorite !== undefined) return aFavorite - bFavorite;
        if (aFavorite !== undefined) return -1;
        if (bFavorite !== undefined) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8)
      .map((game) => toQuickGame(game, quickGameImageUrls[game.gameId] ?? null));
  }, [favoriteGameIds, quickGameImageUrls, sourceGames]);

  const toggleFavoriteGame = useCallback((gameId: string) => {
    setFavoriteGameIds((current) => {
      const next = current.includes(gameId)
        ? current.filter((id) => id !== gameId)
        : [gameId, ...current];
      writeFavoriteGameIds(favoriteStorageKey, next);
      return next;
    });
  }, [favoriteStorageKey]);

  const socialPresence: SocialWorldPresence = {
    userName: user?.displayName || user?.email || user?.uid || 'Ocentra player',
    status: presence?.status ?? 'offline',
    friends: friends.length,
    partyMembers: party?.members?.length ?? 0,
    unread: notifications.filter(notification => !notification.read).length,
    messages: messages.length,
    feedItems: feedItems.length,
  };

  const publishPath = (path: string) => EventBus.instance.publish(new ShowScreenEvent(path));

  return (
    <UnifiedPageShell
      className="social-page social-page--world"
      workClassName="social-world-shell-work"
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <SocialWorldPageContent
        loading={loading}
        error={error}
        presence={socialPresence}
        quickGames={quickGames}
        favoriteGameIds={favoriteGameIds}
        onToggleFavorite={toggleFavoriteGame}
        onCreateParty={() => { void createPartyForUser(); }}
        onOpenLobby={(gameId) => publishPath(gameId ? buildGameLobbyPath(gameId) : AppScreenToken.Lobby)}
        onOpenGame={(gameId) => publishPath(buildGamePath(gameId))}
        onOpenCategory={(categoryId) => publishPath(buildCategoryPath(categoryId))}
        onOpenShop={() => publishPath(buildShopPath())}
        onOpenCompetition={() => publishPath(buildCompetitionPath())}
        onOpenPlayerHub={() => publishPath(buildPlayerHubPath())}
        onOpenMatchmaking={() => publishPath(buildMatchmakingPath())}
      />
    </UnifiedPageShell>
  );
}

