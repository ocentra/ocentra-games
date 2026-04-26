import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@/ui/components/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { APP_VERSION } from '@/constants/version';
import { QueueActions } from '@/ui/pages/Matchmaking/components/QueueActions';
import { QueueCard } from '@/ui/pages/Matchmaking/components/QueueCard';
import { useMatchmakingQueue } from '@/ui/pages/Matchmaking/hooks/useMatchmakingQueue';
import { AppScreenToken, buildGameLobbyPath } from '@/ui/navigation/appRoutes';
import { getHeaderAvatarUrl } from '@/ui/header/getHeaderAvatarUrl';
import './MatchmakingPage.css';

interface MatchmakingPageProps {
  user: UserProfile | null;
  gameId?: string;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function MatchmakingPage({ user, gameId, onLogout, onLogoutClick }: MatchmakingPageProps) {
  const {
    config,
    ticket,
    status,
    loading,
    leaving,
    error,
    refreshStatus,
    hasMatch,
    queue,
    leave,
    queueStatusLabel,
  } = useMatchmakingQueue(user, gameId);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };

  return (
    <UnifiedPageShell
      className="mm-page"
      background={<DynamicBackground />}
      header={
        <UnifiedHeader
          dynamicData={{
            gameName: "Matchmaking",
            tagline: "Find players, queue up, and move into a lobby."
          }}
          config={{
            right: {
              isProfile: Boolean(user),
              user: user ? {
                name: user.displayName || 'Player',
                email: user.email,
                avatarUrl: getHeaderAvatarUrl(user.photoURL),
                isLoggedIn: true,
              } : undefined,
              onLogout: handleLogout
            },
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home))
            }
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <main className="mm-content">
        <section className="mm-panel">
          <h1 className="mm-title">Multiplayer Queue</h1>
          <p className="mm-subtitle">
            Game: <strong>{config.gameName}</strong> | Humans: <strong>{config.humans}</strong> | AI: <strong>{config.ai}</strong>
          </p>

          <QueueCard
            ticket={ticket}
            status={status}
            queueStatusLabel={queueStatusLabel}
          />

          {error && <div className="mm-error">{error}</div>}

          <QueueActions
            queueDisabled={loading || Boolean(ticket)}
            leaveDisabled={leaving || !ticket}
            onQueue={() => {
              void queue();
            }}
            onLeave={() => {
              void leave();
            }}
            queueLoading={loading}
            leaveLoading={leaving}
          />

          <div className="mm-row">
            <button
              type="button"
              className="mm-btn mm-btn-secondary"
              onClick={() => {
                void refreshStatus();
              }}
              disabled={!ticket}
            >
              Refresh Status
            </button>
            <button
              type="button"
              className="mm-btn mm-btn-secondary"
              onClick={() => EventBus.instance.publish(new ShowScreenEvent(buildGameLobbyPath(config.gameId)))}
            >
              Open Lobby
            </button>
          </div>

          {hasMatch && (
            <div className="mm-success">
              Match found. Move into Lobby to coordinate players before game start.
            </div>
          )}
        </section>
      </main>
    </UnifiedPageShell>
  );
}

