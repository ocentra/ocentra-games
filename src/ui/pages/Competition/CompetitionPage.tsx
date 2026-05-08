import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { CompetitionPageContent } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { APP_VERSION } from '@/constants/version';
import { useCompetitionData } from '@/ui/pages/Competition/hooks/useCompetitionData';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import './CompetitionPage.css';

interface CompetitionPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
  pageMode?:
    | 'competition'
    | 'tournaments'
    | 'tournamentDetail'
    | 'leaderboard'
    | 'gameLeaderboard'
    | 'aiBenchmarkLeaderboard';
  gameId?: string;
  tournamentId?: string;
}

function getCompetitionHeader(
  pageMode: NonNullable<CompetitionPageProps['pageMode']>,
  gameId?: string,
  tournamentId?: string
): { gameName: string; tagline: string } {
  if (pageMode === 'leaderboard') {
    return { gameName: 'Leaderboard', tagline: 'Overall ranks across every game.' };
  }
  if (pageMode === 'gameLeaderboard') {
    return { gameName: 'Game Leaderboard', tagline: `Ranks and nearby standings for ${gameId ?? 'this game'}.` };
  }
  if (pageMode === 'aiBenchmarkLeaderboard') {
    return { gameName: 'AI Benchmarks', tagline: 'AI-vs-AI model standings and benchmark runs.' };
  }
  if (pageMode === 'tournaments') {
    return { gameName: 'Tournaments', tagline: 'Scheduled competitive events and active brackets.' };
  }
  if (pageMode === 'tournamentDetail') {
    return { gameName: 'Tournament Detail', tagline: `Bracket, registration, and status for ${tournamentId ?? 'the selected tournament'}.` };
  }
  return { gameName: 'Competition', tagline: 'Rank ladders, nearby standings, and tournament brackets.' };
}

export function CompetitionPage({
  user,
  onLogout,
  onLogoutClick,
  pageMode = 'competition',
  gameId,
  tournamentId: routeTournamentId,
}: CompetitionPageProps) {
  const { runWithAccount } = useAuthAccess();
  const accountUserId = user && user.isGuest !== true ? user.uid : null;
  const hasAccount = accountUserId !== null;
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
  } = useCompetitionData(accountUserId);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });
  const headerDynamicData = getCompetitionHeader(pageMode, gameId, routeTournamentId ?? tournamentId);

  return (
    <UnifiedPageShell
      className="cp-page"
      background={<DynamicBackground />}
      header={
        <UnifiedHeader
          dynamicData={headerDynamicData}
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
      <CompetitionPageContent
        loading={loading}
        registering={registering}
        error={error}
        gameType={gameType}
        seasonId={seasonId}
        lastUpdated={lastUpdated}
        leaderboardEntries={leaderboardEntries}
        showPersonalizedStats={hasAccount}
        userEntry={userEntry}
        nearbyAbove={nearbyAbove}
        nearbyBelow={nearbyBelow}
        tournamentId={tournamentId}
        tournamentRounds={Array.isArray(tournamentBracket?.rounds) ? tournamentBracket.rounds : []}
        onRefreshLeaderboard={(nextGameType) => { void refreshLeaderboard(nextGameType); }}
        onLoadBracket={(nextTournamentId) => { void loadTournamentBracket(nextTournamentId); }}
        onRegister={(nextTournamentId) => {
          void runWithAccount(async () => {
            await registerForTournament(nextTournamentId);
          });
        }}
        onMatchmaking={() => EventBus.instance.publish(new ShowScreenEvent('matchmaking'))}
      />
    </UnifiedPageShell>
  );
}

