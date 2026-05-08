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

export function LobbyPage({ user, gameId, onLogout, onLogoutClick }: LobbyPageProps) {
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const { runWithSession } = useAuthAccess();
  const activeGameType = gameId ?? readMultiplayerConfig().gameId;
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

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });

  return (
    <UnifiedPageShell
      className="lb-page"
      background={<DynamicBackground />}
      header={
        <UnifiedHeader
          dynamicData={{
            gameName: "Lobby",
            tagline: "Create or join a room, then start a multiplayer session."
          }}
          config={{
            right: headerRightConfig,
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home))
            }
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <LobbyPageContent
        loading={loading}
        creating={creating}
        error={error}
        gameId={activeGameType}
        rooms={rooms}
        busyRoomId={busyRoomId}
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

