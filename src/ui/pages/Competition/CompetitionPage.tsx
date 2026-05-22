import { useEffect, useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { CompetitionPageContent } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import {
  resolveLeaderboardPageGameType,
  type LeaderboardGameOption,
  type LeaderboardIconName,
  type PartialLeaderboardPageContentData,
  type LeaderboardQuickGame,
  type LeaderboardTone,
} from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgContent';
import type { LeaderboardPageSvgControls } from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgSurfaceControls';
import { APP_VERSION } from '@/constants/version';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import { useCompetitionData } from '@/ui/pages/Competition/hooks/useCompetitionData';
import { loadGamesDataSnapshot } from '@/ui/pages/dev/CardGamesExplorer/adapters/gamesDataSnapshot';
import type { Game } from '@/ui/pages/dev/CardGamesExplorer/types';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';

interface CompetitionPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
  pageMode?:
    | 'competition'
    | 'events'
    | 'eventDetail'
    | 'tournaments'
    | 'tournamentDetail'
    | 'leaderboard'
    | 'gameLeaderboard'
    | 'aiBenchmarkLeaderboard'
    | 'matches'
    | 'matchDetail';
  gameId?: string;
  eventId?: string;
  tournamentId?: string;
  matchId?: string;
}

type LeaderboardPageMode = Extract<
  NonNullable<CompetitionPageProps['pageMode']>,
  'leaderboard' | 'gameLeaderboard' | 'aiBenchmarkLeaderboard'
>;

type ResourceEntryRef = {
  guid?: string;
  path?: string;
  assetType?: string;
  checksum?: string;
};

type LooseRecord = Record<string, unknown>;

const KNOWN_LEADERBOARD_GAME_TYPES: Record<string, number> = {
  'three-card-brag': 1,
  spades: 3,
  poker: 4,
  rummy: 5,
  blackjack: 6,
  'teen-patti': 7,
};

const LEADERBOARD_PAGE_LAYOUT_ASSET_PATH_BY_MODE: Record<LeaderboardPageMode, string> = {
  leaderboard: 'Resources/Pages/LeaderboardPageLayout.asset',
  gameLeaderboard: 'Resources/Pages/GameLeaderboardPageLayout.asset',
  aiBenchmarkLeaderboard: 'Resources/Pages/AiBenchmarkLeaderboardPageLayout.asset',
};

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function dataOf(document: unknown): LooseRecord {
  const record = asRecord(document);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function findResourceByPath(resources: ResourceEntryRef[], path: string, assetType = ''): ResourceEntryRef | null {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return null;
  return resources.find((resource) => (
    resource.guid &&
    normalizePath(resource.path ?? '') === normalizedPath &&
    (!assetType || !resource.assetType || resource.assetType === assetType)
  )) ?? null;
}

function isLeaderboardPageMode(pageMode: NonNullable<CompetitionPageProps['pageMode']>): pageMode is LeaderboardPageMode {
  return pageMode === 'leaderboard' || pageMode === 'gameLeaderboard' || pageMode === 'aiBenchmarkLeaderboard';
}

function catalogKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'game';
}

function catalogGameId(game: Game): string {
  return game.slug || catalogKey(game.name);
}

function catalogGameTone(game: Game): LeaderboardTone {
  const category = catalogKey(game.category);
  if (category.includes('poker') || category.includes('gambling')) return 'red';
  if (category.includes('rummy') || category.includes('patience')) return 'purple';
  if (category.includes('banking') || category.includes('vying')) return 'gold';
  if (category.includes('unknown') || category.includes('other')) return 'muted';
  return 'cyan';
}

function catalogGameIcon(game: Game): LeaderboardIconName {
  const category = catalogKey(game.category);
  if (category.includes('tournament')) return 'trophy';
  if (category.includes('banking') || category.includes('gambling')) return 'coins';
  if (category.includes('poker') || category.includes('rummy') || category.includes('vying')) return 'crown';
  if (category.includes('ai')) return 'bot';
  return 'gamepad';
}

function catalogGameValue(game: Game): string {
  const players = game.players?.trim();
  if (players) return players;
  const deck = game.deck?.trim();
  if (deck) return deck;
  return game.source === 'asset' ? 'Playable' : 'Catalog';
}

function catalogGameDetail(game: Game): string {
  return game.duration?.trim() || game.difficulty?.trim() || game.quality?.trim() || (game.source === 'asset' ? 'Available' : 'Catalog');
}

function catalogGameRoute(game: Game): string {
  return `/games/${catalogGameId(game)}/leaderboard`;
}

function catalogGameType(game: Game): number | undefined {
  return KNOWN_LEADERBOARD_GAME_TYPES[catalogGameId(game)];
}

function sortCatalogGamesForLeaderboard(games: Game[]): Game[] {
  const uniqueGames = new Map<string, Game>();
  for (const game of games) {
    const id = catalogGameId(game);
    if (game.name.trim().length === 0 || id.length === 0 || uniqueGames.has(id)) {
      continue;
    }
    uniqueGames.set(id, game);
  }

  return Array.from(uniqueGames.values())
    .filter(game => game.name.trim().length > 0 && catalogGameId(game).length > 0)
    .sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
}

function buildCatalogLeaderboardContent(
  content: PartialLeaderboardPageContentData | undefined,
  games: Game[],
): PartialLeaderboardPageContentData | undefined {
  const catalogGames = sortCatalogGamesForLeaderboard(games);
  if (catalogGames.length === 0) return content;

  const topGames: LeaderboardGameOption[] = catalogGames.map((game, index) => ({
    id: catalogGameId(game),
    rank: index + 1,
    name: game.name,
    matches: catalogGameValue(game),
    growth: catalogGameDetail(game),
    tone: catalogGameTone(game),
    category: game.category,
    subcategory: game.subcategory ?? null,
    gameType: catalogGameType(game),
    routePath: catalogGameRoute(game),
  }));
  const quickGames: LeaderboardQuickGame[] = catalogGames.map(game => ({
    id: catalogGameId(game),
    name: game.name,
    detail: game.subcategory?.trim() || game.category,
    icon: catalogGameIcon(game),
    tone: catalogGameTone(game),
    category: game.category,
    subcategory: game.subcategory ?? null,
    gameType: catalogGameType(game),
    routePath: catalogGameRoute(game),
  }));

  return {
    ...content,
    topGames,
    quickGames,
  };
}

async function loadLeaderboardPageLayoutData(
  pageMode: LeaderboardPageMode,
): Promise<{
  controls?: Partial<LeaderboardPageSvgControls>;
  content?: PartialLeaderboardPageContentData;
}> {
  const resources = await getEntryIndexResourceEntries();
  const assetPath = LEADERBOARD_PAGE_LAYOUT_ASSET_PATH_BY_MODE[pageMode];
  const resource = findResourceByPath(resources, assetPath, 'PageLayout');
  if (!resource?.guid) throw new Error('Leaderboard layout asset not found');
  const layoutDocument = await loadRawAssetDocumentByGuid(resource.guid, {
    cache: 'no-store',
    checksum: resource.checksum,
  });
  const data = dataOf(layoutDocument);
  const controls = asRecord(data.leaderboardControls);
  const content = asRecord(data.leaderboardContent);
  return {
    controls: Object.keys(controls).length > 0 ? controls as Partial<LeaderboardPageSvgControls> : undefined,
    content: Object.keys(content).length > 0 ? content as PartialLeaderboardPageContentData : undefined,
  };
}

function getCompetitionHeader(
  pageMode: NonNullable<CompetitionPageProps['pageMode']>,
  gameId?: string,
  tournamentId?: string,
  eventId?: string,
  matchId?: string
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
  if (pageMode === 'events') {
    return { gameName: 'Events', tagline: 'Campaigns, seasonal entry paths, and shop-backed access.' };
  }
  if (pageMode === 'eventDetail') {
    return { gameName: 'Event Detail', tagline: `Rules, access, and rewards for ${eventId ?? 'the selected event'}.` };
  }
  if (pageMode === 'tournaments') {
    return { gameName: 'Tournaments', tagline: 'Scheduled competitive events and active brackets.' };
  }
  if (pageMode === 'tournamentDetail') {
    return { gameName: 'Tournament Detail', tagline: `Bracket, registration, and status for ${tournamentId ?? 'the selected tournament'}.` };
  }
  if (pageMode === 'matches') {
    return { gameName: 'Matches', tagline: 'Account match history, table receipts, and result records.' };
  }
  if (pageMode === 'matchDetail') {
    return { gameName: 'Match Detail', tagline: `Result record and table receipt for ${matchId ?? 'the selected match'}.` };
  }
  return { gameName: 'Competition', tagline: 'Rank ladders, nearby standings, and tournament brackets.' };
}

export function CompetitionPage({
  user,
  onLogout,
  onLogoutClick,
  pageMode = 'competition',
  gameId,
  eventId,
  tournamentId: routeTournamentId,
  matchId,
}: CompetitionPageProps) {
  const { runWithAccount } = useAuthAccess();
  const accountUserId = user && user.isGuest !== true ? user.uid : null;
  const hasAccount = accountUserId !== null;
  const isLeaderboardMode = isLeaderboardPageMode(pageMode);
  const [leaderboardControls, setLeaderboardControls] = useState<Partial<LeaderboardPageSvgControls> | undefined>(undefined);
  const [leaderboardContent, setLeaderboardContent] = useState<PartialLeaderboardPageContentData | undefined>(undefined);
  const [requestedLeaderboardGameType, setRequestedLeaderboardGameType] = useState<number | null>(null);
  const {
    loading,
    registering,
    error,
    leaderboardError,
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
  } = useCompetitionData(accountUserId, { loadDefaultTournament: !isLeaderboardMode });

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });
  const headerDynamicData = getCompetitionHeader(pageMode, gameId, routeTournamentId ?? tournamentId, eventId, matchId);
  const contentError = isLeaderboardMode ? leaderboardError : error;

  useEffect(() => {
    let cancelled = false;
    if (!isLeaderboardMode) {
      setLeaderboardControls(undefined);
      setLeaderboardContent(undefined);
      setRequestedLeaderboardGameType(null);
      return () => { cancelled = true; };
    }
    void Promise.allSettled([
      loadLeaderboardPageLayoutData(pageMode),
      loadGamesDataSnapshot(),
    ])
      .then(([layoutResult, catalogResult]) => {
        if (!cancelled) {
          const layoutData: {
            controls?: Partial<LeaderboardPageSvgControls>;
            content?: PartialLeaderboardPageContentData;
          } = layoutResult.status === 'fulfilled' ? layoutResult.value : {};
          const catalogGames = catalogResult.status === 'fulfilled' ? catalogResult.value.games : [];
          setLeaderboardControls(layoutData.controls);
          setLeaderboardContent(buildCatalogLeaderboardContent(layoutData.content, catalogGames));
          setRequestedLeaderboardGameType(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLeaderboardControls(undefined);
          setLeaderboardContent(undefined);
          setRequestedLeaderboardGameType(null);
        }
      });
    return () => { cancelled = true; };
  }, [isLeaderboardMode, pageMode]);

  useEffect(() => {
    if (!isLeaderboardMode) return;
    const nextGameType = resolveLeaderboardPageGameType(leaderboardContent, pageMode, gameId);
    if (typeof nextGameType !== 'number' || nextGameType === gameType || requestedLeaderboardGameType === nextGameType) return;
    setRequestedLeaderboardGameType(nextGameType);
    void refreshLeaderboard(nextGameType);
  }, [gameId, gameType, isLeaderboardMode, leaderboardContent, pageMode, refreshLeaderboard, requestedLeaderboardGameType]);

  return (
    <UnifiedPageShell
      className="cp-page"
      background={<DynamicBackground />}
      header={
        <UnifiedHeader
          dynamicData={headerDynamicData}
          showPrimaryNavigation={!isLeaderboardMode}
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
        error={contentError}
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
        pageMode={pageMode}
        gameId={gameId}
        eventId={eventId}
        matchId={matchId}
        leaderboardControls={leaderboardControls}
        leaderboardContent={leaderboardContent}
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

