import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@/ui/components/Background/DynamicBackground';
import { GameHeader } from '@ocentra/core-ui/Header/GameHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { APP_VERSION } from '@/constants/version';
import { LeaderboardPanel } from '@/ui/pages/Competition/components/LeaderboardPanel';
import { TournamentPanel } from '@/ui/pages/Competition/components/TournamentPanel';
import { useCompetitionData } from '@/ui/pages/Competition/hooks/useCompetitionData';
import './CompetitionPage.css';

interface CompetitionPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function CompetitionPage({ user, onLogout, onLogoutClick }: CompetitionPageProps) {
  const headerProps = useCoreUIHeaderProps();
  const {
    loading,
    registering,
    error,
    gameType,
    seasonId,
    lastUpdated,
    leaderboardEntries,
    userEntry,
    nearbyAbove,
    nearbyBelow,
    tournamentId,
    tournamentBracket,
    refreshLeaderboard,
    loadTournamentBracket,
    registerForTournament,
  } = useCompetitionData(user);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };

  return (
    <div className="cp-page">
      <DynamicBackground />
      <GameHeader
        {...headerProps}
        user={user}
        onLogout={handleLogout}
        showProfile
        variant="game"
        gameName="Competition"
        tagline="Rank ladders, nearby standings, and tournament brackets."
        onHomeClick={() => EventBus.instance.publish(new ShowScreenEvent('home'))}
      />

      <main className="cp-content">
        <section className="cp-shell">
          <div className="cp-toolbar">
            <h1 className="cp-title">Competitive Play</h1>
            <div className="cp-toolbar-actions">
              <button
                type="button"
                className="cp-btn cp-btn-secondary"
                onClick={() => {
                  void refreshLeaderboard(gameType);
                }}
              >
                Refresh
              </button>
              <button
                type="button"
                className="cp-btn cp-btn-secondary"
                onClick={() => EventBus.instance.publish(new ShowScreenEvent('matchmaking'))}
              >
                Matchmaking
              </button>
            </div>
          </div>

          {error && <div className="cp-error">{error}</div>}
          {loading ? (
            <div className="cp-loading">Loading competition data...</div>
          ) : (
            <div className="cp-grid">
              <LeaderboardPanel
                gameType={gameType}
                seasonId={seasonId}
                lastUpdated={lastUpdated}
                entries={leaderboardEntries}
                userEntry={userEntry}
                nearbyAbove={nearbyAbove}
                nearbyBelow={nearbyBelow}
                onRefresh={refreshLeaderboard}
              />
              <TournamentPanel
                tournamentId={tournamentId}
                registering={registering}
                bracket={tournamentBracket}
                onLoadBracket={loadTournamentBracket}
                onRegister={registerForTournament}
              />
            </div>
          )}
        </section>
      </main>

      <GameFooter appVersion={APP_VERSION} />
    </div>
  );
}
