import { useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@/ui/components/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { APP_VERSION } from '@/constants/version';
import { CreateRoomModal } from '@/ui/pages/Lobby/components/CreateRoomModal';
import { RoomList } from '@/ui/pages/Lobby/components/RoomList';
import { useLobbyRooms } from '@/ui/pages/Lobby/hooks/useLobbyRooms';
import { readMultiplayerConfig } from '@/ui/pages/Matchmaking/types';
import { AppScreenToken, buildGameMatchmakingPath } from '@/ui/navigation/appRoutes';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import './LobbyPage.css';

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
      <main className="lb-content">
        <section className="lb-panel">
          <div className="lb-header">
            <h1 className="lb-title">Active Rooms</h1>
            <div className="lb-header-actions">
              <button
                type="button"
                className="lb-btn lb-btn-secondary"
                onClick={() => {
                  void refresh();
                }}
              >
                Refresh
              </button>
              <button
                type="button"
                className="lb-btn lb-btn-primary"
                onClick={() => setShowCreateRoomModal(true)}
              >
                Create Room
              </button>
              <button
                type="button"
                className="lb-btn lb-btn-secondary"
                onClick={() => EventBus.instance.publish(new ShowScreenEvent(buildGameMatchmakingPath(activeGameType)))}
              >
                Back to Matchmaking
              </button>
            </div>
          </div>

          {error && <div className="lb-error">{error}</div>}
          {loading ? (
            <div className="lb-loading">Loading rooms...</div>
          ) : (
            <RoomList
              rooms={rooms}
              busyRoomId={busyRoomId}
              onJoin={(roomId) => {
                void runWithSession(async (activeUser) => {
                  await joinRoom(roomId, activeUser.uid);
                });
              }}
              onLeave={(roomId) => {
                void runWithSession(async (activeUser) => {
                  await leaveRoom(roomId, activeUser.uid);
                });
              }}
            />
          )}
        </section>
      </main>

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

