import { useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@/ui/components/Background/DynamicBackground';
import { GameHeader } from '@ocentra/core-ui';
import { AppFooter } from '@/ui/components/AppFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { CreateRoomModal } from '@/ui/pages/Lobby/components/CreateRoomModal';
import { RoomList } from '@/ui/pages/Lobby/components/RoomList';
import { useLobbyRooms } from '@/ui/pages/Lobby/hooks/useLobbyRooms';
import { readMultiplayerConfig } from '@/ui/pages/Matchmaking/types';
import { AppScreenToken, buildGameMatchmakingPath } from '@/ui/navigation/appRoutes';
import './LobbyPage.css';

interface LobbyPageProps {
  user: UserProfile | null;
  gameId?: string;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function LobbyPage({ user, gameId, onLogout, onLogoutClick }: LobbyPageProps) {
  const headerProps = useCoreUIHeaderProps();
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
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
  } = useLobbyRooms(user, activeGameType);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };

  return (
    <div className="lb-page">
      <DynamicBackground />
      <GameHeader
        {...headerProps}
        user={user}
        onLogout={handleLogout}
        showProfile
        variant="game"
        gameName="Lobby"
        tagline="Create or join a room, then start a multiplayer session."
        onHomeClick={() => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home))}
      />

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
                void joinRoom(roomId);
              }}
              onLeave={(roomId) => {
                void leaveRoom(roomId);
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
          await createRoom(form);
          setShowCreateRoomModal(false);
        }}
      />

      <AppFooter />
    </div>
  );
}
