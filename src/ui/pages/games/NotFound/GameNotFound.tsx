import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { GameHeader } from '@ocentra/core-ui';
import { AppFooter } from '@/ui/components/AppFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
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
  const headerProps = useCoreUIHeaderProps();
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
    <div className="generic-game-page">
      <GameHeader
        {...headerProps}
        user={user}
        onLogout={handleLogout}
        showProfile
        variant="game"
        gameName="Game Not Found"
        onHomeClick={handleBackToHome}
      />

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

      <AppFooter />
    </div>
  );
}

