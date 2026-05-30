import { useEffect, useMemo, useRef, useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import {
  LobbyPageContent,
  type LobbyAddAISeatDraft,
  type LobbyCreateRoomDraft,
  type LobbyHeroMedia,
  type LobbyJoinCodeDraft,
  type LobbyNavigationTarget,
  type LobbyQuickJoinDraft,
  type LobbyRoomListFilterDraft,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { APP_VERSION } from '@/constants/version';
import { CreateRoomModal } from '@/ui/pages/Lobby/components/CreateRoomModal';
import { useLobbyRooms } from '@/ui/pages/Lobby/hooks/useLobbyRooms';
import { useLobbySideServices } from '@/ui/pages/Lobby/hooks/useLobbySideServices';
import { createDefaultLobbyRoomForm, type CreateLobbyRoomForm } from '@/ui/pages/Lobby/types';
import { readMultiplayerConfig } from '@/ui/pages/Matchmaking/types';
import {
  AppScreenToken,
  buildGamePlayPath,
  buildGameLobbyPath,
  buildGameMatchmakingPath,
  buildLeaderboardPath,
  buildPlayerHubPath,
  buildSettingsPath,
  buildShopPath,
  buildSocialPath,
  buildTournamentsPath,
} from '@/ui/navigation/appRoutes';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import { useResolveImageUrl } from '@/hooks/useResolveImageUrl';
import { loadLobbyAssetContext, type LobbyAssetContext } from '@/ui/pages/Lobby/lobbyAssetSections';

interface LobbyPageProps {
  user: UserProfile | null;
  gameId?: string;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

type ImageResolverInput = Parameters<typeof useResolveImageUrl>[0];

function getLobbyGameName(gameId: string): string {
  const base = gameId.split(':')[0] || gameId;
  return base
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ') || 'Claim';
}

function getDisplayName(activeUser: UserProfile): string {
  return activeUser.displayName || activeUser.email || activeUser.uid;
}

function createRoomFormFromDraft(gameType: string, draft: LobbyCreateRoomDraft): CreateLobbyRoomForm {
  const visibility = draft.visibility ?? 'public';
  return {
    ...createDefaultLobbyRoomForm(gameType),
    roomName: draft.roomName,
    roomType: 'game',
    mode: draft.mode ?? 'casual',
    visibility,
    maxPlayers: draft.maxPlayers ?? 4,
    gameType,
    allowAI: draft.allowAI ?? true,
    aiCount: draft.aiCount ?? 0,
    aiProviderId: draft.aiProviderId,
    aiModelId: draft.aiModelId,
    difficulty: draft.difficulty,
    aiRole: draft.aiRole,
    coachEnabled: draft.coachEnabled,
    coachModelId: draft.coachModelId,
    guideMode: draft.guideMode,
    allowSpectators: draft.allowSpectators ?? true,
    stakeType: draft.stakeType ?? 'free',
    stakeAmount: draft.stakeAmount ?? 0,
    turnTimerSeconds: draft.turnTimerSeconds ?? 60,
    region: draft.region ?? 'global',
    isPrivate: visibility !== 'public',
  };
}

function buildLobbyNavigationPath(target: LobbyNavigationTarget, gameType: string): string {
  if (target === 'lobby') return buildGameLobbyPath(gameType);
  if (target === 'tournaments') return buildTournamentsPath();
  if (target === 'leaderboard') return buildLeaderboardPath();
  if (target === 'profile') return buildPlayerHubPath();
  if (target === 'settings') return buildSettingsPath();
  if (target === 'social') return buildSocialPath();
  return buildShopPath();
}

async function writeRoomShareText(room: { joinCode?: string; roomId?: string; roomName?: string }, gameType: string): Promise<void> {
  const code = room.joinCode ?? room.roomId ?? '';
  const url = `${window.location.origin}${buildGameLobbyPath(gameType)}`;
  const text = code ? `Join ${room.roomName ?? 'my table'} with code ${code}: ${url}` : url;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
}

export function LobbyPage({ user, gameId, onLogout, onLogoutClick }: LobbyPageProps) {
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [assetContext, setAssetContext] = useState<LobbyAssetContext | null>(null);
  const startedRoomHandoffRef = useRef<string | null>(null);
  const { runWithSession } = useAuthAccess();
  const requestedGameType = gameId ?? readMultiplayerConfig().gameId;
  const activeGameType = assetContext?.routeId ?? requestedGameType;
  const gameName = assetContext?.gameName ?? getLobbyGameName(activeGameType);
  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });
  useEffect(() => {
    let cancelled = false;
    setAssetContext(null);
    void loadLobbyAssetContext(requestedGameType)
      .then((context) => {
        if (!cancelled) setAssetContext(context);
      })
      .catch(() => {
        if (!cancelled) setAssetContext(null);
      });
    return () => {
      cancelled = true;
    };
  }, [requestedGameType]);
  const {
    rooms,
    joinedRoom,
    chatMessages,
    server,
    loading,
    busyRoomId,
    creating,
    error,
    refresh,
    createRoom,
    quickJoin,
    joinRoom,
    spectateRoom,
    leaveRoom,
    readyRoom,
    unreadyRoom,
    startRoom,
    addAIRoomSeat,
    sendRoomChat,
    filters,
    setFilters,
  } = useLobbyRooms(activeGameType);
  const sideServices = useLobbySideServices(activeGameType, user?.uid, joinedRoom);
  useEffect(() => {
    if (joinedRoom?.gameStatus !== 'starting') {
      return;
    }
    const handoffKey = joinedRoom.matchId ?? joinedRoom.roomId;
    if (!handoffKey || startedRoomHandoffRef.current === handoffKey) {
      return;
    }
    startedRoomHandoffRef.current = handoffKey;
    const searchParams = new URLSearchParams({
      roomId: joinedRoom.roomId,
      matchId: joinedRoom.matchId ?? joinedRoom.roomId,
      source: 'lobby',
    });
    const currentSearchParams = new URLSearchParams(window.location.search);
    ['seed', 'autoStartSeconds', 'botDelayMs'].forEach((name) => {
      const value = currentSearchParams.get(name);
      if (value) {
        searchParams.set(name, value);
      }
    });
    EventBus.instance.publish(new ShowScreenEvent(`${buildGamePlayPath(activeGameType)}?${searchParams.toString()}`));
  }, [activeGameType, joinedRoom?.gameStatus, joinedRoom?.matchId, joinedRoom?.roomId]);
  const viewerWinRatio = user ? Math.max(0, Math.min(1, user.winRate > 1 ? user.winRate / 100 : user.winRate)) : 0;
  const lobbyViewer = user
    ? {
      name: user.displayName || user.email,
      level: user.isGuest ? 'Guest' : `ELO ${Math.round(user.eloRating)}`,
      xp: `${user.gamesPlayed} games`,
      balance: sideServices.reward?.balanceLabel ?? (user.walletAddress ? 'Wallet linked' : 'No wallet'),
      xpRatio: viewerWinRatio,
    }
    : null;
  const lobbyImageResolverInput = useMemo<ImageResolverInput>(() => {
    const hero = assetContext?.hero;
    if (!hero) return {};
    const hashes = [
      ...hero.slides.map(slide => slide.imageHash),
      hero.logoImageHash,
    ].filter((hash): hash is NonNullable<typeof hash> => Boolean(hash));
    return {
      featureBannerItems: hashes.map((imageHash, index) => ({
        title: `Lobby image ${index + 1}`,
        description: '',
        imageHash,
      })),
    };
  }, [assetContext]);
  const { resolveImageUrl, ImageLoaders } = useResolveImageUrl(lobbyImageResolverInput);
  const heroMedia = useMemo<LobbyHeroMedia | undefined>(() => {
    const hero = assetContext?.hero;
    if (!hero) return undefined;
    const slides = hero.slides
      .map(slide => {
        const imageUrl = resolveImageUrl(slide.imageHash);
        return imageUrl ? { id: slide.id, imageUrl, alt: slide.alt } : null;
      })
      .filter((slide): slide is NonNullable<typeof slide> => Boolean(slide));
    return {
      slides,
      logoUrl: hero.logoImageHash ? resolveImageUrl(hero.logoImageHash) : null,
      logoAlt: hero.logoAlt,
      titleText: hero.titleText,
      tagline: hero.tagline,
      overlayTintColor: hero.overlayTintColor,
      overlayTintOpacity: hero.overlayTintOpacity,
    };
  }, [assetContext, resolveImageUrl]);

  return (
    <UnifiedPageShell
      className="lb-page"
      workClassName="lb-shell-work"
      background={<DynamicBackground />}
      header={
        <UnifiedHeader
          dynamicData={{
            gameName: `${gameName} Lobby`,
            tagline: 'Create or join tables before the match starts.',
          }}
          showPrimaryNavigation={false}
          includeAdminNavigation={false}
          config={{
            right: headerRightConfig,
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home)),
            },
          }}
        />
      }
      toolbar={<div className="lb-top-divider" aria-hidden="true" />}
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      {ImageLoaders}
      <LobbyPageContent
        loading={loading}
        creating={creating}
        error={error ?? sideServices.error}
        gameId={activeGameType}
        gameName={gameName}
        rooms={rooms}
        busyRoomId={busyRoomId}
        useSampleData={false}
        viewer={lobbyViewer}
        viewerUserId={user?.uid}
        joinedRoom={joinedRoom}
        friends={sideServices.friends}
        chatMessages={chatMessages}
        lobbyChatMessages={sideServices.lobbyChatMessages}
        reward={sideServices.reward}
        party={sideServices.party}
        server={sideServices.server ?? server}
        minPlayers={assetContext?.minPlayers}
        maxPlayers={assetContext?.maxPlayers}
        gameTagline={assetContext?.tagline}
        heroMedia={heroMedia}
        onRefresh={() => {
          void refresh();
          void sideServices.refresh();
        }}
        onCreateRoom={(draft?: LobbyCreateRoomDraft) => {
          if (!draft) {
            setShowCreateRoomModal(true);
            return;
          }
          void runWithSession(async (activeUser) => {
            await createRoom(createRoomFormFromDraft(activeGameType, draft), activeUser.uid, getDisplayName(activeUser));
          });
        }}
        onQuickJoin={(draft?: LobbyQuickJoinDraft) => {
          void runWithSession(async (activeUser) => {
            await quickJoin(draft ?? {}, activeUser.uid, getDisplayName(activeUser));
          });
        }}
        onJoinRoom={(roomId) => {
          void runWithSession(async (activeUser) => {
            await joinRoom(roomId, activeUser.uid, getDisplayName(activeUser));
          });
        }}
        onJoinRoomCode={(draft: LobbyJoinCodeDraft) => {
          const code = draft.code.trim();
          if (!code) {
            return;
          }
          void runWithSession(async (activeUser) => {
            await joinRoom(code, activeUser.uid, draft.displayName ?? getDisplayName(activeUser));
          });
        }}
        onSpectateRoom={(roomId) => {
          void runWithSession(async (activeUser) => {
            await spectateRoom(roomId, activeUser.uid, getDisplayName(activeUser));
          });
        }}
        onLeaveRoom={(roomId) => {
          void runWithSession(async (activeUser) => {
            await leaveRoom(roomId, activeUser.uid);
          });
        }}
        onReadyRoom={(roomId) => {
          void runWithSession(async (activeUser) => {
            await readyRoom(roomId, activeUser.uid);
          });
        }}
        onUnreadyRoom={(roomId) => {
          void runWithSession(async (activeUser) => {
            await unreadyRoom(roomId, activeUser.uid);
          });
        }}
        onStartRoom={(roomId) => {
          void runWithSession(async (activeUser) => {
            await startRoom(roomId, activeUser.uid);
          });
        }}
        onAddAIRoom={(roomId, draft?: LobbyAddAISeatDraft) => {
          void runWithSession(async (activeUser) => {
            await addAIRoomSeat(roomId, activeUser.uid, draft);
          });
        }}
        onSendRoomChat={sendRoomChat}
        onSendLobbyChat={(message) => {
          void runWithSession(async (activeUser) => {
            await sideServices.sendLobbyChat(message, activeUser.uid);
          });
        }}
        onAddFriend={(friendId) => {
          void runWithSession(async (activeUser) => {
            await sideServices.addFriend(friendId, activeUser.uid);
          });
        }}
        onInviteFriend={(friendId) => {
          void runWithSession(async (activeUser) => {
            await sideServices.inviteFriend(friendId, activeUser.uid);
          });
        }}
        onCreateParty={() => {
          void runWithSession(async (activeUser) => {
            await sideServices.createParty(activeUser.uid);
          });
        }}
        onLeaveParty={() => {
          void runWithSession(async (activeUser) => {
            await sideServices.leaveParty(activeUser.uid);
          });
        }}
        onClaimReward={() => {
          void runWithSession(async (activeUser) => {
            await sideServices.claimReward(activeUser.uid);
          });
        }}
        onSelectServer={(regionId) => {
          void runWithSession(async (activeUser) => {
            await sideServices.selectServer(regionId, activeUser.uid);
          });
        }}
        onRefreshLobbyServices={() => {
          void runWithSession(async (activeUser) => {
            await sideServices.refresh(activeUser.uid);
          });
        }}
        onShareRoomCode={(room) => {
          void writeRoomShareText(room, activeGameType);
        }}
        onMatchmaking={() => EventBus.instance.publish(new ShowScreenEvent(buildGameMatchmakingPath(activeGameType)))}
        filters={filters}
        onFilterRooms={(nextFilters: LobbyRoomListFilterDraft) => {
          setFilters(nextFilters);
        }}
        onNavigate={(target: LobbyNavigationTarget) => {
          EventBus.instance.publish(new ShowScreenEvent(buildLobbyNavigationPath(target, activeGameType)));
        }}
        onWallet={() => {
          EventBus.instance.publish(new ShowScreenEvent(buildShopPath()));
        }}
        layoutControls={assetContext?.layoutControls}
      />

      <CreateRoomModal
        open={showCreateRoomModal}
        loading={creating}
        defaultGameType={activeGameType}
        onClose={() => setShowCreateRoomModal(false)}
        onCreate={async (form) => {
          const created = await runWithSession(async (activeUser) => {
            await createRoom(form, activeUser.uid, getDisplayName(activeUser));
            return true;
          });
          if (!created) {
            return;
          }
          setShowCreateRoomModal(false);
        }}
      />
    </UnifiedPageShell>
  );
}

