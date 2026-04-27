import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@/ui/components/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { APP_VERSION } from '@/constants/version';
import { LeaderboardPanel } from '@/ui/pages/Competition/components/LeaderboardPanel';
import { TournamentPanel } from '@/ui/pages/Competition/components/TournamentPanel';
import { useCompetitionData } from '@/ui/pages/Competition/hooks/useCompetitionData';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import './CompetitionPage.css';

interface CompetitionPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function CompetitionPage({ user, onLogout, onLogoutClick }: CompetitionPageProps) {
  const { runWithAccount } = useAuthAccess();
  const hasAccount = Boolean(user) && user.isGuest !== true;
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
  } = useCompetitionData(hasAccount ? user?.uid ?? null : null);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });

  return (
    <UnifiedPageShell
      className="cp-page"
      background={<DynamicBackground />}
      header={
        <UnifiedHeader
          dynamicData={{
            gameName: "Competition",
            tagline: "Rank ladders, nearby standings, and tournament brackets."
          }}
          config={{
            right: headerRightConfig,
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent('home'))
            }
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
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
                showPersonalizedStats={hasAccount}
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
                onRegister={async (nextTournamentId) => {
                  await runWithAccount(async () => {
                    await registerForTournament(nextTournamentId);
                  });
                }}
              />
            </div>
          )}
        </section>
      </main>
    </UnifiedPageShell>
  );
}

