import { useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { LobbyPageContent } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { APP_VERSION } from '@/constants/version';
import { CreateRoomModal } from '@/ui/pages/Lobby/components/CreateRoomModal';
import { useLobbyRooms } from '@/ui/pages/Lobby/hooks/useLobbyRooms';
import { readMultiplayerConfig } from '@/ui/pages/Matchmaking/types';
import { AppScreenToken, buildGameMatchmakingPath } from '@/ui/navigation/appRoutes';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';

interface LobbyPageProps {
  user: UserProfile | null;
  gameId?: string;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

function getLobbyGameName(gameId: string): string {
  const base = gameId.split(':')[0] || gameId;
  return base
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ') || 'Claim';
}

export function LobbyPage({ user, gameId, onLogout, onLogoutClick }: LobbyPageProps) {
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const { runWithSession } = useAuthAccess();
  const activeGameType = gameId ?? readMultiplayerConfig().gameId;
  const gameName = getLobbyGameName(activeGameType);
  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });
  const {
    rooms,
    loading,
    busyRoomId,
    creating,
    error,
    refresh,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useLobbyRooms(activeGameType);
  const viewerWinRatio = user ? Math.max(0, Math.min(1, user.winRate > 1 ? user.winRate / 100 : user.winRate)) : 0;
  const lobbyViewer = user
    ? {
      name: user.displayName || user.email,
      level: user.isGuest ? 'Guest' : `ELO ${Math.round(user.eloRating)}`,
      xp: `${user.gamesPlayed} games`,
      balance: user.walletAddress ? 'Wallet linked' : 'No wallet',
      xpRatio: viewerWinRatio,
    }
    : null;

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
      <LobbyPageContent
        loading={loading}
        creating={creating}
        error={error}
        gameId={activeGameType}
        gameName={gameName}
        rooms={rooms}
        busyRoomId={busyRoomId}
        useSampleData={false}
        viewer={lobbyViewer}
        friends={[]}
        chatMessages={[]}
        server={null}
        onRefresh={() => {
          void refresh();
        }}
        onCreateRoom={() => setShowCreateRoomModal(true)}
        onJoinRoom={(roomId) => {
          void runWithSession(async (activeUser) => {
            await joinRoom(roomId, activeUser.uid);
          });
        }}
        onLeaveRoom={(roomId) => {
          void runWithSession(async (activeUser) => {
            await leaveRoom(roomId, activeUser.uid);
          });
        }}
        onMatchmaking={() => EventBus.instance.publish(new ShowScreenEvent(buildGameMatchmakingPath(activeGameType)))}
      />

      <CreateRoomModal
        open={showCreateRoomModal}
        loading={creating}
        defaultGameType={activeGameType}
        onClose={() => setShowCreateRoomModal(false)}
        onCreate={async (form) => {
          const created = await runWithSession(async (activeUser) => {
            await createRoom(form, activeUser.uid);
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

