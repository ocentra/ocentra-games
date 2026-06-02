import { useEffect, useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import type { HeaderIconRenderArgs } from '@ocentra/core-ui/Header/UnifiedHeader.config';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { CompetitionPageContent } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import type { CompetitionPageSvgControls } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import type { ShopPageContentData } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgContent';
import { shopPageWeeklyCupImageUrl } from '@ocentra/app-assets/shop-page';
import {
  DEFAULT_LEADERBOARD_PAGE_CONTENT,
  LEADERBOARD_GAME_ACTIVITY_UNAVAILABLE_LABEL,
  resolveLeaderboardPageGameType,
  type LeaderboardGameOption,
  type LeaderboardIconName,
  type PartialLeaderboardPageContentData,
  type LeaderboardQuickGame,
  type LeaderboardTone,
} from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgContent';
import type { LeaderboardPageSvgControls } from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgSurfaceControls';
import type { CompetitionProgram } from '@ocentra/endpoint-domain/schemas/competition';
import {
  PublicRouteKey,
  PublicRoutePath,
  buildPublicEventDetailPath,
  buildPublicGameLeaderboardPath,
  buildPublicGameLobbyPath,
  buildPublicTournamentDetailPath,
} from '@ocentra/endpoint-domain/constants/public-routes';
import { GameTypeId } from '@ocentra/endpoint-domain/constants/game';
import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';
import type { GameCatalogEntry } from '@ocentra/game-asset-domain/schemas/game-catalog-entry-schema';
import { APP_VERSION } from '@/constants/version';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { getGameCatalogEntries } from '@/adapters/assets/GameCatalogService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import { useCompetitionData } from '@/ui/pages/Competition/hooks/useCompetitionData';
import { enrich } from '@/ui/pages/dev/CardGamesExplorer/helpers';
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

type CompetitionProgramPageMode = Exclude<NonNullable<CompetitionPageProps['pageMode']>, LeaderboardPageMode>;

type ResourceEntryRef = {
  guid?: string;
  path?: string;
  assetType?: string;
  checksum?: string;
};

type LooseRecord = Record<string, unknown>;

const KNOWN_LEADERBOARD_GAME_TYPES: Record<string, number> = {
  claim: GameTypeId.Claim,
  poker: GameTypeId.Poker,
  'word-search': GameTypeId.WordSearch,
  wordsearch: GameTypeId.WordSearch,
};

const LEADERBOARD_PAGE_LAYOUT_ASSET_PATH_BY_MODE: Record<LeaderboardPageMode, string> = {
  leaderboard: 'Resources/Pages/LeaderboardPageLayout.asset',
  gameLeaderboard: 'Resources/Pages/GameLeaderboardPageLayout.asset',
  aiBenchmarkLeaderboard: 'Resources/Pages/AiBenchmarkLeaderboardPageLayout.asset',
};

const COMPETITION_PAGE_LAYOUT_ASSET_PATH_BY_MODE: Record<CompetitionProgramPageMode, string> = {
  competition: 'Resources/Pages/CompetitionPageLayout.asset',
  events: 'Resources/Pages/EventsPageLayout.asset',
  eventDetail: 'Resources/Pages/EventDetailPageLayout.asset',
  tournaments: 'Resources/Pages/TournamentsPageLayout.asset',
  tournamentDetail: 'Resources/Pages/TournamentDetailPageLayout.asset',
  matches: 'Resources/Pages/MatchesPageLayout.asset',
  matchDetail: 'Resources/Pages/MatchDetailPageLayout.asset',
};
const SHOP_PAGE_LAYOUT_ASSET_PATH = 'Resources/Pages/ShopPageLayout.asset';
const COMPETITION_HEADER_CUP_ASPECT = 1.2;

function renderCompetitionHeaderCup({ cx, cy, size }: HeaderIconRenderArgs) {
  const height = Math.min(38, Math.max(28, size * 2.6));
  const width = height * COMPETITION_HEADER_CUP_ASPECT;
  return (
    <image
      href={shopPageWeeklyCupImageUrl}
      x={cx - width / 2}
      y={cy - height / 2}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}

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

function catalogGameSubcategoryLabel(game: Game): string {
  return game.subcategory?.trim() || game.player_mode?.trim() || 'Game catalog';
}

function catalogGameValue(game: Game): string {
  void game;
  return LEADERBOARD_GAME_ACTIVITY_UNAVAILABLE_LABEL;
}

function catalogGameDetail(game: Game): string {
  return catalogGameSubcategoryLabel(game);
}

function catalogGameRoute(game: Game): string {
  void game;
  return '/leaderboard';
}

function catalogGameType(game: Game): number | undefined {
  return KNOWN_LEADERBOARD_GAME_TYPES[catalogGameId(game)];
}

function isPublishedCatalogEntry(entry: GameCatalogEntry): boolean {
  return entry.releaseStatus !== GameModeStatus.Deprecated;
}

function gameFromCatalogEntry(entry: GameCatalogEntry): Game | null {
  if (!isPublishedCatalogEntry(entry)) return null;
  const slug = entry.gameId ? String(entry.gameId) : entry.displayName || entry.path;
  if (!slug || !entry.displayName) return null;
  return enrich({
    slug,
    guid: entry.guid,
    file: entry.path,
    name: entry.displayName,
    quality: entry.quality || 'placeholder',
    completeness: entry.completeness || {},
    description: entry.description || '',
    origin: '',
    players: entry.playersDisplay || '',
    deck: entry.deck || '',
    difficulty: entry.difficulty || '',
    duration: entry.duration || '',
    alsoKnownAs: [],
    category: entry.category || undefined,
    subcategory: entry.subcategory ?? null,
    player_mode: entry.playerMode ?? null,
    file_exists: true,
    link_valid: entry.releaseStatus || GameModeStatus.WorkInProgress,
    source: 'asset',
    releaseStatus: entry.releaseStatus ?? GameModeStatus.WorkInProgress,
  });
}

async function loadLeaderboardCatalogGames(): Promise<Game[]> {
  const assetEntries = await getGameCatalogEntries();
  const games: Game[] = [];

  for (const entry of assetEntries) {
    const game = gameFromCatalogEntry(entry);
    if (!game) continue;
    games.push(game);
  }

  return games;
}

function releaseStatusRank(game: Game): number {
  switch (game.releaseStatus) {
    case GameModeStatus.Available:
      return 0;
    case GameModeStatus.ComingSoon:
      return 1;
    case GameModeStatus.WorkInProgress:
      return 2;
    case GameModeStatus.Maintenance:
      return 3;
    case GameModeStatus.InternalOnly:
      return 4;
    case GameModeStatus.Deprecated:
      return 5;
    default:
      return 2;
  }
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
    .sort((a, b) => {
      return releaseStatusRank(a) - releaseStatusRank(b) || a.normalizedName.localeCompare(b.normalizedName);
    });
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
    fallbackRows: [],
    aiBenchmarkRows: [],
    distributionLabels: [],
    season: DEFAULT_LEADERBOARD_PAGE_CONTENT.season,
    uiCopy: {
      ...(content?.uiCopy ?? DEFAULT_LEADERBOARD_PAGE_CONTENT.uiCopy),
      topGamesTitle: DEFAULT_LEADERBOARD_PAGE_CONTENT.uiCopy.topGamesTitle,
      distributionCenterLabel: DEFAULT_LEADERBOARD_PAGE_CONTENT.uiCopy.distributionCenterLabel,
    },
    modes: {
      leaderboard: {
        ...(content?.modes?.leaderboard ?? DEFAULT_LEADERBOARD_PAGE_CONTENT.modes.leaderboard),
        rowSource: 'api',
      },
      gameLeaderboard: {
        ...(content?.modes?.gameLeaderboard ?? DEFAULT_LEADERBOARD_PAGE_CONTENT.modes.gameLeaderboard),
        rowSource: 'api',
      },
      aiBenchmarkLeaderboard: {
        ...(content?.modes?.aiBenchmarkLeaderboard ?? DEFAULT_LEADERBOARD_PAGE_CONTENT.modes.aiBenchmarkLeaderboard),
        rowSource: 'api',
      },
    },
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

async function loadCompetitionPageLayoutData(
  pageMode: CompetitionProgramPageMode,
): Promise<{
  controls?: Partial<CompetitionPageSvgControls>;
  content?: Partial<ShopPageContentData>;
}> {
  const resources = await getEntryIndexResourceEntries();
  const assetPath = COMPETITION_PAGE_LAYOUT_ASSET_PATH_BY_MODE[pageMode];
  const resource = findResourceByPath(resources, assetPath, 'PageLayout');
  if (!resource?.guid) throw new Error('Competition layout asset not found');
  const layoutDocument = await loadRawAssetDocumentByGuid(resource.guid, {
    cache: 'no-store',
    checksum: resource.checksum,
  });
  const data = dataOf(layoutDocument);
  const controls = asRecord(data.shopControls);
  const content = asRecord(data.shopContent);
  const selectedControls = Object.keys(controls).length > 0 ? controls : await loadShopPageControls(resources);
  return {
    controls: Object.keys(selectedControls).length > 0 ? selectedControls as Partial<CompetitionPageSvgControls> : undefined,
    content: Object.keys(content).length > 0 ? content as Partial<ShopPageContentData> : undefined,
  };
}

async function loadShopPageControls(resources: ResourceEntryRef[]): Promise<LooseRecord> {
  const resource = findResourceByPath(resources, SHOP_PAGE_LAYOUT_ASSET_PATH, 'PageLayout');
  if (!resource?.guid) return {};
  const layoutDocument = await loadRawAssetDocumentByGuid(resource.guid, {
    cache: 'no-store',
    checksum: resource.checksum,
  });
  const data = dataOf(layoutDocument);
  return asRecord(data.shopControls);
}

function getCompetitionHeader(
  pageMode: NonNullable<CompetitionPageProps['pageMode']>,
  gameId?: string,
  _tournamentId?: string,
  _eventId?: string,
  _matchId?: string
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
    return { gameName: 'Events', tagline: '' };
  }
  if (pageMode === 'eventDetail') {
    return { gameName: 'Event Detail', tagline: '' };
  }
  if (pageMode === 'tournaments') {
    return { gameName: 'Tournaments', tagline: '' };
  }
  if (pageMode === 'tournamentDetail') {
    return { gameName: 'Tournament Detail', tagline: '' };
  }
  if (pageMode === 'matches') {
    return { gameName: 'Matches', tagline: '' };
  }
  if (pageMode === 'matchDetail') {
    return { gameName: 'Match Detail', tagline: '' };
  }
  return { gameName: 'Competition', tagline: '' };
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
  const selectedProgramId = eventId ?? routeTournamentId ?? undefined;
  const programType = pageMode === 'events' || pageMode === 'eventDetail'
    ? 'event'
    : pageMode === 'tournaments' || pageMode === 'tournamentDetail'
      ? 'tournament'
      : undefined;
  const [leaderboardControls, setLeaderboardControls] = useState<Partial<LeaderboardPageSvgControls> | undefined>(undefined);
  const [leaderboardContent, setLeaderboardContent] = useState<PartialLeaderboardPageContentData | undefined>(undefined);
  const [competitionControls, setCompetitionControls] = useState<Partial<CompetitionPageSvgControls> | undefined>(undefined);
  const [competitionContent, setCompetitionContent] = useState<Partial<ShopPageContentData> | undefined>(undefined);
  const [requestedLeaderboardGameType, setRequestedLeaderboardGameType] = useState<number | null>(null);
  const {
    loading,
    registering,
    leaderboardError,
    programsError,
    gameType,
    seasonId,
    lastUpdated,
    leaderboardEntries,
    aiLeaderboardEntries,
    userEntry,
    nearbyAbove,
    nearbyBelow,
    tournamentId,
    tournamentBracket,
    programs,
    featuredProgramId,
    selectedProgram,
    programsLoading,
    registeringProgramId,
    checkingInProgramId,
    registrationResult,
    checkInResult,
    refreshLeaderboard,
    loadTournamentBracket,
    registerForTournament,
    refreshPrograms,
    loadProgram,
    registerProgram,
    checkInProgram,
  } = useCompetitionData(accountUserId, {
    loadDefaultTournament: false,
    loadPrograms: !isLeaderboardMode,
    selectedProgramId,
    programFilter: {
      type: programType,
      gameId,
    },
  });

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });
  const headerDynamicData = getCompetitionHeader(pageMode, gameId, routeTournamentId ?? tournamentId, eventId, matchId);
  const contentError = isLeaderboardMode ? leaderboardError : programsError;

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
      loadLeaderboardCatalogGames(),
    ])
      .then(([layoutResult, catalogResult]) => {
        if (!cancelled) {
          const layoutData: {
            controls?: Partial<LeaderboardPageSvgControls>;
            content?: PartialLeaderboardPageContentData;
          } = layoutResult.status === 'fulfilled' ? layoutResult.value : {};
          const catalogGames = catalogResult.status === 'fulfilled' ? catalogResult.value : [];
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
    let cancelled = false;
    if (isLeaderboardMode) {
      setCompetitionControls(undefined);
      setCompetitionContent(undefined);
      return () => { cancelled = true; };
    }
    void loadCompetitionPageLayoutData(pageMode as CompetitionProgramPageMode)
      .then((layoutData) => {
        if (!cancelled) {
          setCompetitionControls(layoutData.controls);
          setCompetitionContent(layoutData.content);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompetitionControls(undefined);
          setCompetitionContent(undefined);
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

  const publishRoute = (path: string | undefined) => {
    if (!path) return;
    EventBus.instance.publish(new ShowScreenEvent(path));
  };

  const programDetailPath = (program: CompetitionProgram): string => (
    program.routes.detailPath
    ?? (program.programType === 'tournament'
      ? buildPublicTournamentDetailPath(program.programId)
      : buildPublicEventDetailPath(program.programId))
  );

  const programLobbyPath = (program: CompetitionProgram): string => (
    program.routes.lobbyPath
    ?? (program.gameIds[0] ? buildPublicGameLobbyPath(program.gameIds[0]) : PublicRoutePath[PublicRouteKey.Lobby])
  );

  const programLeaderboardPath = (program: CompetitionProgram): string => (
    program.routes.leaderboardPath
    ?? (program.gameIds[0] ? buildPublicGameLeaderboardPath(program.gameIds[0]) : PublicRoutePath[PublicRouteKey.Leaderboard])
  );

  return (
    <UnifiedPageShell
      className="cp-page"
      workClassName="sp-shell-work"
      workScrollMode="auto"
      background={<DynamicBackground />}
      header={
        <UnifiedHeader
          dynamicData={headerDynamicData}
          showPrimaryNavigation={false}
          config={{
            right: headerRightConfig,
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent('home'))
            },
            center: isLeaderboardMode ? undefined : {
              mode: 'B',
              contentGap: 44,
              modeB: {
                tagline: '',
                iconSize: 28,
                pairGap: 0,
                icons: [],
                leftIcons: [renderCompetitionHeaderCup],
                rightIcons: [renderCompetitionHeaderCup],
              },
            },
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <CompetitionPageContent
        loading={isLeaderboardMode ? loading : programsLoading}
        registering={registering}
        error={contentError}
        gameType={gameType}
        seasonId={seasonId}
        lastUpdated={lastUpdated}
        leaderboardEntries={leaderboardEntries}
        aiBenchmarkEntries={aiLeaderboardEntries}
        showPersonalizedStats={hasAccount}
        userEntry={userEntry}
        nearbyAbove={nearbyAbove}
        nearbyBelow={nearbyBelow}
        tournamentId={tournamentId}
        tournamentRounds={Array.isArray(tournamentBracket?.rounds) ? tournamentBracket.rounds : []}
        programs={programs}
        featuredProgramId={featuredProgramId}
        selectedProgram={selectedProgram}
        registeringProgramId={registeringProgramId}
        checkingInProgramId={checkingInProgramId}
        registrationResult={registrationResult}
        checkInResult={checkInResult}
        pageMode={pageMode}
        gameId={gameId}
        eventId={eventId}
        matchId={matchId}
        competitionControls={competitionControls}
        competitionContent={competitionContent}
        leaderboardControls={leaderboardControls}
        leaderboardContent={leaderboardContent}
        onRefreshLeaderboard={(nextGameType) => { void refreshLeaderboard(nextGameType); }}
        onLoadBracket={(nextTournamentId) => { void loadTournamentBracket(nextTournamentId); }}
        onRegister={(nextTournamentId) => {
          void runWithAccount(async () => {
            await registerForTournament(nextTournamentId);
          });
        }}
        onRefreshPrograms={(filter) => { void refreshPrograms(filter); }}
        onSelectProgram={(programId) => { void loadProgram(programId); }}
        onRegisterProgram={(programId) => {
          void runWithAccount(async () => {
            await registerProgram(programId);
          });
        }}
        onCheckInProgram={(programId) => {
          void runWithAccount(async () => {
            await checkInProgram(programId);
          });
        }}
        onOpenProgram={(program) => publishRoute(programDetailPath(program))}
        onOpenShop={(program) => publishRoute(program.routes.shopPath ?? PublicRoutePath[PublicRouteKey.Shop])}
        onOpenLobby={(program) => publishRoute(programLobbyPath(program))}
        onOpenLeaderboard={(program) => publishRoute(programLeaderboardPath(program))}
        onMatchmaking={() => EventBus.instance.publish(new ShowScreenEvent('matchmaking'))}
      />
    </UnifiedPageShell>
  );
}

