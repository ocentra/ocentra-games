import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { APP_VERSION } from '@/constants/version';
import type { UserProfile } from '@/adapters/firebase/service';
import './GameNotFound.css';
import '../SelectedGame/SelectedGamePage.css';

interface GameNotFoundProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
  message?: string;
}

export function GameNotFound({ user, onLogout, onLogoutClick, message }: GameNotFoundProps) {
  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };

  const handleBackToHome = () => {
    if (window.history && window.history.pushState) {
      window.history.pushState({ screen: 'home' }, '', '/');
    }
    EventBus.instance.publish(new ShowScreenEvent('home'));
  };

  return (
    <UnifiedPageShell
      className="generic-game-page"
      header={
        <UnifiedHeader
          dynamicData={{
            gameName: "Game Not Found",
            tagline: "Lost in the void."
          }}
          config={{
            right: {
              isProfile: Boolean(user),
              user: user ? {
                name: user.displayName || 'Player',
                email: user.email,
                avatarUrl: user.photoURL,
                isLoggedIn: true,
              } : undefined,
              onLogout: handleLogout
            },
            left: {
              onClick: handleBackToHome
            }
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <div className="generic-game-main">
        <div className="game-not-found-content">
          <div className="game-not-found-icon">🎮</div>
          <h1 className="game-not-found-title">Game Not Found</h1>
          <p className="game-not-found-message">
            {message || 'The game you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <button className="game-not-found-button" onClick={handleBackToHome}>
            Back to Home
          </button>
        </div>
      </div>
    </UnifiedPageShell>
  );
}
