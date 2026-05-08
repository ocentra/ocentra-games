import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { MatchmakingPageContent } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { APP_VERSION } from '@/constants/version';
import { useMatchmakingQueue } from '@/ui/pages/Matchmaking/hooks/useMatchmakingQueue';
import { AppScreenToken, buildGameLobbyPath } from '@/ui/navigation/appRoutes';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';

interface MatchmakingPageProps {
  user: UserProfile | null;
  gameId?: string;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function MatchmakingPage({ user, gameId, onLogout, onLogoutClick }: MatchmakingPageProps) {
  const { runWithSession } = useAuthAccess();
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
  } = useMatchmakingQueue(gameId);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });

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
            right: headerRightConfig,
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home))
            }
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <MatchmakingPageContent
        gameId={config.gameId}
        gameName={config.gameName}
        humans={config.humans}
        ai={config.ai}
        ticket={ticket}
        status={status}
        loading={loading}
        leaving={leaving}
        error={error}
        hasMatch={hasMatch}
        queueStatusLabel={queueStatusLabel}
        onQueue={() => {
          void runWithSession(async (activeUser) => {
            await queue(activeUser.uid);
          });
        }}
        onLeave={() => {
          void runWithSession(async () => {
            await leave();
          });
        }}
        onRefreshStatus={() => {
          void refreshStatus();
        }}
        onOpenLobby={() => EventBus.instance.publish(new ShowScreenEvent(buildGameLobbyPath(config.gameId)))}
      />
    </UnifiedPageShell>
  );
}

